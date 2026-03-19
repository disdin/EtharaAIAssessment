"""Dashboard aggregates (SPECIFICATION §10 B2, B3)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.deps import require_db
from app.schemas.dashboard import DashboardSummaryOut, EmployeeAttendanceStatOut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryOut)
async def dashboard_summary(
    database: AsyncIOMotorDatabase = Depends(require_db),
) -> DashboardSummaryOut:
    """Global counts for a lightweight admin dashboard."""
    employee_count = await database.employees.count_documents({})
    attendance_record_count = await database.attendance.count_documents({})
    present_marks = await database.attendance.count_documents({"status": "present"})
    absent_marks = await database.attendance.count_documents({"status": "absent"})
    return DashboardSummaryOut(
        employee_count=employee_count,
        attendance_record_count=attendance_record_count,
        present_marks=present_marks,
        absent_marks=absent_marks,
    )


@router.get("/employee-stats", response_model=list[EmployeeAttendanceStatOut])
async def employee_attendance_stats(
    database: AsyncIOMotorDatabase = Depends(require_db),
) -> list[EmployeeAttendanceStatOut]:
    """Per-employee present vs absent day counts (one doc = one day)."""
    pipeline = [
        {
            "$lookup": {
                "from": "attendance",
                "let": {"eid": "$employee_id"},
                "pipeline": [
                    {"$match": {"$expr": {"$eq": ["$employee_id", "$$eid"]}}},
                ],
                "as": "atts",
            },
        },
        {
            "$project": {
                "_id": 0,
                "employee_id": 1,
                "full_name": 1,
                "department": 1,
                "present_days": {
                    "$size": {
                        "$filter": {
                            "input": "$atts",
                            "as": "a",
                            "cond": {"$eq": ["$$a.status", "present"]},
                        },
                    },
                },
                "absent_days": {
                    "$size": {
                        "$filter": {
                            "input": "$atts",
                            "as": "a",
                            "cond": {"$eq": ["$$a.status", "absent"]},
                        },
                    },
                },
            },
        },
        {"$sort": {"employee_id": 1}},
    ]
    cursor = database.employees.aggregate(pipeline)
    rows = await cursor.to_list(length=10_000)
    return [EmployeeAttendanceStatOut.model_validate(r) for r in rows]
