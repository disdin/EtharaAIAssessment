# HRMS Lite — deployment runbook (Step 9)

Deploy **backend** (Render or Railway), **frontend** (Vercel or Netlify), and **MongoDB** (Atlas or host add-on). Allowed stacks match [`SPECIFICATION.md`](SPECIFICATION.md) §9.3.

---

## 1. MongoDB Atlas (or equivalent)

1. Create a cluster (M10 free tier is fine for demos).
2. **Database access:** create a user with **read/write** on the target database only.
3. **Network access:** allow **`0.0.0.0/0`** for a quick demo, or restrict to Render/Railway outbound IPs / private networking if your provider supports it.
4. Copy the **SRV connection string** (TLS). Example shape:  
   `mongodb+srv://USER:PASS@cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority`
5. Choose a database name (e.g. `hrms_lite`) — set `MONGODB_DB_NAME` on the API to match, or embed the DB name in the URI.

---

## 2. Backend — Render.com

1. **New Web Service** → connect this Git repo.
2. **Root directory:** `backend`
3. **Runtime:** Python 3.11+
4. **Build command:** `pip install -r requirements.txt`
5. **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. **Health check path:** `/health` (optional readiness: `/health/ready` if your plan supports it)
7. **Environment variables:**

| Key | Example / notes |
|-----|-------------------|
| `MONGODB_URI` | Atlas SRV string (URL-encode password if it has special chars) |
| `MONGODB_DB_NAME` | `hrms_lite` |
| `CORS_ORIGINS` | **Only** your frontend origin(s), comma-separated, no spaces, e.g. `https://your-app.vercel.app` |
| `DOCS_ENABLED` | `false` in production if you want to hide `/docs` |
| `LOG_LEVEL` | `INFO` |
| `LOG_FORMAT` | `json` recommended on Render logs |

8. Deploy; note the **HTTPS** service URL (e.g. `https://hrms-lite-api.onrender.com`).

**Optional:** use the repo root [`render.yaml`](../render.yaml) as a **Blueprint** and then set secrets (`MONGODB_URI`, etc.) in the dashboard.

---

## 3. Backend — Railway.app

1. **New project** → **Deploy from GitHub** (this repo).
2. Add a **service**; set **root directory** to `backend` (or deploy only the `backend` folder per Railway UI).
3. **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`  
   Railway injects `PORT`.
4. **Variables:** same as Render table above.
5. **Healthcheck:** path `/health` if the UI offers it.

If you use the included [`backend/railway.toml`](../backend/railway.toml), adjust to match Railway’s current schema if the dashboard warns.

---

## 4. Frontend — Vercel

1. **Import** the Git repo; set **Root Directory** to `frontend`.
2. **Framework preset:** Vite (or “Other” with build `npm run build`, output `dist`).
3. **Environment variables (Production):**

| Key | Value |
|-----|--------|
| `VITE_API_URL` | Your **backend HTTPS URL** with **no** trailing slash, e.g. `https://hrms-lite-api.onrender.com` |

4. Redeploy after changing `VITE_API_URL` (it is baked in at **build** time).

[`frontend/vercel.json`](../frontend/vercel.json) already rewrites SPA routes to `index.html`.

---

## 5. Frontend — Netlify

1. **New site from Git** → base directory `frontend`.
2. **Build command:** `npm run build`
3. **Publish directory:** `dist`
4. **Environment → Build:** `VITE_API_URL` = backend HTTPS URL (no trailing slash).

[`frontend/netlify.toml`](../frontend/netlify.toml) and [`frontend/public/_redirects`](../frontend/public/_redirects) configure SPA fallback.

---

## 6. CORS checklist

- Backend `CORS_ORIGINS` must include the **exact** browser origin (scheme + host, no path), e.g. `https://my-app.netlify.app`.
- Multiple origins: comma-separated, **no spaces**: `https://a.com,https://b.com`
- After changing CORS, **restart/redeploy** the API.

---

## 7. Smoke test (deployed stack)

Run in the browser against the **production** frontend URL:

1. Open **Employees** → create an employee (valid email).
2. Refresh → employee still listed.
3. Try duplicate ID or email → **409** message in UI.
4. **Attendance** → mark **Present** for today → success message.
5. Same day → mark **Absent** → should **update** (upsert); history shows latest status.
6. **Attendance history** → filter with **From/To** if desired.
7. **Employees** → **Delete** → confirm cascade copy → employee gone; history for that ID empty or N/A.
8. **Dashboard** (`/dashboard`) → summary cards load without error; **Per employee** table shows rows (present/absent day counts can be **0** until you mark attendance).
9. **Attendance history** → set **On date** to the day you marked → only that day’s rows (or empty if none); clear **On date** and use **From/To** again to confirm range filters still work (**On date** and **From/To** are mutually exclusive in the UI and API).

If any step fails, check browser **Network** tab for CORS, **4xx/5xx**, and Render/Railway logs.

**Optional (API only):** with a known `employee_id`, `GET /api/dashboard/summary` and `GET /api/dashboard/employee-stats` should return **200** when Mongo is up; `GET /api/employees/{employee_id}/attendance?date=YYYY-MM-DD` should return **200** (and **422** if you pass `date` together with `from` or `to`).

---

## 8. Acceptance (SPECIFICATION §11)

When the smoke test passes on the deployed URLs, Step **9.4–9.5** are satisfied for your environment. Keep notes (URLs redacted) for reviewers.

---

## Troubleshooting

| Symptom | Likely fix |
|---------|------------|
| CORS error in browser | Add exact frontend origin to `CORS_ORIGINS`; redeploy API |
| `/health/ready` 503 | `MONGODB_URI` wrong, Atlas IP allowlist, or wrong password encoding |
| Frontend calls `localhost` in prod | Set `VITE_API_URL` on the **hosting** build settings and rebuild |
| 404 on `/employees` direct URL | SPA rewrite (`vercel.json` / `netlify.toml` / `_redirects`) missing or misconfigured |
