# HRMS Lite — Project Specification (Source of Truth)

> **Where this lives:** Full technical spec for reviewers and implementers. The repository root [`README.md`](../README.md) is a short project overview; **this file** remains the contract for API behavior, data model, and acceptance criteria.

This document is the **authoritative technical specification** for the HRMS Lite application. It translates the assignment brief into implementable, production-oriented requirements. Implementation (code, folder layout, minor naming choices) may vary, but **behavior, data guarantees, and API contracts** defined here must be satisfied unless explicitly revised in this file.

---

## Quickstart (local development)

1. **MongoDB** — From the repo root, optional one-command local DB: `docker compose up -d` (see [`docker-compose.yml`](../docker-compose.yml)). Connection string: `mongodb://localhost:27017`. Or use Atlas / your own `mongod`.
2. **Backend** — [`backend/README.md`](../backend/README.md): Python venv, `pip install -r requirements.txt`, copy `backend/.env.example` → `backend/.env`, run `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`.
3. **Frontend** — [`frontend/README.md`](../frontend/README.md): `npm install`, optional `.env` with `VITE_API_URL=http://127.0.0.1:8000`, `npm run dev`.

The sections below remain the **source of truth** for API behavior, data model, and acceptance criteria.

**Cloud deployment:** step-by-step runbook, CORS, and smoke tests → [`DEPLOY.md`](DEPLOY.md). Optional **Render** Blueprint: [`render.yaml`](../render.yaml).

---

## 1. Purpose & Scope

### 1.1 Product goal

Build a **web-based Human Resource Management System (lite)** that allows a single **admin** to:

- **Manage employees** (create, list, delete).
- **Record and view attendance** per employee (date + present/absent).

The product should feel like a **credible internal HR tool**: clear navigation, predictable behavior, and resilient handling of empty, loading, and error conditions—not a throwaway demo.

### 1.2 Explicitly out of scope

- Authentication, authorization, roles, or multi-tenant isolation (single implicit admin).
- Leave management, payroll, benefits, performance reviews, documents, or org charts.
- Employee self-service portals.
- Notifications, email workflows, or calendar integrations (unless added as future work outside this spec).

### 1.3 Success criteria (assignment alignment)

| Area | Expectation |
|------|-------------|
| Frontend | Professional UI, reusable components, loading/empty/error states |
| Backend | RESTful APIs, validation, correct HTTP semantics, clear errors |
| Data | Persistent storage in **MongoDB** |
| Ops | Deployable **frontend** (Vercel or Netlify) and **backend** (Render or Railway) |

---

## 2. Technology Stack (Fixed)

| Layer | Technology | Notes |
|-------|------------|--------|
| UI | **React** | SPA or SSR-capable setup acceptable; default assumption is SPA + static hosting |
| API | **Python 3.11+** with **FastAPI** | Async or sync I/O acceptable if documented |
| Database | **MongoDB** | Use official driver or ODM (e.g. Motor + Pydantic models); choice must support indexes and uniqueness |
| HTTP | JSON over HTTPS in production | `Content-Type: application/json` for request bodies where applicable |

Other libraries (routing, UI kit, form validation, HTTP client) are **project choices** but must not contradict this spec.

---

## 3. High-Level Architecture

```text
┌─────────────────┐     HTTPS (JSON)      ┌─────────────────┐
│  React SPA      │ ◄──────────────────► │  FastAPI API    │
│  (Vercel/       │   CORS allowlist      │  (Render/       │
│   Netlify)      │                       │   Railway)      │
└─────────────────┘                       └────────┬────────┘
                                                   │
                                                   │ MongoDB wire protocol
                                                   ▼
                                          ┌─────────────────┐
                                          │  MongoDB        │
                                          │  (Atlas or      │
                                          │   managed DB)   │
                                          └─────────────────┘
```

### 3.1 Trust & security model (minimal)

- **No login**: all API routes are implicitly trusted as admin-only.
- **Production still requires**: HTTPS, restrictive **CORS** (frontend origin only), **secrets** via environment variables (never committed), and **non-root** process where applicable on the host.

---

## 4. Domain Model

### 4.1 Employee

**Concept:** A person employed by the organization, identified by a business **employee ID** (not necessarily the MongoDB `_id`).

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `employee_id` | string | yes | Unique across all employees; stable identifier for URLs and attendance linkage |
| `full_name` | string | yes | Non-empty after trim; reasonable max length (e.g. 1–200 chars) |
| `email` | string | yes | Valid email format; unique across all employees (recommended for data quality) |
| `department` | string | yes | Non-empty after trim; reasonable max length (e.g. 1–100 chars) |

**Storage (MongoDB):**

