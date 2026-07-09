# Architecture

Foresail is a single Next.js App Router application backed by PostgreSQL. Server components
fetch, server actions mutate, and one shared Zod schema per form validates on both sides of the
wire.

## Data model

```
User ─┬─< Membership >─┬─ Workspace ─┬─< Stage ──────< Deal >── Note
      │   (role)       │             ├─< Company ────<  │
      │                │             ├─< Contact ────<  │
      │                │             ├─< ActivityLog    │
      │                │             └─< WorkspaceInvite│
      └─< VerificationToken / PasswordResetToken        │
                                        Deal.ownerId ───┘ (User, SetNull)
RateLimit (key, count, resetsAt) — standalone
```

- **Workspace is the tenant.** Every business row carries `workspaceId`; every query filters by
  it. There is no cross-workspace read path.
- **Stage** holds `probability` (0–100) plus `isWon` / `isLost` flags. Won/Lost are structural:
  they can't be deleted and their probabilities are pinned to 100/0.
- **Deal.valueCents** — money is integer cents everywhere. Formatting happens at the very edge
  (`Intl.NumberFormat`). No floats, no drift.
- **Deal.position** — float for kanban ordering. Moves write the midpoint of the neighbors; if
  float precision runs out the column renormalizes to 1024-step spacing in one transaction.
- **Soft deletes** — deals get `deletedAt` (recoverable, one-click undo). Contacts/companies
  hard-delete but their relations use `ON DELETE SET NULL`, so deals survive.
- **ActivityLog is append-only** and denormalizes `entityLabel`, so history reads correctly even
  after the entity is gone.

## The forecast

`src/lib/forecast.ts` is a pure module (unit-tested, no I/O):

```
weighted(deal)  = round(valueCents × stage.probability / 100)
forecast[month] = Σ weighted(open deals with expectedCloseDate in month)
```

Buckets: optional **Past due** + the next six months. Deals with no close date and deals beyond
the horizon are *counted and surfaced*, never silently dropped — an honest forecast can't have
silent holes.

## Auth & authorization

- **Sessions**: Auth.js v5 credentials provider, stateless JWT in an httpOnly/Secure/
  SameSite=Lax cookie, re-issued on sign-in. Trade-off: a stateless JWT can't be revoked
  server-side mid-flight; for this product's threat model (7-day expiry, password change doesn't
  need to nuke other devices) that's acceptable and documented here on purpose.
- **Passwords**: bcrypt cost 12, with a dummy-hash compare for unknown emails so login timing
  doesn't leak account existence.
- **Authorization is layered**: the proxy only redirects signed-out users for UX. The real
  enforcement is `getActionContext(minimumRole)` at the top of **every server action**: session
  → active workspace membership → role gate → (for mutations) verified email → then row-level
  `workspaceId` checks on every referenced record (stage, company, contact, owner).
- **Rate limiting**: a fixed-window counter in Postgres (single atomic upsert), because
  in-memory limiters evaporate on serverless. Applied to login, signup, verification, reset,
  password change, and CSV export.
- **Demo-mail mode**: with no `RESEND_API_KEY`, verification links render on-screen (harmless:
  it only unlocks the account you just created), but **password-reset links are never issued** —
  showing those on-screen would let anyone hijack any account by typing an email address. The
  full reset flow ships and works when a mailer is configured; the demo deployment simply
  refuses to weaken it. Shared demo logins are additionally excluded from password/profile
  changes, and the demo workspace's structure (members, stages, settings) is locked.

## Search & pagination

- Search is server-side `ILIKE` backed by `pg_trgm` GIN indexes (see the second migration) —
  fast at realistic scale, zero infra.
- List views use **keyset (cursor) pagination** on `(sortField, id)` — stable under concurrent
  writes and O(1) per page, unlike offset pagination. Cursors are opaque base64url tokens;
  garbage decodes to `null`, not an exception.
- Every filter/sort/search/cursor lives in the URL, so any view is shareable and the back
  button just works.

## The board

Client state is a `stageId → deals[]` map. Drag uses dnd-kit (pointer + keyboard sensors).
Moves apply optimistically, then call `moveDealAction` with the neighbor ids; the server
recomputes the position from the *current* database state, so two users dragging at once
converge. On failure the snapshot is restored and a toast explains. Entering a won/lost stage
sets `closedAt`; leaving one clears it.

## Notable trade-offs (the honest section)

- **JWT sessions over DB sessions** — chosen for serverless fit; documented revocation limits.
- **Fractional positions over integer resequencing** — one-row writes per move, with a
  renormalization escape hatch instead of pretending floats never exhaust.
- **`ILIKE` + trigram over full-text search** — matches how people search short titles/names;
  tsvector would add complexity without better results at this scale.
- **Single currency per workspace** — deliberate v1 scope; per-deal currencies would infect
  every aggregate with FX questions.
- **CSP allows inline scripts** — Next.js streams inline bootstrap scripts; a nonce-based CSP
  is the follow-up, tracked in the roadmap.

## Operations

- `npm run build` = `prisma generate && next build`; migrations deploy with
  `prisma migrate deploy` (never `db push`) so schema history is reproducible.
- `/api/cron/reset-demo` (bearer-protected, scheduled in `vercel.json`) rebuilds the shared
  demo workspace nightly with date-relative data, so charts never go stale.
