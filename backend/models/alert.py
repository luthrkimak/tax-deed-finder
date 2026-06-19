from __future__ import annotations
import re
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, field_validator

class AlertCreate(BaseModel):
    filters: dict[str, Any]
    email: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        pattern = r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, v):
            raise ValueError("Invalid email address")
        return v.lower().strip()

class AlertUpdate(BaseModel):
    active: Optional[bool] = None
    filters: Optional[dict[str, Any]] = None

class Alert(BaseModel):
    id: str
    user_id: str
    filters: dict[str, Any]
    email: str
    active: bool = True
    last_sent_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
