"""Liveness and readiness (SPECIFICATION §5.1)."""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app import db

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    """Process is up; does not require MongoDB."""
    return {"status": "ok"}


@router.get("/health/ready")
async def health_ready() -> JSONResponse:
    """MongoDB reachable; 503 when URI unset or ping fails."""
    if db.get_database() is None:
        return JSONResponse(
            status_code=503,
            content={"status": "unavailable", "detail": "Database not configured"},
        )
    if not await db.ping_database():
        return JSONResponse(
            status_code=503,
            content={"status": "unavailable", "detail": "Database ping failed"},
        )
    return JSONResponse(status_code=200, content={"status": "ready"})
