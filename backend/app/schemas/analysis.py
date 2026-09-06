from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class AnalysisBase(BaseModel):
    risk_score: int = Field(..., ge=0, le=100)
    risk_level: str  # LOW, MEDIUM, HIGH
    intent: str
    scam_category: str
    signals: List[str] = []
    explanation: str
    recommended_action: str  # CONNECT, SCREEN_FURTHER, BLOCK

class AnalysisCreate(AnalysisBase):
    call_id: str

class AnalysisResponse(AnalysisBase):
    id: int
    call_id: str
    created_at: datetime

    class Config:
        from_attributes = True
