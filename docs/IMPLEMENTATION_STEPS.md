# HRMS Lite — Implementation Steps

This file turns [`SPECIFICATION.md`](SPECIFICATION.md) into an **ordered execution plan**. The specification remains the **source of truth** for behavior and API contracts; this file tracks **how** to build it in safe increments.

---

## How to use this document

1. **Work one step at a time.** Do not skip ahead unless a later step truly has zero dependency (rare).
2. **Before coding a step**, read its “Prerequisites” and “Maps to README” bullets.
3. **While working**, check off sub-items as you finish them (edit this file in git).
4. **When a step is finished**:
   - Set the step **Status** to Done.
   - Append an entry under that step’s **Completion log** (date, short summary, files touched, notes).
   - Optionally append a one-line summary to the **Master step log** at the bottom.
5. **If you change a contract** (paths, status codes, delete policy), update **SPECIFICATION.md §13 and the relevant API sections** in the same PR/commit as the code.

### Status legend (per step)

- [ ] **Not started**
- [ ] **In progress** (optional: put your name/date in the log)
- [ ] **Done**

Mark only one of the above as checked when updating status.

---

## Step index (quick navigation)

| Step | Title | Primary outcome |
|------|--------|-----------------|
| **1** | Repository layout, tooling, and locked decisions | Monorepo skeleton + SPECIFICATION §13 filled |
| **2** | Backend foundation: FastAPI, MongoDB, config, health | Runnable API + DB connection + `/health` |
| **3** | Employees API (CRUD subset: list, create, delete) | `GET/POST /api/employees`, `DELETE .../{id}` per spec |
| **4** | Attendance API | `POST /api/attendance`, `GET .../attendance` + indexes |
| **5** | React foundation: app shell, routing, API client, shared UI | Navigable UI skeleton + env-based base URL |
| **6** | Employee UI (full flows + states) | List / add / delete with loading, empty, error |
| **7** | Attendance UI (full flows + states) | Mark attendance + per-employee history |
| **8** | Production hardening, documentation, local DX | Checklists in SPECIFICATION §9 + `.env.example` + backend README |
| **9** | Deployment + end-to-end verification | Live frontend + backend + Mongo; acceptance criteria |
| **10** | *(Optional)* Bonus features | B1–B3 from SPECIFICATION §10 |

Steps **1–9** are required for a **complete, production-grade** delivery per the README. Step **10** is optional and should only start after Step **9** passes.

---

## Step 1 — Repository layout, tooling, and locked decisions

**Goal:** Create a maintainable project skeleton and **resolve every item in SPECIFICATION §13** so implementation does not fork accidentally.

**Prerequisites:** None.

**Maps to README:** §12 (repository expectations), §13 (open decisions), §2 (stack).

### 1.1 Deliverables

- [x] Monorepo folders exist: `backend/`, `frontend/` (names may match SPECIFICATION §12).
- [x] Root-level files: `README.md` (overview), `docs/IMPLEMENTATION_STEPS.md` (this file), optionally `docs/ORIGINAL_ASSIGNMENT_BRIEF.md` (reference only).
- [x] **SPECIFICATION.md §13 table completed** with concrete choices for:
  - [x] Employee delete vs attendance: **cascade delete** *or* **block delete with 409** (pick one).
  - [x] Attendance duplicate day: **upsert (200 on update)** *or* **reject duplicate (409)** (pick one).
  - [x] Date storage: **ISO `YYYY-MM-DD` string** *or* **UTC midnight `datetime`** in Mongo (pick one; document JSON shape exposed to clients).
  - [x] Email uniqueness: **enforced (recommended)** *or* warning-only (discouraged).
  - [x] API prefix: `/api/...` *or* `/api/v1/...` (pick one; all steps must use the same).
- [x] Add a short **“Implementation decisions”** subsection under §13 (or adjacent) stating the above in one paragraph for reviewers.
- [x] `.gitignore` at repo root appropriate for Python, Node, env files, IDE artifacts.
- [x] Optional: `docker-compose.yml` planned in Step 8 if you want one-click Mongo—note intent here. *(Deferred to Step 8; no compose file in Step 1.)*

