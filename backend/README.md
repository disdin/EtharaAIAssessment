# HRMS Lite — Backend (FastAPI)

REST API for employees and attendance. Full contracts: [`docs/SPECIFICATION.md`](../docs/SPECIFICATION.md). Overview: root [`README.md`](../README.md).

## Requirements

- **Python 3.11+**
- **MongoDB** (local, Docker, or Atlas). If `MONGODB_URI` is empty or the server cannot connect, the process still starts: `GET /health` returns **200**, `GET /health/ready` returns **503**, and `/api/*` routes that need the DB return **503**.

## Install

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # edit values
```

## Configuration (environment variables)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Recommended | MongoDB connection string. Empty = API runs without DB. |
| `MONGODB_DB_NAME` | No | Database name (default `hrms_lite`). |
| `CORS_ORIGINS` | No | Comma-separated allowed browser origins (no spaces). |
| `LOG_LEVEL` | No | `DEBUG`, `INFO`, `WARNING`, … (default `INFO`). |
| `LOG_FORMAT` | No | `text` (default) or `json` — JSON emits one structured object per line. |
| `DOCS_ENABLED` | No | `true`/`false` — when `false`, `/docs`, `/redoc`, and `/openapi.json` are disabled. |

**Production:** set `CORS_ORIGINS` to your deployed frontend origin only; use TLS Mongo URI; set `DOCS_ENABLED=false` if you do not want public OpenAPI.

## Run (development)

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- `GET /health` — liveness  
- `GET /health/ready` — MongoDB ping  
- `GET /docs` — Swagger UI when `DOCS_ENABLED=true`

## Run (production-style)

Bind all interfaces and use the platform `PORT` (Render / Railway):

```bash
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

## MongoDB indexes (startup)

On successful connection, the app ensures (idempotent):

| Collection | Index |
|------------|--------|
| `employees` | unique `employee_id` |
| `employees` | unique `email` |
| `attendance` | unique compound `(employee_id, date)` |

`date` is stored as **`YYYY-MM-DD`** string. See [`SPECIFICATION.md`](../docs/SPECIFICATION.md) §4.

## Connection pooling & shutdown

**Motor** uses the driver’s default connection pool. The app closes the client on process shutdown (lifespan).

## Logging & observability

- **Startup / DB:** `app.db` logs connection outcome and index creation.
- **HTTP:** `app.request` logs `METHOD path -> status duration_ms` — **path only** (no query string, body, or headers) to avoid PII in logs.
- **Errors:** Unhandled exceptions log a full traceback server-side; clients receive `{"detail": "Internal server error"}` (**500**).
- **Correlation IDs:** not implemented in this scope.

## Error format (API)

- **422** — FastAPI/Pydantic `detail` (string or list of `{loc, msg, …}`).
- **404** / **409** / **503** — `{"detail": "<message>"}`.
- **500** — generic `detail` as above.

No custom `{ "errors": [] }` envelope.

## Rate limiting

**Not implemented** — acceptable for this assignment; put a reverse proxy or API gateway in front in production if needed.

## API summary

### Employees — `/api/employees`

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/employees` | **200**, `created_at` descending |
| `POST` | `/api/employees` | **201**; **422** / **409** |
| `DELETE` | `/api/employees/{employee_id}` | **204**; cascade attendance; **404** |

### Attendance

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/api/attendance` | **201** / **200** upsert; **404** / **422** |
| `GET` | `/api/employees/{employee_id}/attendance` | **200**; optional **`date`** (single day) **or** `from`/`to` (range) — not both; **404** / **422** |

### Dashboard — `/api/dashboard` *(SPECIFICATION §10 bonus)*

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/dashboard/summary` | **200** — global counts (employees, attendance rows, present/absent marks). |
| `GET` | `/api/dashboard/employee-stats` | **200** — per-employee `present_days` / `absent_days` (aggregation). |

Emails are stored **lowercased**. JSON responses use **`_id`** (string) for Mongo document ids.

## Project layout

| Path | Role |
|------|------|
| `app/main.py` | App, CORS, middleware, routers |
| `app/config.py` | Settings |
| `app/logging_config.py` | Text vs JSON logging |
| `app/db.py` | Motor client, indexes |
| `app/deps.py` | `require_db` |
| `app/routers/` | `health`, `employees`, `attendance`, `dashboard` |
| `app/schemas/` | Pydantic models |

## Local MongoDB via Docker

From the **repository root**:

```bash
docker compose up -d
```

Use `MONGODB_URI=mongodb://localhost:27017` in `backend/.env`. See root [`README.md`](../README.md) Quick start.

Implementation sequence: [`../docs/IMPLEMENTATION_STEPS.md`](../docs/IMPLEMENTATION_STEPS.md).

**Deploy (Render / Railway / Vercel / Netlify / Atlas):** [`../docs/DEPLOY.md`](../docs/DEPLOY.md). Optional Railway config: [`railway.toml`](railway.toml).
