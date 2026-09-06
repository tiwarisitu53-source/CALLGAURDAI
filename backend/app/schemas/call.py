from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from datetime import datetime
from .analysis import AnalysisResponse

class CallScreenRequest(BaseModel):
    caller_number: str
    caller_name: Optional[str] = None
    source: Optional[str] = "simulator"

class TranscriptMessage(BaseModel):
    id: str
    role: str  # caller, assistant, system
    text: str
    timestamp: str

class CallResponse(BaseModel):
    id: str
    caller_number: str
    caller_name: Optional[str] = None
    status: str
    source: str
    reputation_score: int
    reputation_category: Optional[str] = None
    transcript: List[Dict[str, Any]] = []
    duration_sec: int
    created_at: datetime
    analysis: Optional[AnalysisResponse] = None

    class Config:
        from_attributes = True

class ConversationStepRequest(BaseModel):
    call_id: str
    caller_utterance: str

class UserFeedbackRequest(BaseModel):
    feedback: str  # CONFIRMED_SPAM, FALSE_POSITIVE, LEGITIMATE