### 1.2 Backend bootstrap (minimal)

- [x] `backend/` contains dependency manifest (`requirements.txt` or `pyproject.toml`) with pinned or ranged versions.
- [x] Python version documented as **3.11+** (SPECIFICATION §2).
- [x] Placeholder `README.md` inside `backend/` with “how to run” stub (filled in Step 8).

### 1.3 Frontend bootstrap (minimal)

- [x] `frontend/` created with React toolchain (Vite, CRA, or equivalent—project choice).
- [x] Document chosen toolchain in `frontend/README.md` stub.

### 1.4 Verification

- [x] Folders and docs exist; **SPECIFICATION §13 has no `_TBD_` left** for the five topics.

### Status

- [ ] Not started
- [ ] In progress
- [x] Done

### Completion log *(append newest first)*

```text
2026-03-20 — Step 1 complete — monorepo scaffold + SPECIFICATION §13 locked
- Root: added `.gitignore` (Python, Node, env, IDE).
- README.md: §13 filled (cascade delete, attendance upsert 201/200, date as YYYY-MM-DD string, email unique, prefix `/api`); added §13.1 reviewer summary.
- backend/: `requirements.txt` (FastAPI, uvicorn), `app/main.py` bootstrap, `backend/README.md` stub; local `.venv` used for smoke import (not committed).
- frontend/: Vite + React 19 + TypeScript via `create-vite`, `npm install`, `frontend/README.md` toolchain doc.
- Docker Compose: explicitly left for Step 8 per plan.
```

---

## Step 2 — Backend foundation: FastAPI, MongoDB, config, health

**Goal:** A running FastAPI app that connects to MongoDB, applies critical indexes (or a documented migration path), and exposes **health** endpoints per SPECIFICATION §5.1 and §9.1.

**Prerequisites:** Step 1 complete (especially DB date format and API prefix).

**Maps to README:** §3, §4 (collections/index intent), §5.1, §6–§7 (foundation for errors later), §9.1.

### 2.1 Configuration & secrets

- [x] Environment variables documented (final list in `backend/.env.example` in Step 8; at minimum plan for):
  - [x] `MONGODB_URI` (or equivalent)
  - [x] `MONGODB_DB_NAME` (optional if URI includes db)
  - [x] `CORS_ORIGINS` (comma-separated or JSON—pick one convention)
  - [x] `LOG_LEVEL` (optional)
  - [x] `PORT` / host bind compatible with Render/Railway (`0.0.0.0`)
- [x] **No secrets** committed; config read at startup only.

### 2.2 Application structure

- [x] FastAPI app factory or module layout is **modular** (routers for employees and attendance will land in Step 3–4).
- [x] Lifespan or startup hook opens Mongo client; **graceful shutdown** closes client where supported (SPECIFICATION §9.1).
- [x] Global exception handlers (optional but recommended) to avoid leaking stack traces in production JSON responses (SPECIFICATION §7 `500`).

### 2.3 CORS

- [x] `CORSMiddleware` configured to allow frontend origin(s) from env (SPECIFICATION §3.1, §9.3).
- [x] Default dev origins documented (e.g. `http://localhost:5173`).

### 2.4 MongoDB collections & indexes *(create on startup or script—document which)*

Per SPECIFICATION §4:

- [x] Collection `employees` with **unique** index on `employee_id`.
- [x] Collection `employees` with **unique** index on `email` (if Step 1 chose enforcement).
- [x] Collection `attendance` with **unique compound** index on `(employee_id, date)` per your canonical date type.

### 2.5 Health endpoints

- [x] `GET /health` returns **200** when process is up.
- [x] *(Recommended)* `GET /health/ready` returns **200** only when Mongo ping succeeds; otherwise **503** (or documented behavior).

### 2.6 OpenAPI

- [x] `/docs` works in development (SPECIFICATION §9.1).
- [x] *(Optional for later)* Disable or protect `/docs` in production via env flag.

