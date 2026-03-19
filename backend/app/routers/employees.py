"""Employee REST API under /api/employees (SPECIFICATION §5.2, §13 cascade delete, 204)."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.deps import require_db
from app.schemas.employee import EmployeeCreate, EmployeeOut

router = APIRouter(prefix="/employees", tags=["employees"])


def _doc_to_out(doc: dict) -> EmployeeOut:
    return EmployeeOut(
        _id=str(doc["_id"]),
        employee_id=doc["employee_id"],
        full_name=doc["full_name"],
        email=doc["email"],
        department=doc["department"],
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


@router.get("", response_model=list[EmployeeOut])
async def list_employees(
    database: AsyncIOMotorDatabase = Depends(require_db),
) -> list[EmployeeOut]:
    """List all employees, newest `created_at` first (SPECIFICATION §5.2)."""
    cursor = database.employees.find().sort("created_at", -1)
    docs = await cursor.to_list(length=10_000)
    return [_doc_to_out(d) for d in docs]


@router.post("", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
async def create_employee(
    body: EmployeeCreate,
    database: AsyncIOMotorDatabase = Depends(require_db),
) -> EmployeeOut:
    now = datetime.now(timezone.utc)
    email_norm = body.normalized_email()
    doc = {
        "employee_id": body.employee_id,
        "full_name": body.full_name,
        "email": email_norm,
        "department": body.department,
        "created_at": now,
        "updated_at": now,
    }
    try:
        result = await database.employees.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An employee with this employee_id or email already exists",
        ) from None
    stored = await database.employees.find_one({"_id": result.inserted_id})
    assert stored is not None
    return _doc_to_out(stored)


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(
    employee_id: str,
    database: AsyncIOMotorDatabase = Depends(require_db),
) -> Response:
    """Cascade-delete attendance for this business id, then employee (SPECIFICATION §13)."""
    existing = await database.employees.find_one({"employee_id": employee_id})
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )
    await database.attendance.delete_many({"employee_id": employee_id})
    await database.employees.delete_one({"_id": existing["_id"]})
    return Response(status_code=status.HTTP_204_NO_CONTENT)
