"""Attendance REST API (SPECIFICATION §5.3): POST /api/attendance, GET .../attendance."""

from __future__ import annotations

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.deps import require_db
from app.schemas.attendance import AttendanceMark, AttendanceOut

router = APIRouter(tags=["attendance"])


def _doc_to_out(doc: dict) -> AttendanceOut:
    return AttendanceOut(
        _id=str(doc["_id"]),
        employee_id=doc["employee_id"],
        date=doc["date"],
        status=doc["status"],
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


async def _ensure_employee_exists(
    database: AsyncIOMotorDatabase,
    employee_id: str,
) -> None:
    found = await database.employees.find_one({"employee_id": employee_id})
    if found is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )


@router.post("/attendance")
async def mark_attendance(
    body: AttendanceMark,
    database: AsyncIOMotorDatabase = Depends(require_db),
) -> JSONResponse:
    """Upsert one row per (employee_id, date): **201** insert, **200** update (SPECIFICATION §13)."""
    await _ensure_employee_exists(database, body.employee_id)
    date_str = body.date.isoformat()
    now = datetime.now(timezone.utc)

    existing = await database.attendance.find_one(
        {"employee_id": body.employee_id, "date": date_str},
    )
    if existing is not None:
        await database.attendance.update_one(
            {"_id": existing["_id"]},
            {"$set": {"status": body.status, "updated_at": now}},
        )
        doc = await database.attendance.find_one({"_id": existing["_id"]})
        assert doc is not None
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=_doc_to_out(doc).model_dump(mode="json", by_alias=True),
        )

    doc = {
        "employee_id": body.employee_id,
        "date": date_str,
        "status": body.status,
        "created_at": now,
        "updated_at": now,
    }
    try:
        result = await database.attendance.insert_one(doc)
    except DuplicateKeyError:
        await database.attendance.update_one(
            {"employee_id": body.employee_id, "date": date_str},
            {"$set": {"status": body.status, "updated_at": now}},
        )
        updated = await database.attendance.find_one(
            {"employee_id": body.employee_id, "date": date_str},
        )
        assert updated is not None
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=_doc_to_out(updated).model_dump(mode="json", by_alias=True),
        )

    stored = await database.attendance.find_one({"_id": result.inserted_id})
    assert stored is not None
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=_doc_to_out(stored).model_dump(mode="json", by_alias=True),
    )


@router.get("/employees/{employee_id}/attendance", response_model=list[AttendanceOut])
async def list_employee_attendance(
    employee_id: str,
    database: AsyncIOMotorDatabase = Depends(require_db),
    date_from: date | None = Query(None, alias="from"),
    date_to: date | None = Query(None, alias="to"),
    on_date: date | None = Query(None, alias="date"),
) -> list[AttendanceOut]:
    """List attendance for an employee, **date** descending.

    Filters (SPECIFICATION §5.3, §10 B1):

    - **`date`** — exact calendar day (`YYYY-MM-DD`). Mutually exclusive with `from`/`to`.
    - **`from` / `to`** — inclusive range on stored ISO date strings.
    """
    found = await database.employees.find_one({"employee_id": employee_id})
    if found is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )

    uses_range = date_from is not None or date_to is not None
    if on_date is not None and uses_range:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Use either query parameter 'date' or 'from'/'to', not both",
        )

    if date_from is not None and date_to is not None and date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Query parameter 'from' must be on or before 'to'",
        )

    query: dict = {"employee_id": employee_id}
    if on_date is not None:
        query["date"] = on_date.isoformat()
    elif date_from is not None or date_to is not None:
        rng: dict[str, str] = {}
        if date_from is not None:
            rng["$gte"] = date_from.isoformat()
        if date_to is not None:
            rng["$lte"] = date_to.isoformat()
        query["date"] = rng

    cursor = database.attendance.find(query).sort("date", -1)
    docs = await cursor.to_list(length=50_000)
    return [_doc_to_out(d) for d in docs]