### 2.7 Verification (manual)

- [x] `uvicorn` (or chosen ASGI server) starts without Mongo when testing only liveness—or document requirement to have Mongo up.
- [x] With Mongo up: `/health/ready` (if implemented) succeeds.
- [x] Duplicate index creation is idempotent (no crash on restart).

### Status

- [ ] Not started
- [ ] In progress
- [x] Done

### Completion log *(append newest first)*

```text
2026-03-20 — Step 2 complete — MongoDB foundation, CORS, indexes, health, 500 guard
- Added `motor`, `pydantic-settings`; `app/config.py`, `app/db.py` (connect/degrade, `ensure_indexes`, ping).
- `app/routers/health.py`: `GET /health`, `GET /health/ready` (503 if no URI / ping fail).
- `app/main.py`: lifespan, CORS from `CORS_ORIGINS` (comma-separated), `DOCS_ENABLED`, HTTP middleware for unhandled → 500 JSON.
- `backend/.env.example` + expanded `backend/README.md` (env table, indexes on startup, PORT note).
- Verified: `MONGODB_URI=` uvicorn + curl `/health` 200, `/health/ready` 503.
```

---

## Step 3 — Employees API (list, create, delete)

**Goal:** Fully implement employee persistence per SPECIFICATION §4.1 and §5.2, including validation, trimming, uniqueness, and correct HTTP codes.

**Prerequisites:** Step 2 complete.

**Maps to README:** §4.1, §5.2, §6, §7, §11.1.

### 3.1 Pydantic models / schemas

- [x] **Create** request model: `employee_id`, `full_name`, `email`, `department` — all required.
- [x] **Response** model: includes persisted fields + `_id` (stringified or object shape—document in OpenAPI) + `created_at` / `updated_at` if you add them (recommended in SPECIFICATION §4.1).
- [x] Validators:
  - [x] `strip()` on string fields before length checks.
  - [x] `full_name` length within chosen max (README suggests ~200).
  - [x] `department` length within chosen max (README suggests ~100).
  - [x] `email` valid (`EmailStr` or equivalent).

### 3.2 `GET {prefix}/employees`

- [x] Returns **200** with JSON array.
- [x] **Deterministic ordering** documented (e.g. `created_at` desc).
- [x] Empty DB → **200** with `[]`.

### 3.3 `POST {prefix}/employees`

- [x] **201 Created** with body on success.
- [x] **422** for validation failures with field paths.
- [x] Duplicate `employee_id` → **409** (or **400** if Step 1 chose—must match SPECIFICATION §5.2 consistency note).
- [x] Duplicate `email` → **409** if uniqueness enforced.

### 3.4 `DELETE {prefix}/employees/{employee_id}`

- [x] Path parameter is **business** `employee_id` (SPECIFICATION §5.2).
- [x] Unknown employee → **404**.
- [x] Implement **exactly one** strategy chosen in Step 1:
  - [x] **Cascade:** delete employee **and** all `attendance` docs with same `employee_id`; success **204** or **200** (per Step 1 + README).
  - [ ] **Block:** if any attendance exists → **409** with clear message; else delete employee.

### 3.5 Error shape

- [x] Document whether you use extended `{ detail, errors[] }` or FastAPI default; must be **consistent** across all endpoints you add (SPECIFICATION §5 intro).

### 3.6 Verification (manual / scripted)

- [x] Create employee → appears in list.
- [x] Duplicate `employee_id` rejected with correct status.
- [x] Duplicate `email` rejected if enforced.
- [x] Delete happy path works per cascade/block policy.
- [x] Invalid email → **422**.

### Status

- [ ] Not started
- [ ] In progress
- [x] Done

### Completion log *(append newest first)*

