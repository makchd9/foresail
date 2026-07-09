# Foresail — Product Spec & Build Plan

> A CRM deal pipeline for small B2B sales teams: a drag-and-drop kanban board with
> **weighted revenue forecasting**, so a founder or sales lead can answer "how much are
> we actually going to close this quarter?" at a glance.

## 1. Problem

Small sales teams track deals in spreadsheets. Spreadsheets don't enforce stages, don't
log who changed what, and — most importantly — report *raw* pipeline value, which wildly
overstates reality (a $50k deal at first-call is not $50k of revenue). Teams either
overbuy Salesforce or fly blind.

**Foresail's one job:** make the pipeline honest. Every stage carries a win probability;
every deal contributes `value × probability` to the forecast. The board is the input,
the forecast is the output.

## 2. Users & roles

Single workspace per team. Roles enforced **server-side on every action**:

| Role   | Can do |
|--------|--------|
| Owner  | Everything, incl. delete workspace & manage billing-level settings |
| Admin  | Manage members, edit stages/probabilities, all CRUD |
| Member | CRUD on deals/contacts/companies/notes they can see (full workspace visibility) |
| Viewer | Read-only everywhere; no mutations accepted server-side |

## 3. Core objects

- **Workspace** — the tenant. Has members (via Membership), stages, currency.
- **Stage** — ordered pipeline step with `probability` (0–100), `isWon` / `isLost` flags.
  Defaults: Lead 10% → Qualified 25% → Proposal 50% → Negotiation 75% → Won 100% → Lost 0%.
- **Deal** — title, value (integer cents), company, contact, owner (member), stage,
  expected close date, kanban position, soft-delete (`deletedAt`), `closedAt` set when
  moved to a won/lost stage.
- **Company** — name, domain, industry, size, location.
- **Contact** — name, email, title, phone, belongs to company (optional).
- **Note** — timeline entry on a deal, authored by a member.
- **ActivityLog** — immutable audit trail: actor, action, entity, metadata JSON, per workspace.
- **User / VerificationToken / PasswordResetToken / RateLimit / WorkspaceInvite** — auth plumbing.

## 4. Forecast math (the heart of the product)

- `weighted(deal) = round(value × stage.probability / 100)` for **open** deals
  (stage is neither won nor lost).
- **Dashboard KPIs:** open pipeline (Σ value), weighted forecast (Σ weighted),
  win rate = won / (won + lost) among closed deals, average open deal size.
- **Forecast chart:** weighted value grouped by `expectedCloseDate` month, next 6 months.
- **Stage chart:** count + value per stage, in stage order.
- All math on integer cents; formatted with `Intl.NumberFormat` at the edge of the UI.

## 5. Screens (each ships with loading / empty / error / success states)

| Route | Purpose | Notes |
|-------|---------|-------|
| `/` | Marketing landing | Hero, feature grid, screenshot, FAQ (JSON-LD), footer → GitHub |
| `/login`, `/signup` | Auth | Rate-limited, Zod-validated both sides |
| `/verify-email`, `/forgot-password`, `/reset-password` | Auth flows | Single-use hashed tokens, 30 min TTL |
| `/app` | Dashboard | KPIs, 2 charts, recent activity |
| `/app/deals` | **Kanban board** (default) + table view toggle | dnd-kit drag between stages, optimistic update + rollback toast |
| `/app/deals?view=table` | Table | Server-side search (debounced), stage/owner filters, sort, cursor pagination, CSV export — all mirrored in URL |
| `/app/deals/[id]` | Deal detail | Inline edit, notes timeline, activity, danger zone |
| `/app/contacts`, `/app/companies` | CRUD lists | Search + pagination, create/edit dialogs |
| `/app/activity` | Audit log | Filter by entity type |
| `/app/settings` | Profile / Workspace / Members / Stages | Invite via link, role changes, stage probability editor, danger zone |
| `404`, error boundary | Never a white screen | Styled, with a way back |

## 6. UX contract

- 4/8px spacing grid, one accent color, Inter + JetBrains Mono for numbers.
- Dark mode: system-aware via `next-themes`, designed surfaces (not inverted).
- `⌘K` command palette (navigate + create), `/` focuses search, `?` shows shortcuts.
- Skeletons that match final layout; optimistic UI for reversible actions; toasts with undo where possible.
- WCAG AA contrast, visible `:focus-visible` rings, 44px touch targets, works at 320px.

## 7. Security checklist (enforced, not aspirational)

- bcrypt cost 12 password hashing; sessions in httpOnly/Secure/SameSite=Lax JWT cookies (Auth.js).
- Email verification required before workspace writes (auto-issued link in demo mode; Resend if configured).
- Password reset: single-use token, SHA-256 hashed at rest, 30 min TTL.
- Rate limits (Postgres token bucket): 5/15min on login, signup, reset — per IP+identifier, 429 + Retry-After.
- Every server action: session → membership → role gate → row-level ownership check.
- Zod validation on both sides from one shared schema. Prisma parameterizes everything.
- Security headers: CSP, HSTS, X-Content-Type-Options, Referrer-Policy. No secrets client-side.

## 8. Tech stack

Next.js (App Router) · TypeScript strict · Tailwind + shadcn/ui · Prisma + PostgreSQL (Neon)
· Auth.js v5 credentials · Zod · dnd-kit · Recharts · Vitest + Playwright · GitHub Actions · Vercel.

## 9. Non-goals (v1)

Multi-pipeline workspaces, email sync/integrations, custom fields, file attachments,
per-deal permissions, billing. Depth over breadth — the board and the forecast must be excellent.

## 10. Milestones

1. Scaffold + schema + seed (demo workspace with realistic history)
2. Auth + workspaces + RBAC
3. Deals CRUD + kanban + detail/notes
4. Contacts/companies + table views (search/filter/sort/pagination/CSV)
5. Dashboard analytics
6. Activity log + settings
7. Landing + SEO pack
8. Polish (dark mode, ⌘K, states, a11y) + tests + CI + docs
9. Deploy, verify production, tag v1.0.0

**Demo login:** `demo@foresail.app / demo1234` (admin) and `viewer@foresail.app / demo1234`
(read-only) — seeded, pre-verified, reset nightly.
