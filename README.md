# Hackathon Starter (SvelteKit full-stack)

A reusable, competition-agnostic template. One repo, one language (TypeScript),
one deploy. Clone it, rename it, build the actual product on top.

## Stack

- **SvelteKit (full-stack)** — frontend + backend in one app (`+server.ts` API routes, `+page.server.ts` loaders/actions)
- **Drizzle ORM + SQLite** (`better-sqlite3`) — swap to Postgres by changing `DATABASE_URL` and the driver
- **Better Auth** — email + password out of the box, session in `locals.user`
- **Tailwind CSS v4** — utility styling
- **Zod** — one validation schema shared by client and server
- **Superforms** — Zod-driven forms: server + client validation, progressive enhancement
- **adapter-node** — deploy anywhere that runs Node

The visual design lives in `src/routes/layout.css` — edit the `:root` and
`.dark` palette blocks to restyle the whole app (light and dark). Hand-built
primitives are in `src/lib/components/ui/` (Button, Input, Card, Badge);
richer shadcn-svelte components sit alongside them, re-themed to the same tokens.

- **Dark mode** — class-based, toggled in the header (`mode-watcher`); all tokens flip.
- **shadcn-svelte** — Dialog, Alert Dialog, Dropdown Menu, Select, Sonner (toasts), Tooltip, Tabs, Sheet, Command. See the `/components` page. Add more with `npx shadcn-svelte@latest add <name>`.

## The one rule: everything goes through the service seam

```
route (+server.ts / +page.server.ts)   ← validate input with a zod schema
  └─ service (src/lib/server/services/*) ← the ONLY place that touches I/O
       └─ [ DB | external API | AI provider | Python sidecar ]
```

Routes never call the db, an SDK, or `fetch` a provider directly. This is what
keeps the template generic: you can swap the database, or add AI, without
touching any route or component.

## Adding AI later (no architecture change)

Implement `src/lib/server/services/ai.ts`:

- **External API** (OpenAI / Anthropic / hosted model): `fetch` inside `complete()`, key stays server-side via `AI_API_KEY`. Covers ~90% of cases.
- **Heavy local model / Python libs / GPU**: run a separate Python service and `fetch` it from `complete()`. SvelteKit stays a thin proxy.

Callers use `complete()` either way, so nothing else changes.

## What's already wired

| Block                 | Status                                | Where                                                    |
| --------------------- | ------------------------------------- | -------------------------------------------------------- |
| Auth                  | done — email+password, session guard  | `src/lib/server/auth.ts`, `hooks.server.ts`              |
| DB + example resource | done — `task` table + service         | `src/lib/server/db/`, `src/lib/server/services/tasks.ts` |
| Shared validation     | done — zod, client+server             | `src/lib/schemas/task.ts`                                |
| Example REST route    | done — GET/POST, auth-gated           | `src/routes/api/tasks/+server.ts`                        |
| AI seam               | stub — implement when needed          | `src/lib/server/services/ai.ts`                          |
| Forms                 | done — Superforms + Zod demo          | `src/routes/+page.server.ts`, `src/routes/+page.svelte`  |
| UI shell + primitives | done — app shell, Button/Input/Card   | `src/routes/+layout.svelte`, `src/lib/components/ui/`    |
| Design tokens         | done — edit to restyle everything     | `src/routes/layout.css`                                  |
| Dark mode             | done — header toggle, all tokens flip | `src/routes/layout.css`, `+layout.svelte`                |
| shadcn-svelte (9)     | done — Dialog/Select/Sheet/Command…   | `src/lib/components/ui/`, `/components` page             |
| Deploy                | done — Dockerfile + adapter notes     | `Dockerfile`, `.dockerignore`, README                    |

## Add a new resource (the pattern to copy)

1. Add a table in `src/lib/server/db/schema.ts`, then `npm run db:push`
2. Copy `src/lib/schemas/task.ts` → your resource's zod schema
3. Copy `src/lib/server/services/tasks.ts` → your resource's service
4. Copy `src/routes/api/tasks/+server.ts` → your resource's route (JSON API)
5. For a user-facing form, copy the Superforms wiring in `+page.server.ts` + `+page.svelte`

## Commands

```bash
npm run dev          # dev server (http://localhost:5173)
npm run build        # production build (adapter-node)
npm run preview      # run the production build locally
npm run check        # type-check (svelte-check)
npm run lint         # prettier + eslint
npm run db:push      # apply schema changes to SQLite
npm run db:studio    # browse the DB
npm run auth:schema  # regenerate Better Auth's Drizzle schema
```

## First-time setup

```bash
cp .env.example .env      # then set BETTER_AUTH_SECRET (and ORIGIN in prod)
npm install
npm run auth:schema
npm run db:push
npm run dev
```

The Better Auth demo lives at `/demo/better-auth`.

## Deploy

**Docker** (self-host anywhere):

```bash
docker build -t my-app .
docker run -p 3000:3000 \
  -e BETTER_AUTH_SECRET=... -e ORIGIN=https://your-domain \
  -e DATABASE_URL=/data/app.db -v $(pwd)/data:/data \
  my-app
```

SQLite lives in the mounted volume; run `npm run db:push` once against that DB
(or generate migrations with `npm run db:generate` and apply them on start).

**Vercel / Netlify / Cloudflare**: swap the adapter — `npx sv add sveltekit-adapter`
(pick your platform), and move to a hosted database (e.g. Postgres via Drizzle)
since serverless has no persistent disk for SQLite.
