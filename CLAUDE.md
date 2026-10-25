# Galla Mandi — web

This repo is the **shop panel** (Next.js) used every day by shop owners, managers and operators.

Galla Mandi is a **multi-tenant SaaS** for grain-market (galla mandi) commission shops in Pakistan.
Every shop is one **tenant** with one `tenant_id`; the shop owner gets one account and adds staff.

| Repo | What it is |
|---|---|
| `server` | NestJS + PostgreSQL + Drizzle REST API (the only thing that talks to the database) |
| `web` | Next.js shop panel for owners and staff |
| `admin` | Next.js super-admin panel for the platform team |
| `app` | React Native + Expo mobile app for owners and staff |

Roles: `super_admin` (platform, no tenant), `owner`, `manager`, `operator` (per shop).

## How to work on a ticket

Every issue is one ticket from the org board **Gala Mandi**. Each ticket has: Design & references,
Summary, What we'll use and why, Tasks, Scenarios, Testing, Done when.

1. Read the whole issue first. Only do the part that belongs to **this repo**: tasks are often
   prefixed `**server:**`, `**web:**`, `**admin:**`, `**web + admin:**`, `**all repos:**`.
2. Use the references in the ticket:
   - **Screens:** `docs/design/README.md` maps each screen number (e.g. `1.1 Sign in`) to a file in
     `docs/design/auth/`. The design-canvas link in the ticket is private; use these files.
   - **Tables:** `docs/database/schema.dbml` shows the data behind each screen. You never talk to the
     database: everything goes through the `server` API.
3. Do every task for this repo. Cover the **Scenarios** in code and write the tests from **Testing**
   that apply to this repo.
4. Stay inside the ticket. Don't add libraries, tables, endpoints or pages the ticket doesn't ask for.
   Use the tools listed in "What we'll use, and why"; if you must use something else, say why in the PR.
5. If something is unclear, missing or contradicts another file, ask in a comment on the issue
   instead of guessing. Don't stop half-way silently.
6. Before you finish: lint, type-check and all tests must pass.
7. Commits use Conventional Commits (`feat(auth): add refresh rotation`). The pull request
   description must contain `Closes #<issue number>`, the ticket's tasks as a checklist (ticked
   for what's done), how to run/test it, and anything left for a follow-up ticket.

## Domain rules (all repos)

- **Words used in the business:** kissan = farmer (seller), beopari = buyer, arhti = commission agent
  (the shop), parchi = bill/receipt, khata = ledger, kanta = weighing scale, peshgi = advance,
  mann/maund = 40 kg, bori = bag.
- **Money:** `numeric(14,2)` in the DB. Never use JS `number`/float maths for money: send money as
  strings in the API and use `decimal.js` for calculations. Rupees, 2 decimals.
- **Weight:** stored in kg as `numeric(12,3)`. 1 maund = 40 kg. Show maund + kg in the UI
  (e.g. `12 mn 15 kg`).
- **Ledger (khata) is append-only.** Never update or delete a ledger entry; correct it with a
  reversing entry.
- **Bill (parchi) numbers** are per shop and come from `number_sequences`; no gaps from failed saves.
- **Time:** store `timestamptz` (UTC); show Asia/Karachi time.
- **Language:** English now, Urdu (RTL) later. Keep user-facing text out of logic so it can be
  translated; use logical CSS (`ms-`, `me-`, `start`, `end`) instead of left/right.
- **Never trust the client** with `tenant_id`, role, prices or totals: the server decides.

## Stack

| Area | Tool |
|---|---|
| Framework | Next.js (App Router) + TypeScript (strict) |
| UI | Tailwind CSS + shadcn/ui (Radix) |
| Server state | TanStack Query |
| HTTP | Axios with interceptors |
| Client state | Zustand |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table |
| Tests | Vitest + React Testing Library (unit/component), Playwright (e2e) |
| Package manager | npm |

## Folder layout

```
src/
  app/(auth)/            login, forgot password, OTP, invite … (public)
  app/(panel)/          logged-in pages, protected by middleware
  features/<feature>/    api.ts (requests), hooks.ts (queries/mutations), schemas.ts (Zod), components/
  components/ui/         shadcn components (generated, keep unmodified where possible)
  components/            shared components (DataTable, PageHeader, …)
  lib/                   api.ts (Axios), query-client.ts, format.ts, can.ts (permissions)
  stores/                Zustand stores
docs/design/             screen designs from the design canvas
```

- `middleware.ts` protects routes and redirects to `/login`; the role check for menus and pages
  uses `can(role, permission)` from `src/lib/can.ts`.

## Rules for the UI

- **Server data only through TanStack Query** (one `queryKeys` factory per feature). Don't copy API
  data into Zustand.
- **Zustand** only for client state: session (user, role, tenant, access token in memory), UI state.
- **Axios** instance in `src/lib/api.ts`: attaches the access token, on `401` refreshes **once**
  (single-flight queue) and retries; the refresh token is an `httpOnly` cookie set by the server.
  Never put tokens in `localStorage`.
- **Forms:** React Hook Form + Zod (`zodResolver`) with shadcn `Form` components. Field errors from
  the API (`errors`) are shown on the matching field.
- **Tables:** the shared `DataTable` (TanStack Table) with server-side paging/sorting/filtering.
- **Money and weight:** format with the shared helpers (`formatRs`, `formatMaund`); never do money
  maths in the browser, show what the server returns.
- Every page has loading, empty, error and `403` states.
- Accessible: labels on every input, keyboard reachable, visible focus ring, contrast 4.5:1.

## Design

- Screens are in `docs/design/` — start with `docs/design/README.md`, which maps the screen
  numbers used in tickets (1.1, 2.3, …) to files. Match the layout, copy and states shown there,
  but build them with Tailwind + shadcn/ui components; don't copy the inline styles.
- Design tokens (violet theme, default):
  - Brand panel gradient `#4C1D95` → `#9333EA` over the wheat-grain photo
  - Buttons/links `#6D28D9` → `#9333EA`; focus ring = accent at 15% opacity
  - Page background `#F6F3FF`, cards white, radius 24px; inputs 50px tall, radius 12px
  - Text `#1E1B2E`, secondary `#5B5668`, borders `#DCD8E6`, error `#BE123C`, success `#047857`
  - Fonts: Plus Jakarta Sans (headings), Inter (body), Noto Nastaliq Urdu (Urdu)
  - Other themes (indigo, blue, green, red, dark) are listed in `docs/design/README.md`
- Put the tokens in the Tailwind/shadcn theme (CSS variables), not hard-coded in components.

## Commands

The setup ticket creates these scripts; keep them working in every change:
`npm run dev`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`.
If a script doesn't exist yet (the repo is new), create it as part of your ticket.
