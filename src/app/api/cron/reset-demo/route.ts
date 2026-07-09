import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { seedDemoWorkspace } from "@/server/demo/seed-demo";

/** Nightly reset of the shared demo workspace (wired via vercel.json crons). */
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await seedDemoWorkspace(db);
  return NextResponse.json({ ok: true, counts: result.counts });
}