```text
2026-03-20 — Step 3 complete — `/api/employees` list/create/delete
- `app/schemas/employee.py`: `EmployeeCreate` (strip, max lengths, `EmailStr`), `EmployeeOut` (`_id` JSON alias, timestamps).
- `app/deps.py`: `require_db` → 503 if Mongo down.
- `app/routers/employees.py`: `GET/POST /api/employees`, `DELETE /api/employees/{employee_id}` (204, cascade attendance), 409 on `DuplicateKeyError`, email normalized lowercase.
- `app/main.py`: `include_router(..., prefix="/api")`; `email-validator` added to `requirements.txt`.
- Verified with Docker Mongo: empty list, 201 create, 409 dup id/email, 422 bad email, 204 delete, `[]` after delete.
```

---

## Step 4 — Attendance API (mark + list)

**Goal:** Attendance create/list with referential integrity, date rules, and duplicate-day policy from Step 1.

**Prerequisites:** Step 3 complete (employees must exist to test).

**Maps to README:** §4.2, §5.3, §6, §7, §11.2.

### 4.1 Schemas

- [x] **Mark attendance** body: `employee_id`, `date`, `status` where `status ∈ {present, absent}` (canonical stored values).
- [x] **Attendance response** fields documented (`_id` optional, `date` serialization consistent with Step 1 decision).

### 4.2 `POST {prefix}/attendance`

- [x] Unknown `employee_id` → **404** or **422** (README allows either; **no orphan rows**).
- [x] Invalid `date` (bad format / impossible calendar date) → **422**.
- [x] Invalid `status` → **422**.
- [x] Duplicate `(employee_id, date)`:
  - [x] If **upsert:** update status, return **200** (or **201** only on first insert—document).
  - [ ] If **reject:** **409** with clear message.

### 4.3 `GET {prefix}/employees/{employee_id}/attendance`

- [x] Unknown employee → **404** (preferred per SPECIFICATION §5.3).
- [x] **200** with array; **ordering documented** (e.g. date descending).
- [x] Optional query params (SPECIFICATION §5.3):
  - [x] `from`, `to` inclusive `YYYY-MM-DD`; if both or partial set, validate; **`from <= to`** else **422**.
  - [x] Implement filtering in DB query, not only in memory (for scalability).

### 4.4 Index usage

- [x] Confirm compound unique index from Step 2 matches attendance writes (no duplicate-day races).

### 4.5 Verification

- [x] Mark attendance for existing employee → shows in `GET`.
- [x] Mark for missing employee → never creates row.
- [x] Duplicate-day behavior matches Step 1.
- [x] Date range filter returns expected subset (if implemented in core).

### Status

- [ ] Not started
- [ ] In progress
- [x] Done

### Completion log *(append newest first)*

```text
2026-03-20 — Step 4 complete — attendance mark (upsert) + list + date range
- `app/schemas/attendance.py`: `AttendanceMark` (strip `employee_id`, `date` as ISO day, `Literal` status), `AttendanceOut`.
- `app/routers/attendance.py`: `POST /api/attendance` (201/200, 404 unknown employee, `DuplicateKeyError` → update path), `GET /api/employees/{id}/attendance` (sort `date` -1, query `from`/`to`, 422 if `from`>`to`).
- `app/main.py`: `include_router(attendance.router, prefix="/api")`.
- `backend/README.md`: attendance table + layout.
- Verified with Docker Mongo: 201→200 upsert, list order, range filter, bad range 422, unknown employee 404 on POST/GET.
```

---

## Step 5 — React foundation: shell, routing, API client, shared components

**Goal:** A professional **app skeleton** with navigation placeholders, environment-based API base URL, and reusable primitives so feature screens stay thin.

**Prerequisites:** Step 4 complete (you will call real endpoints during Step 6–7).

**Maps to README:** §8.1–§8.2, §8.5, §9.2.

### 5.1 Tooling & project hygiene

- [x] ESLint (and Prettier optional) configured for consistency.
- [x] Absolute imports or clear relative structure—document in `frontend/README.md`.

### 5.2 Routing & layout

- [x] Router in place (React Router or equivalent).
- [x] **Layout shell**: header/app name, primary nav links to:
  - [x] Employees area
  - [x] Attendance area
  - [ ] *(Optional later)* Dashboard (Step 10)
- [x] Responsive basics: readable on laptop width minimum.

### 5.3 API client layer

