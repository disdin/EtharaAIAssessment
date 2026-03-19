<div align="center">

# HRMS Lite

A compact **Human Resource Management** web app: employees, daily attendance, and a simple analytics dashboard — styled like an internal admin tool.

[![FastAPI](https://img.shields.io/badge/API-FastAPI-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/UI-React_19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/DB-MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![TypeScript](https://img.shields.io/badge/Code-TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[Features](#features) · [Quick start](#quick-start) · [Deploy](#deploy) · [Docs](#documentation)

</div>

---

## Features

| | |
|--|--|
| **Employees** | Add, list, and remove staff (`employee_id`, name, email, department). Unique IDs and emails; delete **cascades** attendance. |
| **Attendance** | Mark **present / absent** per calendar day (**upsert**). History with **single-day** or **from–to** filters. |
| **Dashboard** | Summary counts plus **per-employee** present vs absent day totals (MongoDB aggregations). |

Single implicit **admin** — no authentication (demo / learning scope).

---

## Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite 5, React Router 7 |
| **Backend** | Python 3.11+, FastAPI, Motor, Pydantic |
| **Database** | MongoDB (Docker locally or Atlas in production) |

---

## Quick start

**You need:** Node 18+, Python 3.11+, and MongoDB (or [Docker](https://docs.docker.com/get-docker/) for the bundled `docker-compose.yml`).

```bash
# MongoDB (optional one-liner at repo root)
docker compose up -d
```

```bash
# Backend — from ./backend (use a venv; see backend/README.md)
cp .env.example .env          # set MONGODB_URI, e.g. mongodb://localhost:27017
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

```bash
# Frontend — from ./frontend
cp .env.example .env          # VITE_API_URL=http://127.0.0.1:8000
npm install
npm run dev
```

Open the URL Vite prints (typically **http://localhost:5173**). API docs: **http://127.0.0.1:8000/docs** when `DOCS_ENABLED=true`.

---

## Deploy

Step-by-step hosting, CORS, and smoke tests: **[`docs/DEPLOY.md`](docs/DEPLOY.md)**  
Optional **Render** blueprint: [`render.yaml`](render.yaml).

---

## Documentation

| Document | Contents |
|----------|----------|
| [`backend/README.md`](backend/README.md) | Run commands, environment variables, REST overview |
| [`frontend/README.md`](frontend/README.md) | Build pipeline, `VITE_API_URL`, Vercel / Netlify |
| [`docs/SPECIFICATION.md`](docs/SPECIFICATION.md) | Full API contract, data model, acceptance criteria |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | Production deployment runbook |
| [`docs/IMPLEMENTATION_STEPS.md`](docs/IMPLEMENTATION_STEPS.md) | Incremental build checklist *(optional read)* |

---

## Project layout

```
EtharaAIAssessment/
├── backend/           FastAPI app (`app/`, `requirements.txt`)
├── frontend/          React SPA (`src/`, Vite config)
├── docs/              Specification, deploy guide, implementation notes
├── docker-compose.yml Local MongoDB
└── render.yaml        Optional Render service template
```

---

<div align="center">

<sub>Full-stack exercise — HRMS Lite assignment implementation.</sub>

</div>
