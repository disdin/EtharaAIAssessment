# HRMS Lite — Frontend (React)

Vite + React SPA that talks to the FastAPI backend. API contracts: [`docs/SPECIFICATION.md`](../docs/SPECIFICATION.md). Overview: [`README.md`](../README.md).

## Toolchain

| Piece | Choice |
|-------|--------|
| UI | **React** 19 |
| Language | **TypeScript** |
| Build / dev | **Vite** 5 |
| Routing | **React Router** 7 |
| Linting | **ESLint** 9 (`typescript-eslint`, React hooks) |

**Node.js:** This project pins **Vite 5** for broad compatibility (e.g. **Node 18+** / **20.15+**). You can upgrade to newer Node anytime; if you later move to Vite 8+, follow that version’s engine requirements.

## Environment (SPECIFICATION §8.5)

| Variable | When | Purpose |
|----------|------|---------|
| `VITE_API_URL` | Dev / **build** | FastAPI base URL, **no trailing slash**. Embedded at **build time** for production. |

Copy `.env.example` → `.env`. Default in code if unset: `http://127.0.0.1:8000`.

**Production:** set `VITE_API_URL` in the hosting provider’s build environment (e.g. `https://api.yourdomain.com`) so the SPA calls the correct API.

## Install & run (local)

```bash
cd frontend
npm install
cp .env.example .env    # optional: point VITE_API_URL at your API
npm run dev
```

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server (HMR) |
| `npm run build` | `tsc -b` then production assets → `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm run lint` | ESLint |

## Path alias

`@/` → `src/` (`vite.config.ts`, `tsconfig.app.json`).

## Deployment (Vercel / Netlify)

1. **Build command:** `npm run build`  
2. **Output directory:** `dist`  
3. **SPA fallback:** configure rewrites so all non-file routes serve `index.html` (client-side routing).
   - **Vercel:** `vercel.json` with `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }` *only if* the default SPA behavior does not apply — Vite often works with zero config on Vercel for SPAs; verify deep links to `/employees` and `/attendance`.
   - **Netlify:** `_redirects` file in `public/` with `/*    /index.html   200` (or `netlify.toml` equivalent).
4. **CORS:** backend `CORS_ORIGINS` must include your deployed site origin (e.g. `https://your-app.vercel.app`).

This repo includes **`vercel.json`** (SPA rewrite), **`netlify.toml`** (build + SPA fallback), and **`public/_redirects`** (Netlify). Adjust if your host uses different rules.

## Accessibility (SPECIFICATION §9.2)

Forms use associated `<label>` / `htmlFor`, keyboard-submit on forms, and `aria-invalid` / `role="alert"` where appropriate.

## App structure

| Path | Role |
|------|------|
| `src/lib/config.ts` | `getApiBaseUrl()` |
| `src/lib/api.ts` | `apiRequest`, `ApiError` |
| `src/lib/parseApiValidation.ts` | FastAPI **422** → field errors |
| `src/components/ui/*` | Shared UI primitives |
| `src/layout/AppLayout.tsx` | Shell + nav |
| `src/pages/HomePage.tsx` | Health probe |
| `src/pages/EmployeesPage.tsx` | Employees CRUD UI |
| `src/pages/AttendancePage.tsx` | Attendance mark + history (range or single **On date**) |
| `src/pages/DashboardPage.tsx` | Bonus dashboard: summary + per-employee stats |

Routes: `/`, `/dashboard`, `/employees`, `/attendance`.

Build order: [`../docs/IMPLEMENTATION_STEPS.md`](../docs/IMPLEMENTATION_STEPS.md).