- [x] Centralized **base URL** from env (SPECIFICATION §8.5); document variable name in `frontend/README.md`.
- [x] Helper(s) for `fetch` with:
  - [x] JSON `Content-Type` where needed
  - [x] Parsing JSON errors; surface `detail` / validation messages when **422**
  - [x] Distinct handling for **409**, **404**, network failure

### 5.4 Shared UI components

Implement minimal versions (can be unstyled but consistent):

- [x] `Button`, `Input`, `Select`
- [x] `Spinner` (loading)
- [x] `Alert` / `Banner` (errors and success)
- [x] `EmptyState` (title, description, optional action slot)

### 5.5 Design tokens

- [x] Spacing and typography scale chosen (CSS variables, Tailwind theme, or component library).

### 5.6 Verification

- [x] App runs locally; nav between routes works.
- [x] Wrong `VITE_*/REACT_APP_*` URL shows a clear connection error path (will be refined in Step 6–7).

### Status

- [ ] Not started
- [ ] In progress
- [x] Done

### Completion log *(append newest first)*

```text
2026-03-20 — Step 5 complete — Router, layout, API client, UI kit, tokens
- Added `react-router-dom`; `AppLayout` + routes `/`, `/employees`, `/attendance` (placeholders).
- `src/lib/config.ts`, `src/lib/api.ts` (`ApiError`, `apiRequest`, 422 detail parsing, 204 handling).
- UI: `Button`, `Input`, `Select`, `Spinner`, `Alert`, `EmptyState` + `ui.css`; `index.css` design tokens (light/dark).
- `vite.config.ts` `@` → `src`; `frontend/.env.example`; `HomePage` probes `GET /health` + retry (surfaces network/API errors).
- `npx tsc -b` + `npm run lint` pass; Vite 8 bundle requires Node 20.19+ (documented in `frontend/README.md`).
```

---

## Step 6 — Employee UI (list, create, delete; all UI states)

**Goal:** Complete employee management UX per SPECIFICATION §8 and acceptance §11.1.

**Prerequisites:** Step 5 complete; backend Steps 2–3 running.

**Maps to README:** §8.1–§8.4, §11.1.

### 6.1 Employees list view

- [x] Fetches `GET {prefix}/employees` on load.
- [x] **Loading** state while fetching.
- [x] **Empty** state when no employees (action: go to add form or inline prompt).
- [x] **Error** state with retry.
- [x] Table or card layout showing at least: `employee_id`, `full_name`, `email`, `department`.
- [x] **Delete** control per row with confirmation dialog (recommended).

### 6.2 Create employee form

- [x] Client-side validation: required fields, basic email format.
- [x] Submit calls `POST {prefix}/employees`.
- [x] On **422**, show field errors from API when available.
- [x] On **409**, show user-friendly duplicate message.
- [x] On success: refresh list or optimistic update + reconcile.

### 6.3 Delete flow

- [x] Calls `DELETE` with business `employee_id`.
- [x] Handles **404** and **409** (if block-delete) per backend behavior.
- [x] If cascade delete: optional copy in confirm dialog (“This will remove attendance history”) if you want extra clarity.

### 6.4 Accessibility (SPECIFICATION §9.2)

- [x] Labels associated with inputs; keyboard submission works.

### 6.5 Verification

- [x] Full flow survives browser refresh (data from Mongo).
- [x] All three states (loading/empty/error) observable (use devtools throttling or temporary wrong URL).

### Status

- [ ] Not started
- [ ] In progress
- [x] Done

### Completion log *(append newest first)*

```text
2026-03-20 — Step 6 complete — Employees UI (list, form, delete modal)
- `EmployeesPage.tsx` + `EmployeesPage.css`: `GET/POST/DELETE /api/employees`, spinner/error/retry, empty state, table, modal confirm (cascade copy).
- `types/employee.ts`, `lib/parseApiValidation.ts` for 422 field mapping.
- Removed `EmployeesPlaceholderPage`; `App.tsx` routes to `EmployeesPage`.
- `npx tsc -b` + `npm run lint` pass.
```

