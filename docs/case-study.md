# Case study: Foresail

**A CRM with honest revenue forecasting — built end-to-end for the Digital Heroes full-stack trial.**

- **Live:** __LIVE_URL__ (demo login `demo@foresail.app` / `demo1234`)
- **Code:** __GH_REPO__
- **Stack:** Next.js 16 · TypeScript strict · PostgreSQL + Prisma · Auth.js · Tailwind + shadcn/ui · Vitest + Playwright · Vercel

## The problem

Small B2B sales teams run their pipeline in spreadsheets, and spreadsheets report a fantasy: the
"pipeline value" cell is the sum of every open deal at face value. A $50,000 deal that just had a
first call is not $50,000 of revenue — but that's what the number claims, and that's how quarters
get missed. Heavyweight CRMs solve this with complexity a five-person team will never adopt.

Foresail's one job is to make the pipeline honest. Every stage carries a win likelihood (Lead
10%, Proposal 50%, Negotiation 75% — tunable per workspace), every open deal contributes
`value × probability`, and the dashboard groups that by expected close month. The board is the
input; a defensible forecast is the output.

## The approach

**Spec first.** The first commit is `docs/plan.md`: data model, every screen with its four states
(loading/empty/error/success), the forecast formula, security checklist, and explicit non-goals.
Scope discipline came from one rule in the brief: depth over breadth.

**Schema before features.** Multi-tenant from the start: every business row hangs off a
`Workspace`, roles live on the membership, and money is integer cents everywhere. Kanban ordering
uses fractional positions (midpoint inserts) with a renormalization guard for float exhaustion —
one-row writes per drag instead of resequencing a column.

**Authorization as a habit, not a middleware.** The route guard only handles redirects. The real
enforcement is one helper at the top of every server action: session → workspace membership →
role gate → verified-email check → row-level `workspaceId` validation of every referenced record.
Viewer roles aren't hidden buttons — mutations are rejected server-side.

**The forecast is a pure module.** Bucketing, past-due handling, unscheduled deals, and the
horizon are all in `src/lib/forecast.ts` with no I/O — which made it trivial to unit-test that
nothing is ever silently dropped from the number the whole product exists to report.

**Honest trade-offs, documented.** Stateless JWT sessions (revocation limits acknowledged),
trigram `ILIKE` search over full-text (right for short titles at this scale), single currency per
workspace (v1 scope), and a demo-mail mode with a deliberate security decision: verification
links may render on-screen (harmless), but password-reset links are never issued without a real
mailer — on-screen reset links would let anyone hijack any account by typing an email address.

**One interesting bug.** React hydration kept failing on the board with `$244K` vs `$244.0K`:
Node's ICU and Chrome's ICU disagree about trailing zeros in `Intl.NumberFormat`'s compact
notation. The fix was a small hand-rolled compact formatter — and a regression test named after
the bug.

## The result

A deployed, open-source product a stranger can evaluate in under a minute:

- Kanban board with optimistic, keyboard-accessible drag-and-drop and rollback on failure
- Weighted forecast dashboard, per-stage pipeline chart, win rate, closing-soon list
- Deals/contacts/companies CRUD, notes, server-side search + URL-mirrored filters, cursor
  pagination, bulk actions with confirm, streamed CSV export
- Real auth (bcrypt 12, email verification gating writes, hashed single-use reset tokens,
  Postgres-backed rate limiting), four team roles, invite links, append-only audit trail
- Landing page with full SEO pack: generated OG images, sitemap, robots, JSON-LD

**Numbers:** Lighthouse 91 / 100 / 100 / 100 (performance / accessibility / best practices /
SEO) · 0 axe violations on every core page · 40 unit tests + 3 Playwright e2e flows · CI (lint,
typecheck, tests, build, e2e vs Postgres) on every push · 0 console errors · TypeScript strict
with zero `any`.

## What I learned

- **States are the product.** Designing empty/loading/error before the happy path changed what I
  built — the empty state grew a "load sample data" button that became the best part of
  onboarding.
- **Optimistic UI is a data-structure problem.** The drag logic was easy; deciding what the
  server recomputes (positions from *current* DB neighbors, so concurrent drags converge) was
  the actual work.
- **Security decisions compound.** The demo-mail trade-off, protected demo accounts, a locked
  demo workspace, and DB-backed rate limits all came from asking "what breaks when this is
  public?" before deploying, not after.
- **Platform ICU differences are real.** I will never again assume two JavaScript engines format
  a number the same way.
