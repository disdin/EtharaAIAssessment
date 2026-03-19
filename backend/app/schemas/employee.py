"""Employee schemas (SPECIFICATION §4.1, §5.2)."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class EmployeeCreate(BaseModel):
    employee_id: str = Field(..., max_length=64)
    full_name: str = Field(..., max_length=200)
    email: EmailStr
    department: str = Field(..., max_length=100)

    @field_validator("employee_id", "full_name", "department", mode="before")
    @classmethod
    def strip_text(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("email", mode="before")
    @classmethod
    def strip_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v

    @model_validator(mode="after")
    def non_empty_after_trim(self) -> EmployeeCreate:
        if not self.employee_id:
            raise ValueError("employee_id cannot be empty")
        if not self.full_name:
            raise ValueError("full_name cannot be empty")
        if not self.department:
            raise ValueError("department cannot be empty")
        return self

    def normalized_email(self) -> str:
        return self.email.lower()


class EmployeeOut(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        ser_json_by_alias=True,
    )

    id: str = Field(..., alias="_id", description="MongoDB ObjectId as string")
    employee_id: str
    full_name: str
    email: str
    department: str
    created_at: datetime
    updated_at: datetime
