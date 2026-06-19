from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from models.auction import Auction

class FavoriteCreate(BaseModel):
    auction_id: str
    notes: Optional[str] = None

class FavoriteUpdate(BaseModel):
    notes: Optional[str] = None

class Favorite(BaseModel):
    id: str
    user_id: str
    auction_id: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    auction: Optional[Auction] = None

    model_config = {"from_attributes": True}
