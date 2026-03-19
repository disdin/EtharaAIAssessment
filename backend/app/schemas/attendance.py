"""Attendance schemas (SPECIFICATION §4.2, §5.3, §13 upsert)."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AttendanceMark(BaseModel):
    employee_id: str = Field(..., max_length=64)
    date: date
    status: Literal["present", "absent"]

    @field_validator("employee_id", mode="before")
    @classmethod
    def strip_employee_id(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("employee_id")
    @classmethod
    def non_empty_id(cls, v: str) -> str:
        if not v:
            raise ValueError("employee_id cannot be empty")
        return v


class AttendanceOut(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        ser_json_by_alias=True,
    )

    id: str = Field(..., alias="_id")
    employee_id: str
    date: str
    status: Literal["present", "absent"]
    created_at: datetime
    updated_at: datetime
