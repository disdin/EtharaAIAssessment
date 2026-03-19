"""Shared FastAPI dependencies."""

from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app import db as db_module


async def require_db() -> AsyncIOMotorDatabase:
    database = db_module.get_database()
    if database is None:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        )
    return database
