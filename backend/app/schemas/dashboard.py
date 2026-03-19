"""Dashboard / stats response models (SPECIFICATION §10 bonus)."""

from pydantic import BaseModel, Field


class DashboardSummaryOut(BaseModel):
    employee_count: int = Field(ge=0)
    attendance_record_count: int = Field(ge=0)
    present_marks: int = Field(ge=0)
    absent_marks: int = Field(ge=0)


class EmployeeAttendanceStatOut(BaseModel):
    employee_id: str
    full_name: str
    department: str
    present_days: int = Field(ge=0)
    absent_days: int = Field(ge=0)