- Recommended collection: `employees`.
- **Unique indexes:**
  - `employee_id` (unique)
  - `email` (unique) — *strongly recommended* to enforce “duplicate employee” at the data layer for email collisions
- Document may include:
  - `_id` (ObjectId, server-generated)
  - `created_at`, `updated_at` (ISO-8601 UTC) — *recommended for auditing and sorting*

### 4.2 Attendance record

**Concept:** A single attendance decision for one employee on one calendar day.

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `employee_id` | string | yes | Must reference an existing employee’s `employee_id` |
| `date` | date (calendar) | yes | **One record per (employee_id, date)** — enforced at application and/or DB layer |
| `status` | enum | yes | Exactly one of: `present`, `absent` (API may accept synonyms if documented; persisted values should be canonical) |

**Storage (MongoDB):**

- Recommended collection: `attendance`.
- **Unique compound index:** `(employee_id, date)` — prevents duplicate marks for the same day.
- Optional fields: `marked_at` (timestamp), `notes` — **out of scope** unless promoted in a future revision of this README.

**Date semantics:**

- Store `date` as **UTC midnight** for the intended calendar day **or** as an ISO date string (`YYYY-MM-DD`) with consistent parsing rules. The spec requires **one** canonical representation documented in the API section and used consistently in queries.

---

## 5. REST API Specification

**Base URL:** Configurable per environment (e.g. `http://localhost:8000` locally, `https://api.example.com` in production).

**Common headers:**

- `Accept: application/json`
- `Content-Type: application/json` for bodies

**Error response shape (recommended, stable contract):**

