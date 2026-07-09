import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { formatMoney } from "@/lib/format";
import { getActiveMembership } from "@/server/workspace";
import { checkRateLimit } from "@/server/rate-limit";
import { dealsWhere } from "@/server/queries/deals-table";
import { contactsWhere } from "@/server/queries/contacts";
import { companiesWhere } from "@/server/queries/companies";

const BATCH = 500;

function csvEscape(value: string | null | undefined): string {
  const text = value ?? "";
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function csvRow(cells: Array<string | null | undefined>): string {
  return cells.map(csvEscape).join(",") + "\r\n";
}

function isoDate(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

/**
 * Streamed CSV export of the current table view (filters included), batched
 * by id-cursor so large workspaces never buffer fully in memory.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> },
) {
  const { entity } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const membership = await getActiveMembership(user.id);
  if (!membership) return NextResponse.json({ error: "No active workspace" }, { status: 403 });

  const limit = await checkRateLimit(`export:${user.id}`, { limit: 10 });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many exports. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const workspaceId = membership.workspace.id;
  const currency = membership.workspace.currency;
  const search = request.nextUrl.searchParams;
  const q = (search.get("q") ?? "").slice(0, 200);
  const stage = search.get("stage");
  const owner = search.get("owner");

  const encoder = new TextEncoder();
  let stream: ReadableStream<Uint8Array>;

  if (entity === "deals") {
    const where = dealsWhere(workspaceId, { q, stage, owner });
    stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode("﻿"));
        controller.enqueue(
          encoder.encode(
            csvRow(["Title", "Stage", "Status", "Value", "Weighted value", "Company", "Contact", "Owner", "Expected close", "Lost reason", "Created", "Updated"]),
          ),
        );
        let cursor: string | undefined;
        for (;;) {
          const rows = await db.deal.findMany({
            where,
            orderBy: { id: "asc" },
            take: BATCH,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            select: {
              id: true,
              title: true,
              valueCents: true,
              expectedCloseDate: true,
              lostReason: true,
              createdAt: true,
              updatedAt: true,
              stage: { select: { name: true, probability: true, isWon: true, isLost: true } },
              company: { select: { name: true } },
              contact: { select: { name: true } },
              owner: { select: { name: true } },
            },
          });
          for (const row of rows) {
            const status = row.stage.isWon ? "Won" : row.stage.isLost ? "Lost" : "Open";
            const weighted = row.stage.isWon || row.stage.isLost ? row.valueCents * (row.stage.isWon ? 1 : 0) : Math.round((row.valueCents * row.stage.probability) / 100);
            controller.enqueue(
              encoder.encode(
                csvRow([
                  row.title,
                  row.stage.name,
                  status,
                  formatMoney(row.valueCents, currency),
                  formatMoney(weighted, currency),
                  row.company?.name,
                  row.contact?.name,
                  row.owner?.name,
                  isoDate(row.expectedCloseDate),
                  row.lostReason,
                  isoDate(row.createdAt),
                  isoDate(row.updatedAt),
                ]),
              ),
            );
          }
          if (rows.length < BATCH) break;
          cursor = rows[rows.length - 1]?.id;
        }
        controller.close();
      },
    });
  } else if (entity === "contacts") {
    const where = contactsWhere(workspaceId, q);
    stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode("﻿"));
        controller.enqueue(encoder.encode(csvRow(["Name", "Title", "Email", "Phone", "Company", "Created"])));
        let cursor: string | undefined;
        for (;;) {
          const rows = await db.contact.findMany({
            where,
            orderBy: { id: "asc" },
            take: BATCH,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            select: {
              id: true,
              name: true,
              title: true,
              email: true,
              phone: true,
              createdAt: true,
              company: { select: { name: true } },
            },
          });
          for (const row of rows) {
            controller.enqueue(
              encoder.encode(
                csvRow([row.name, row.title, row.email, row.phone, row.company?.name, isoDate(row.createdAt)]),
              ),
            );
          }
          if (rows.length < BATCH) break;
          cursor = rows[rows.length - 1]?.id;
        }
        controller.close();
      },
    });
  } else if (entity === "companies") {
    const where = companiesWhere(workspaceId, q);
    stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode("﻿"));
        controller.enqueue(encoder.encode(csvRow(["Name", "Domain", "Industry", "Size", "Location", "Created"])));
        let cursor: string | undefined;
        for (;;) {
          const rows = await db.company.findMany({
            where,
            orderBy: { id: "asc" },
            take: BATCH,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            select: {
              id: true,
              name: true,
              domain: true,
              industry: true,
              size: true,
              location: true,
              createdAt: true,
            },
          });
          for (const row of rows) {
            controller.enqueue(
              encoder.encode(
                csvRow([row.name, row.domain, row.industry, row.size, row.location, isoDate(row.createdAt)]),
              ),
            );
          }
          if (rows.length < BATCH) break;
          cursor = rows[rows.length - 1]?.id;
        }
        controller.close();
      },
    });
  } else {
    return NextResponse.json({ error: "Unknown export" }, { status: 404 });
  }

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="foresail-${entity}-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
