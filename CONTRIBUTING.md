# Contributing to Foresail

Thanks for taking a look! Issues and PRs are welcome — for anything beyond a small fix, please
open an issue first so we can agree on the direction.

## Local setup

Follow the [Quick start](README.md#quick-start): clone, `cp .env.example .env`, point
`DATABASE_URL` at any Postgres, then

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

## Before you push

All four must pass — CI runs the same set:

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e   # needs the dev server or a production build running
```

## Conventions

- **Branches**: `feat/<slug>`, `fix/<slug>`, `docs/<slug>`.
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org) — `feat:`, `fix:`,
  `docs:`, `refactor:`, `test:`, `chore:`. Small commits that each do one thing.
- **Code**: TypeScript strict (no `any`), server actions validate with the shared Zod schemas,
  every mutation goes through `getActionContext` and logs to the activity trail. Money is
  integer cents. UI states (loading/empty/error/success) are not optional.
- **Schema changes**: edit `prisma/schema.prisma`, run `npm run db:migrate -- --name <change>`,
  and commit the generated migration folder.

## Pull requests

Describe *what changed and why* — reviewers shouldn't have to reconstruct intent from the diff.
Screenshots for anything visual. Link the issue.