```json
{
  "detail": "Human-readable summary",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

- `errors` may be omitted when a single global message suffices.
- FastAPI’s default `{"detail": ...}` is acceptable if extended consistently; **document the chosen shape** in the backend README or OpenAPI description.

### 5.1 Health & metadata

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Liveness: returns 200 when process is up (DB check optional but recommended as `/health/ready`) |

*Production recommendation:* separate **liveness** vs **readiness** if the platform supports it; minimum is a simple `/health`.

### 5.2 Employees

#### `GET /api/employees`

- **Purpose:** List all employees.
- **Success:** `200 OK` with JSON array of employee objects.
- **Ordering:** Deterministic (e.g. `created_at` descending or `full_name` ascending)—document the choice.
- **Empty list:** `200 OK` with `[]` (not an error).

#### `POST /api/employees`

- **Purpose:** Create employee.
- **Body (JSON):**

```json
{
  "employee_id": "E-1001",
  "full_name": "Ada Lovelace",
  "email": "ada@example.com",
  "department": "Engineering"
}
```

- **Success:** `201 Created` with created employee representation (including `_id` if used).
- **Validation failures:** `422 Unprocessable Entity` with field-level detail.
- **Duplicate `employee_id`:** `409 Conflict` (preferred) or `400 Bad Request` with explicit message—**must be consistent** across the API.
- **Duplicate `email`:** `409 Conflict` (if uniqueness enforced) with clear message.

#### `DELETE /api/employees/{employee_id}`

- **Path param:** `employee_id` is the **business** employee ID, not necessarily Mongo `_id`.
- **Success:** `204 No Content` **or** `200 OK` with confirmation JSON—pick one and document it.
- **Not found:** `404 Not Found`.
- **Cascade (required behavior):** Deleting an employee **must** either:
  - Delete all attendance rows for that `employee_id`, **or**
  - Reject deletion with `409 Conflict` if attendance exists  

  **Choose one strategy**, document it here when implementing, and apply consistently in UI (e.g. warn admin before delete if cascade).

### 5.3 Attendance

#### `POST /api/attendance`

- **Purpose:** Mark attendance for one employee on one date (create or upsert).
- **Body (JSON):**

```json
{
  "employee_id": "E-1001",
  "date": "2025-03-20",
  "status": "present"
}
```

- **Success:**
  - `201 Created` on first mark for that day, **or**
  - `200 OK` if upserting an existing record—document behavior.
- **Unknown `employee_id`:** `404 Not Found` or `422` with reference error—**must** not create orphan attendance.
- **Invalid `status`:** `422 Unprocessable Entity`.
- **Invalid `date`:** `422` (bad format or impossible date).
- **Duplicate (employee_id, date):** If not using upsert, return `409 Conflict`; if using upsert, update status idempotently.

#### `GET /api/employees/{employee_id}/attendance`

- **Purpose:** List attendance for a given employee.
- **Success:** `200 OK` with array of attendance records, **newest first** or **by date descending**—document order.
- **Unknown employee:** `404 Not Found` **or** `200` with `[]` if treating unknown as empty—**prefer `404`** for clarity.

**Query parameters (core vs bonus):**

| Param | Core | Description |
|-------|------|-------------|
| `from` | optional | Inclusive lower date bound `YYYY-MM-DD` |
| `to` | optional | Inclusive upper date bound |
| `date` | **bonus** | Exact date filter (may subsume single-day use case) |

If `from`/`to` are provided, validate `from <= to`; invalid range → `422`.

---

## 6. Validation Rules (Server-Side)

All rules **must** be enforced on the server (client validation is additive, not a substitute).

| Rule | Behavior |
|------|----------|
| Required fields | Reject with `422` and field paths |
| Email format | RFC 5322 pragmatic subset or Pydantic `EmailStr` |
| String trim | Apply `strip()` before length checks and persistence |
| `employee_id` uniqueness | Enforced via index + handled on insert |
| `email` uniqueness | Recommended index + conflict mapping to `409` |
| Attendance referential integrity | `employee_id` must exist at time of mark |
| One mark per employee per day | Unique compound index + clear error or upsert |

---

## 7. HTTP Status Code Policy

| Code | Use when |
|------|----------|
| `200` | Successful GET; successful update/upsert (if chosen) |
| `201` | Successful POST creating a resource |
| `204` | Successful DELETE with no body |
| `400` | Malformed request (only if not covered by `422`) |
| `404` | Resource not found (unknown employee, etc.) |
| `409` | Conflict (duplicate key, conflicting delete policy) |
| `422` | Semantically invalid body (Pydantic validation) |
| `500` | Unexpected server failure (log details server-side; generic safe message to client) |

---

## 8. Frontend Requirements (React)

### 8.1 UX / IA

- **Professional** visual design: consistent spacing scale, typography hierarchy, and color usage (light/dark optional).
- **Intuitive navigation** between:
  - Employees list / create / delete flows
  - Attendance marking
  - Per-employee attendance history
- **Bonus (optional):** Dashboard route with summary counts/tables (see §10).

### 8.2 Reusable components

Minimum conceptual components (exact names flexible):

- Layout shell (header/nav, main content area)
- Data table or card list for employees
- Form for new employee with inline validation feedback
- Attendance form (employee picker, date, status)
- Attendance history list for selected employee
- Shared: `Button`, `Input`, `Select`, `Spinner`, `Alert`/`Banner`, `EmptyState`

### 8.3 UI states (mandatory)

Every data-backed view must handle:

| State | Requirement |
|-------|-------------|
| **Loading** | Visible loading indicator; avoid layout jump where possible (skeletons optional) |
| **Empty** | Clear message + suggested action (e.g. “No employees yet—add one”) |
| **Error** | User-safe message; optional “retry”; show server message when appropriate |

### 8.4 Frontend validation

- Mirror critical rules (required fields, email) for fast feedback.
- Always assume server is authoritative; display API validation errors when `422` returns field errors.

### 8.5 Configuration

- **API base URL** via environment variable (e.g. `VITE_API_URL`, `REACT_APP_API_URL`, etc.—document the chosen convention).
- No secrets in the frontend bundle.

---

## 9. Production Readiness Checklist

### 9.1 Backend

- [x] Environment-based config (Mongo URI, DB name, CORS origins, log level, `LOG_FORMAT`, `DOCS_ENABLED`)
- [x] MongoDB connection pooling (Motor defaults); graceful client close on shutdown
- [x] Indexes created on application startup (documented in `backend/README.md`)
- [x] Structured logging: `LOG_FORMAT=json` for JSON lines; default text; HTTP access log (method, path, status, duration) **without** query/body/headers — **request correlation IDs not implemented**
- [x] OpenAPI (`/docs`, `/redoc`) when `DOCS_ENABLED=true`; disable in prod via env
- [ ] Rate limiting: **omitted** for this assignment scope (documented in `backend/README.md`)

### 9.2 Frontend

- [x] Production build pipeline documented (`frontend/README.md`, `npm run build` → `dist/`)
- [x] Environment-specific API URL (`VITE_API_URL` at build time)
- [x] Basic accessibility: labels on inputs, keyboard operability for core flows

### 9.3 Deployment

| Component | Allowed platforms | Notes |
|-----------|-------------------|--------|
| Frontend | **Vercel** or **Netlify** | SPA fallback to `index.html` configured |
| Backend | **Render** or **Railway** | Set env vars; bind `0.0.0.0` and correct port |
| Database | MongoDB Atlas or provider’s Mongo addon | TLS connection string in secret store |

**CORS:** Allow only the deployed frontend origin(s) in production.

---

## 10. Bonus Features (Optional)

Implement **only after** core flows are stable. Each bonus item should include tests or manual QA notes.

| ID | Feature | Technical notes |
|----|---------|-----------------|
| B1 | Filter attendance by date / range | Use `GET` query params; backend validates range |
| B2 | Total present days per employee | `GET` aggregate endpoint or computed field in employee detail response |
| B3 | Dashboard summary | e.g. counts: employees, records this month, present vs absent totals |

### 10.1 Implemented in this repository

| ID | What ships |
|----|------------|
| **B1** | `GET /api/employees/{employee_id}/attendance` accepts optional **`date`** (exact `YYYY-MM-DD`) **or** **`from` / `to`** (range). Combining `date` with `from`/`to` returns **422**. Attendance history UI uses **On date** vs **From / To** mutually exclusively. |
| **B2** | `GET /api/dashboard/employee-stats` returns per-employee **`present_days`** / **`absent_days`** (Mongo aggregation). Shown on the **`/dashboard`** page. |
| **B3** | `GET /api/dashboard/summary` returns **`employee_count`**, **`attendance_record_count`**, **`present_marks`**, **`absent_marks`**. Shown on **`/dashboard`**. |

---

## 11. Acceptance Criteria (Definition of Done)

### 11.1 Employee management

- [x] Admin can create an employee with all required fields; invalid data shows server errors clearly.
- [x] Duplicate `employee_id` cannot corrupt data; user sees a conflict message.
- [x] Employee list displays all persisted employees after refresh.
- [x] Admin can delete an employee; behavior matches documented cascade or restriction policy.

### 11.2 Attendance

- [x] Admin can mark attendance with date + present/absent for an existing employee.
- [x] Duplicate day policy (reject vs upsert) is implemented and documented (§13).
- [x] Admin can view historical attendance per employee; loading/empty/error states work.

### 11.3 Cross-cutting

- [x] All persistence goes through MongoDB (no in-memory-only mock in production build).
- [x] APIs return appropriate HTTP status codes and JSON error bodies.
- [x] Frontend is deployable to Vercel or Netlify (`frontend/README.md`, `vercel.json`, `public/_redirects`); backend to Render or Railway with documented env vars (`backend/README.md`).

---

## 12. Repository & Documentation Expectations

The repository should contain (as the project is built):

- **Root `README.md`** — short overview and quick start; **this specification** (`docs/SPECIFICATION.md`) — requirements source of truth.
- **`/backend`** (or equivalent) — FastAPI app, dependency files (`requirements.txt` or `pyproject.toml`), run instructions.
- **`/frontend`** (or equivalent) — React app, install/build/run instructions.
- **`.env.example`** files (no real secrets) listing required variables for each tier.
- **`docker-compose.yml`** at repo root for local MongoDB (see **Quickstart**).
- **`docs/DEPLOY.md`** — production deployment and smoke test checklist.
- **`render.yaml`** — optional Render Blueprint for the backend.

---

## 13. Open Decisions (Locked for This Repository)

These choices apply to all implementation work unless this section is explicitly revised.

| Topic | Options | Chosen |
|-------|---------|--------|
| Employee delete + attendance | Cascade delete vs block delete | **Cascade delete** — deleting an employee removes all `attendance` documents with the same `employee_id`. |
| Attendance duplicate day | Reject (`409`) vs upsert (`200`) | **Upsert** — `POST /api/attendance` creates a record or updates `status` for the same `(employee_id, date)`; returns **201** on first insert and **200** on update. |
| Date storage | ISO date string vs UTC midnight datetime | **ISO `YYYY-MM-DD` string** in JSON and stored as the same string in MongoDB for `attendance.date` (single canonical form for API and queries). |
| Email uniqueness | Enforced vs warning-only | **Enforced** — unique index on `email`; duplicate returns **409 Conflict**. |
| API path prefix | `/api/...` vs versioned `/api/v1/...` | **`/api`** — resource paths are `/api/employees`, `/api/attendance`, etc. (no `/v1` segment). |

### 13.1 Implementation decisions (reviewer summary)

**Delete:** `DELETE /api/employees/{employee_id}` returns **204 No Content** on success and cascades to attendance. **Attendance:** duplicate calendar days are handled by upsert with **201**/**200** as above; invalid or unknown `employee_id` must not create orphan rows (**404** preferred for unknown employee on mark). **Dates:** all client and persisted attendance dates use **`YYYY-MM-DD`**. **Employees:** `email` and `employee_id` are unique; duplicates return **409**. **Routing:** all REST resources live under the **`/api`** prefix consistent with §5.

---

## 14. Glossary

| Term | Meaning |
|------|---------|
| **Admin** | Implicit single user; no login |
| **Employee ID** | Business identifier stored as `employee_id` |
| **Attendance record** | One `(employee_id, date, status)` tuple in persistent storage |

---

*This specification is derived from the assignment brief “Full-Stack Coding Assignment – HRMS Lite” and extends it with production-oriented constraints suitable for end-to-end implementation.*
