import "server-only";

/**
 * Keyset (cursor) pagination codec. Cursors encode [sortValue, id] so pages
 * stay stable under concurrent writes — no offset drift, no O(n) skips.
 */

type Tagged = { k: "d"; v: string } | { k: "s"; v: string } | { k: "n"; v: number };

export type CursorValue = Date | string | number;

export function encodeCursor(value: CursorValue, id: string): string {
  const tagged: Tagged =
    value instanceof Date ? { k: "d", v: value.toISOString() } : typeof value === "number" ? { k: "n", v: value } : { k: "s", v: value };
  return Buffer.from(JSON.stringify([tagged, id]), "utf8").toString("base64url");
}

export function decodeCursor(raw: string | null): { value: CursorValue; id: string } | null {
  if (!raw) return null;
  try {
    const [tagged, id] = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as [Tagged, string];
    if (typeof id !== "string" || !tagged || typeof tagged !== "object") return null;
    if (tagged.k === "d") {
      const date = new Date(tagged.v);
      return Number.isNaN(date.getTime()) ? null : { value: date, id };
    }
    if (tagged.k === "n") return typeof tagged.v === "number" ? { value: tagged.v, id } : null;
    if (tagged.k === "s") return typeof tagged.v === "string" ? { value: tagged.v, id } : null;
    return null;
  } catch {
    return null;
  }
}

/**
 * Prisma keyset WHERE for (field, id) ordered pagination.
 * `forward` means "rows after the cursor in the current sort direction".
 */
export function keysetWhere(
  field: string,
  dir: "asc" | "desc",
  cursor: { value: CursorValue; id: string },
  forward: boolean,
): Record<string, unknown> {
  const gt = forward ? dir === "asc" : dir === "desc";
  const cmp = gt ? "gt" : "lt";
  return {
    OR: [
      { [field]: { [cmp]: cursor.value } },
      { AND: [{ [field]: cursor.value }, { id: { [cmp]: cursor.id } }] },
    ],
  };
}

export type Page<T> = {
  rows: T[];
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
  startCursor: string | null;
  endCursor: string | null;
};

export const PAGE_SIZE = 25;

/**
 * Runs keyset pagination around a Prisma-style findMany. The caller supplies
 * a fetcher so this stays type-safe per entity without generics gymnastics.
 */
export async function paginate<T extends { id: string }>(opts: {
  after: string | null;
  before: string | null;
  sortField: string;
  dir: "asc" | "desc";
  cursorValue: (row: T) => CursorValue;
  fetch: (args: {
    where: Record<string, unknown> | undefined;
    orderBy: Array<Record<string, "asc" | "desc">>;
    take: number;
  }) => Promise<T[]>;
  count: () => Promise<number>;
}): Promise<Page<T>> {
  const { after, before, sortField, dir } = opts;
  const afterCursor = decodeCursor(after);
  const beforeCursor = decodeCursor(before);
  const backward = Boolean(beforeCursor && !afterCursor);

  const effectiveDir: "asc" | "desc" = backward ? (dir === "asc" ? "desc" : "asc") : dir;
  const orderBy = [{ [sortField]: effectiveDir }, { id: effectiveDir }];

  let where: Record<string, unknown> | undefined;
  if (afterCursor) where = keysetWhere(sortField, dir, afterCursor, true);
  else if (beforeCursor) where = keysetWhere(sortField, dir, beforeCursor, false);

  const [rowsRaw, total] = await Promise.all([
    opts.fetch({ where, orderBy, take: PAGE_SIZE + 1 }),
    opts.count(),
  ]);

  const hasMore = rowsRaw.length > PAGE_SIZE;
  const trimmed = hasMore ? rowsRaw.slice(0, PAGE_SIZE) : rowsRaw;
  const rows = backward ? [...trimmed].reverse() : trimmed;

  const hasNext = backward ? true : hasMore;
  const hasPrev = backward ? hasMore : Boolean(afterCursor);

  const firstRow = rows[0];
  const lastRow = rows[rows.length - 1];

  return {
    rows,
    total,
    hasNext,
    hasPrev,
    startCursor: firstRow ? encodeCursor(opts.cursorValue(firstRow), firstRow.id) : null,
    endCursor: lastRow ? encodeCursor(opts.cursorValue(lastRow), lastRow.id) : null,
  };
}
