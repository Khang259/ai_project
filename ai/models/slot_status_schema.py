from pydantic import BaseModel, Field
from datetime import datetime

class SlotStatusModel(BaseModel):
    qr_code: int
    is_blocked: bool
    timestamp: datetime = Field(default_factory=datetime.now)