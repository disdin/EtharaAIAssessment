"""MongoDB client, database handle, and indexes (SPECIFICATION §4)."""

from __future__ import annotations

import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# Set by lifespan; optional when MONGODB_URI is empty (liveness-only dev).
_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


def get_client() -> AsyncIOMotorClient | None:
    return _client


def get_database() -> AsyncIOMotorDatabase | None:
    return _db


async def connect(uri: str, db_name: str) -> None:
    """Attach to MongoDB when URI is set; never block API startup if connection fails."""
    global _client, _db
    if not uri.strip():
        _client = None
        _db = None
        logger.warning(
            "MONGODB_URI is empty — /health works; /health/ready reports unavailable.",
        )
        return
    client: AsyncIOMotorClient | None = None
    try:
        client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=5000)
        await client.admin.command("ping")
        _client = client
        _db = client[db_name]
        await ensure_indexes(_db)
        logger.info("Connected to MongoDB database %s", db_name)
    except Exception:
        logger.exception("MongoDB connection failed at startup; running without database.")
        if client is not None:
            client.close()
        _client = None
        _db = None


async def disconnect() -> None:
    global _client, _db
    if _client is not None:
        _client.close()
    _client = None
    _db = None


async def ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    """Create indexes on startup; MongoDB treats re-creation with same spec as no-op."""
    await db.employees.create_index("employee_id", unique=True, name="uniq_employee_id")
    await db.employees.create_index("email", unique=True, name="uniq_email")
    await db.attendance.create_index(
        [("employee_id", 1), ("date", 1)],
        unique=True,
        name="uniq_employee_id_date",
    )
    logger.info("MongoDB indexes ensured (employees, attendance).")


async def ping_database() -> bool:
    if _client is None or _db is None:
        return False
    try:
        await _client.admin.command("ping")
        return True
    except Exception:
        logger.exception("MongoDB ping failed")
        return False
