# Galla Mandi — web

Shop panel for shop owners, managers and operators. Built with Next.js (App Router), Tailwind CSS and shadcn/ui. All data comes from the `server` API.

## Requirements

- Node.js 24 (see `.nvmrc`; 22.12+ also works)
- npm
- The [server](https://github.com/gala-mandi/server) API running locally (see its README)

## Setup

```bash
git clone git@github.com:gala-mandi/web.git
cd web
cp .env.example .env.local    # set NEXT_PUBLIC_API_URL if the API is not on :4000
npm install
npm run dev                   # http://localhost:3000
```

The home page shows "API connected" when it can reach the server's `GET /health`. If it shows "API unreachable", check that the server is running and that `http://localhost:3000` is in the server's `CORS_ORIGINS`.

## Environment variables

Listed in `.env.example` and checked with Zod in `src/lib/env.ts`. A missing or wrong value stops the app (and `next build`) with a message that names the variable. Never commit `.env.local`.

## Scripts

| Script                                    | What it does                                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`                             | Dev server on port 3000                                                                                            |
| `npm run build` / `npm run start`         | Production build and server                                                                                        |
| `npm run lint` / `npm run lint:fix`       | ESLint                                                                                                             |
| `npm run format` / `npm run format:check` | Prettier                                                                                                           |
| `npm run typecheck`                       | Generate Next.js route types, then TypeScript                                                                      |
| `npm test`                                | Unit and component tests (Vitest + React Testing Library)                                                          |
| `npm run test:e2e`                        | End-to-end tests (Playwright). Builds and starts the app itself. Run `npx playwright install chromium` once first. |

A Husky pre-commit hook runs ESLint and Prettier on staged files (lint-staged). CI (`.github/workflows/ci.yml`) runs lint, format check, type-check, unit tests and Playwright on every pull request.

## What is set up

- **UI:** Tailwind CSS v4 + shadcn/ui (Radix, RTL-ready). Violet theme tokens live in `src/app/globals.css` as CSS variables. Fonts: Inter (body), Plus Jakarta Sans (headings).
- **Server state:** TanStack Query. Provider in `src/app/providers.tsx`, client in `src/lib/query-client.ts`.
- **HTTP:** Axios instance in `src/lib/api.ts`. It sends cookies (`withCredentials`) and adds the access token from the session store. Token refresh comes with the auth ticket.
- **Client state:** Zustand. `src/stores/session.ts` keeps the access token in memory only.

## Project layout

```
src/
  app/                   routes, layout, providers
  features/<feature>/    api.ts, hooks.ts, schemas.ts, components/
  components/ui/         shadcn components
  lib/                   api.ts, query-client.ts, env.ts, utils.ts
  stores/                Zustand stores
e2e/                     Playwright tests
docs/design/             screen designs
```
