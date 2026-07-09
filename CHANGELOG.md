# Changelog

All notable changes to Foresail are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org).

## [1.0.0] — 2026-07-09

### Added

- Kanban deal board with optimistic, keyboard-accessible drag-and-drop, per-card stage menu,
  and soft delete with undo.
- Weighted revenue forecasting: per-stage win likelihoods, dashboard KPIs, pipeline-by-stage
  chart, and a six-month weighted forecast with past-due and unscheduled deals surfaced.
- Deals table with server-side search (trigram-indexed), URL-mirrored filters, indexed sorts,
  keyset pagination, bulk stage-move/delete with confirm, and streamed CSV export.
- Contacts and companies CRUD with relation-safe deletes.
- Deal detail with notes timeline and per-deal audit trail.
- Email/password auth: bcrypt (cost 12), email verification gating writes, single-use hashed
  password-reset tokens, Postgres-backed rate limiting, and strict security headers.
- Workspaces with owner/admin/member/viewer roles enforced server-side, shareable expiring
  invite links, member management, and a leave-workspace flow.
- Pipeline stage editor (names, colors, probabilities, reordering) with structural Won/Lost.
- Append-only activity log, filterable and paginated.
- ⌘K command palette, `/` search focus, system-aware dark mode, designed
  loading/empty/error/success states, WCAG AA (0 axe violations on core pages).
- Marketing landing page with full SEO pack: per-route metadata, generated OG/Twitter images,
  sitemap, robots, and SoftwareApplication + FAQPage JSON-LD.
- Seeded demo workspace with nightly reset cron; sample-data loader for fresh workspaces.
- 40 unit tests, 3 Playwright e2e flows, GitHub Actions CI (lint, typecheck, tests, build, e2e).