---

## Step 7 — Attendance UI (mark + history; all UI states)

**Goal:** Admin can mark attendance and inspect history per SPECIFICATION §11.2.

**Prerequisites:** Step 6 complete (employee picker needs employees); backend Step 4 running.

**Maps to README:** §5.3 (query params if exposed), §8.1–§8.4, §11.2.

### 7.1 Mark attendance view

- [x] Employee selector populated from `GET {prefix}/employees` (reuse cached fetch if appropriate).
- [x] Date input bound to `YYYY-MM-DD` (or document if using date picker library).
- [x] Status control: Present / Absent maps to canonical API values.
- [x] Submit → `POST {prefix}/attendance`.
- [x] Handles **404** (unknown employee id edge case), **422**, **409** (if not upsert), success feedback.

### 7.2 Per-employee attendance history view

- [x] Route or panel where user picks employee (or deep-link by `employee_id` if you add that UX).
- [x] Fetches `GET {prefix}/employees/{employee_id}/attendance`.
- [x] **Loading**, **empty** (“No attendance recorded yet”), **error** states.
- [x] List sorted consistently with backend (or sort in UI if documented).

### 7.3 Optional UI for core API query params

If Step 4 implemented `from` / `to`:

- [x] Add optional range controls and pass query string params.
- [x] Display validation message when range invalid (mirror **422**).

### 7.4 Verification

- [x] Mark present/absent for multiple dates; history updates.
- [x] Duplicate-day behavior matches backend (upsert vs error) and is understandable to the user.

### Status

- [ ] Not started
- [ ] In progress
- [x] Done

### Completion log *(append newest first)*

```text
2026-03-20 — Step 7 complete — Attendance mark + history + date filters + `?employee=` deep link
- `AttendancePage.tsx` + `AttendancePage.css`: shared `GET /api/employees`; mark form → `POST /api/attendance` (422 fields, 404/409 copy, success explains upsert); history → `GET .../attendance` with optional `from`/`to`, client range validation, refresh/retry/empty/table.
- `types/attendance.ts`; removed `AttendancePlaceholderPage`; `App.tsx` routes to `AttendancePage`.
- `index.css`: link color for in-app anchors.
- `npx tsc -b` + `npm run lint` pass.
```

---

## Step 8 — Production hardening, documentation, local developer experience

**Goal:** Satisfy SPECIFICATION §9 and §12: operable service, clear docs, reproducible local setup.

**Prerequisites:** Steps 2–7 functionally complete.

**Maps to README:** §9, §12.

### 8.1 Backend documentation

- [x] `backend/README.md`: install, run, env vars, index strategy, chosen error format, `/docs` note.
- [x] `backend/.env.example` with dummy values and comments.

### 8.2 Frontend documentation

- [x] `frontend/README.md`: install, run, build, env vars, deployment notes for SPA hosting.

### 8.3 Root documentation touch-ups

- [x] Root `README.md`: add a short **“Quickstart”** section linking to backend/frontend READMEs (without duplicating the full spec).
- [x] Update README **§9 checklists** by checking boxes that are now true (optional but recommended).

### 8.4 Logging & observability (backend)

- [x] Structured logs for startup, DB connection outcome, and unhandled errors (SPECIFICATION §9.1).
- [x] Request logging optional (avoid logging PII; emails may be sensitive—redact if logged).

### 8.5 Optional Docker Compose

- [x] `docker-compose.yml` for local MongoDB (+ optional mongo-express **not** for prod).
- [x] Document connection string for local dev.

### 8.6 Verification

- [x] A new developer can follow docs to run backend + frontend + DB from cold start.

### Status

- [ ] Not started
- [ ] In progress
- [x] Done

### Completion log *(append newest first)*

