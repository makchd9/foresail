/** URL query-string contract for list views: search, sort, filters, cursors. */

export type ListParams = {
  q: string;
  sort: string;
  dir: "asc" | "desc";
  after: string | null;
  before: string | null;
  stage: string | null;
  owner: string | null;
  type: string | null;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseListParams(
  raw: RawParams,
  { defaultSort, allowedSorts }: { defaultSort: string; allowedSorts: readonly string[] },
): ListParams {
  const q = (first(raw.q) ?? "").slice(0, 200);
  const sortCandidate = first(raw.sort) ?? defaultSort;
  const sort = allowedSorts.includes(sortCandidate) ? sortCandidate : defaultSort;
  const dir = first(raw.dir) === "asc" ? "asc" : first(raw.dir) === "desc" ? "desc" : null;
  return {
    q,
    sort,
    dir: dir ?? (sort === "title" || sort === "name" ? "asc" : "desc"),
    after: first(raw.after) ?? null,
    before: first(raw.before) ?? null,
    stage: first(raw.stage) ?? null,
    owner: first(raw.owner) ?? null,
    type: first(raw.type) ?? null,
  };
}

/** Build a query string, dropping cursors when anything else changes. */
export function listQueryString(
  params: Partial<ListParams> & { view?: string },
  overrides: Partial<ListParams & { view: string }> = {},
): string {
  const merged = { ...params, ...overrides };
  const cursorOverridden = "after" in overrides || "before" in overrides;
  const search = new URLSearchParams();
  if (merged.view) search.set("view", merged.view);
  if (merged.q) search.set("q", merged.q);
  if (merged.sort) search.set("sort", merged.sort);
  if (merged.dir) search.set("dir", merged.dir);
  if (merged.stage) search.set("stage", merged.stage);
  if (merged.owner) search.set("owner", merged.owner);
  if (merged.type) search.set("type", merged.type);
  if (cursorOverridden) {
    if (merged.after) search.set("after", merged.after);
    if (merged.before) search.set("before", merged.before);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
