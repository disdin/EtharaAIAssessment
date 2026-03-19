"""HRMS Lite API — FastAPI application entrypoint."""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from app.config import Settings, cors_origin_list
from app import db
from app.logging_config import configure_logging
from app.routers import attendance, dashboard, employees, health

settings = Settings()

_request_log = logging.getLogger("app.request")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    configure_logging(level_name=settings.log_level, log_format=settings.log_format)
    await db.connect(settings.mongodb_uri, settings.mongodb_db_name)
    yield
    await db.disconnect()


docs_url = "/docs" if settings.docs_enabled else None
redoc_url = "/redoc" if settings.docs_enabled else None
openapi_url = "/openapi.json" if settings.docs_enabled else None

app = FastAPI(
    title="HRMS Lite API",
    version="0.1.0",
    description="Human Resource Management System (lite) — API contracts: docs/SPECIFICATION.md.",
    lifespan=lifespan,
    docs_url=docs_url,
    redoc_url=redoc_url,
    openapi_url=openapi_url,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origin_list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(employees.router, prefix="/api")
app.include_router(attendance.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")


@app.middleware("http")
async def request_access_log(request: Request, call_next) -> Response:
    """Log method, path, status, duration — no query string, body, or headers (PII-safe)."""
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 2)
    _request_log.info(
        "%s %s -> %s %sms",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


@app.middleware("http")
async def internal_error_guard(request: Request, call_next) -> Response:
    """Avoid leaking tracebacks; let FastAPI handle HTTPException / validation as usual."""
    try:
        return await call_next(request)
    except Exception:
        logging.getLogger(__name__).exception("Unhandled error")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "hrms-lite-api", "docs": "/docs" if settings.docs_enabled else "disabled"}