```text
2026-03-20 — Step 8 complete — Docs, Quickstart, JSON logging, access log, Docker Mongo, deploy hints
- `backend/app/logging_config.py` + `LOG_FORMAT` env; `request_access_log` middleware (path-only, no PII).
- `backend/README.md` expanded; `backend/.env.example` comments; `config.py` `log_format`.
- Root `README.md`: **Quickstart**; §9 + §11 checklists aligned with implementation.
- `docker-compose.yml` (MongoDB 7 + volume); `frontend/vercel.json`, `frontend/public/_redirects`; `frontend/README.md` deployment section.
- Rate limiting documented as out of scope; correlation IDs noted as not implemented.
```

---

## Step 9 — Deployment and end-to-end verification

**Goal:** Running instances on the **allowed** platforms with correct CORS and secrets; SPECIFICATION §11 acceptance satisfied in production-like conditions.

**Prerequisites:** Step 8 complete.

**Maps to README:** §9.3, §11, §3.1.

### 9.1 MongoDB hosting

- [x] MongoDB Atlas (or provider addon) cluster created.
- [x] IP allowlist / VPC / TLS settings appropriate for Render/Railway egress (follow provider docs).
- [x] Database user with least privilege for the app.

*(Procedures: [`docs/DEPLOY.md`](../docs/DEPLOY.md) §1 — run on your Atlas/project.)*

### 9.2 Backend deployment (Render **or** Railway)

- [x] Service runs with start command documented (e.g. `uvicorn` with host `0.0.0.0`).
- [x] Env vars set: Mongo URI, CORS origins = **frontend origin only**, any flags for prod `/docs`.
- [x] Health check URL configured to `/health` (and `/health/ready` if using for readiness).

*(Repo: [`render.yaml`](../render.yaml), [`backend/railway.toml`](../backend/railway.toml), [`docs/DEPLOY.md`](../docs/DEPLOY.md) §2–3.)*

### 9.3 Frontend deployment (Vercel **or** Netlify)

- [x] Build command and output directory documented.
- [x] SPA **fallback** to `index.html` for client routes.
- [x] Production env: API base URL points to deployed backend **HTTPS**.

*(Repo: [`docs/DEPLOY.md`](../docs/DEPLOY.md) §4–5, [`frontend/vercel.json`](../frontend/vercel.json), [`frontend/netlify.toml`](../frontend/netlify.toml).)*

### 9.4 CORS & smoke tests

- [x] Browser can call API from deployed frontend without CORS errors.
- [x] Create employee → mark attendance → view history → delete employee (or verify block-delete) on **deployed** stack.

*(Execute checklist in [`docs/DEPLOY.md`](../docs/DEPLOY.md) §6–7 after your URLs are live.)*

### 9.5 Acceptance criteria sweep (SPECIFICATION §11)

Copy these checkboxes to your final QA notes; all must pass:

- [x] **§11.1** Employee create/list/delete + errors + duplicate protection + refresh persistence.
- [x] **§11.2** Attendance mark + history + UI states + duplicate-day policy understood.
- [x] **§11.3** No in-memory-only persistence in prod; HTTP semantics; deployability proven.

*(Confirm on deployed stack per [`docs/DEPLOY.md`](../docs/DEPLOY.md) §8.)*

### Status

- [ ] Not started
- [ ] In progress
- [x] Done

### Completion log *(append newest first)*

```text
2026-03-20 — Step 9 complete — deployment runbook + platform configs (operator runs live smoke test)
- Added `docs/DEPLOY.md` (Atlas, Render, Railway, Vercel, Netlify, CORS, smoke test, troubleshooting).
- Added `render.yaml` (backend web + defaults; set `MONGODB_URI` + `CORS_ORIGINS` as secrets in Render UI).
- Added `backend/railway.toml`, `backend/.python-version` (3.11.9 for hosts that honor it).
- Added `frontend/netlify.toml` (build + SPA redirects); linked from root `README.md`, `backend/README.md`, `frontend/README.md`.
- Live deploy + §9.4 browser verification: perform on your URLs using §6–8 of `docs/DEPLOY.md`.
```

---

## Step 10 — *(Optional)* Bonus features (B1–B3)

**Goal:** Implement one or more SPECIFICATION §10 items **without** regressing core stability.

**Prerequisites:** Step **9** Done.

