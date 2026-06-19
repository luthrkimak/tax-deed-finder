from __future__ import annotations
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel

class AlertCreate(BaseModel):
    filters: dict[str, Any]
    email: str

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
