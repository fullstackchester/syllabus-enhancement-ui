# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Type-check + build for production
npm run lint         # Run ESLint
npm run typecheck    # Type-check without building
npm run format       # Format with Prettier
```

Add shadcn/ui components with:
```bash
npx shadcn@latest add <component-name>
```

## Architecture

This is a React + TypeScript + Vite SPA for a syllabus management system.

### Routing

Routes are defined in `src/routes.ts` using React Router v7. The layout hierarchy is:

- `App` (root) — bare flex wrapper
  - `/` → `Login`
  - `/create-account` → `CreateAccount`
  - `Shell` (authenticated layout with sidebar + header) — wraps all authenticated pages
    - `/dashboard`, `/syllabus`, `/emails`, `/accounts`

`Shell` (`src/components/shell.tsx`) provides the sidebar (`AppSidebar`), site header (`SiteHeader`), and wraps content in a `SidebarProvider`.

### Backend Integrations

The app uses **two separate backends**:

1. **Firebase** (`src/firebase/firebase.config.ts`) — used for authentication (`auth`), Realtime Database (`database`), and Storage (`storage`). All Firebase env vars are prefixed `VITE_` (e.g. `VITE_API_KEY`, `VITE_AUTH_DOMAIN`).

2. **Supabase** (`src/lib/client.ts`, `src/lib/server.ts`) — browser and server clients. Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.

### Services Layer

All API calls are encapsulated in singleton service classes under `src/services/`:

- `authentication.service.ts` — wraps Firebase Auth (`signIn`, `createUser`)
- `syllabus.service.ts` — REST calls to `/api/syllabus` with query params for filtering by status, UID, or author
- `accounts.service.ts` — REST calls to `/api/accounts/get-accounts`

Services return `ApiResponse<T>` (defined in `src/types/global.types.ts`), which wraps `status`, `data`, `message`, and optional `error`.

### Path Aliases

Configured in `tsconfig.json`:

| Alias | Resolves to |
|---|---|
| `@/*` | `src/*` |
| `@components` | `src/components/*` |
| `@pages` | `src/pages/*` |
| `@services` | `src/services/*` |
| `@styles` | `src/styles/*` |
| `@types` | `src/types/*` |
| `~shadcnui` | `src/components/ui/*` |

### UI Components

shadcn/ui components live in `src/components/ui/`. The app uses Tailwind CSS v4, `next-themes` for dark mode via `ThemeProvider`, and `sonner` for toast notifications. Icons are from `lucide-react`.

Tables use `@tanstack/react-table` with a pattern of dynamically building `ColumnDef[]` from data shape (see `src/pages/syllabus.tsx`).