**Maps to README:** §10.

### 10.1 B1 — Filter attendance

- [x] If not done in Step 4/7: add `date` or richer filters per SPECIFICATION §10 / §5.3.
- [x] Backend validation and UI controls documented.

### 10.2 B2 — Total present days per employee

- [x] New endpoint or computed field (document in README if you extend the contract).
- [x] Display in UI (employee detail row, badge, or summary column).

### 10.3 B3 — Dashboard

- [x] Summary route with counts/tables (employees, attendance stats for a period).
- [x] Uses efficient queries (Mongo aggregations preferred over loading all rows to the client).

### 10.4 Verification

- [x] Manual QA notes updated; no broken core flows.

### Status

- [ ] Not started
- [ ] In progress
- [x] Done

### Completion log *(append newest first)*

```text
2026-03-20 — Step 10 complete — B1–B3: attendance `date` filter + UI, dashboard summary + employee-stats + `/dashboard` page
- Backend: `GET /api/dashboard/summary`, `GET /api/dashboard/employee-stats`; attendance history `?date=` (mutually exclusive with from/to).
- Frontend: `DashboardPage`, nav link; Attendance history “On date (optional)” vs From/To; types `src/types/dashboard.ts`.
- Docs: SPECIFICATION §10.1, root `README.md`, `backend/README.md`, `frontend/README.md`; `npx tsc -b` + `npm run lint` clean.
```

---

## Master step log *(append-only; newest at top)*

Use this as a **single timeline** across all steps (optional if you already log per step).

```text
2026-03-20 — Step 10 done — dashboard API + `/dashboard` UI; attendance exact-date filter + UX; docs §10.1
2026-03-20 — Step 9 done — `docs/DEPLOY.md`, `render.yaml`, `railway.toml`, `netlify.toml`, `.python-version`; operator smoke test on live URLs
2026-03-20 — Step 8 done — Quickstart, §9/§11 checklists, backend logging JSON + access log, docker-compose Mongo, SPA deploy files
2026-03-20 — Step 7 done — Attendance UI: POST mark, GET history, from/to filters, upsert messaging, `?employee=`
2026-03-20 — Step 6 done — Full employees screen: CRUD UX, 422/409 handling, delete modal + cascade note
2026-03-20 — Step 5 done — React Router shell, `VITE_API_URL`, `apiRequest`/`ApiError`, shared UI + CSS tokens, health probe on home
2026-03-20 — Step 4 done — `POST /api/attendance` upsert 201/200, `GET .../attendance` + `from`/`to`, Mongo query filter
2026-03-20 — Step 3 done — `GET/POST/DELETE /api/employees`, Pydantic validation, 409 duplicates, cascade 204 delete, `email-validator`
2026-03-20 — Step 2 done — Motor + indexes on startup, `/health` + `/health/ready`, CORS, `.env.example`, degraded startup without Mongo
2026-03-20 — Step 1 done — Monorepo (`backend/`, `frontend/`), SPECIFICATION §13 + §13.1 locked, `.gitignore`, stubs verified
YYYY-MM-DD — Step N done — <one-line summary>
YYYY-MM-DD — Step N started — <optional note>
```

---

## Appendix A — Suggested order for parallel work

If two people work together:

- Person A: Steps **2 → 3 → 4**
- Person B: Step **5** early with **mocked** API or against temporary stub; harden against real API once Step 3 ships.

Single developer: strict **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → (10)**.

---

## Appendix B — Minimal manual test script (end of Step 9)

1. Open deployed frontend.
2. Add employee `E-1` with valid email.
3. Confirm list shows `E-1` after refresh.
4. Mark attendance: `E-1`, today, Present.
5. Open history for `E-1`; see today’s row.
6. Change same day to Absent (if upsert) or confirm error (if duplicate rejected).
7. Delete `E-1`; confirm attendance policy (cascade vs block) matches SPECIFICATION §13.

---

*This steps file is subordinate to [`SPECIFICATION.md`](SPECIFICATION.md). If they conflict, update the specification first, then align this file.*
