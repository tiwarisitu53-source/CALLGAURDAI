from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime

from ..database.connection import get_db
from ..models.call import Call
from ..models.analysis import Analysis
from ..schemas.call import CallScreenRequest, CallResponse, ConversationStepRequest, UserFeedbackRequest
from ..services.call_screening_service import call_screening_service
from ..services.conversation_service import conversation_service

router = APIRouter(prefix="/calls", tags=["calls"])

@router.post("/screen")
def screen_call(request: CallScreenRequest, db: Session = Depends(get_db)):
    result = call_screening_service.screen_incoming_number(request.caller_number)
    call_id = f"call-{uuid.uuid4().hex[:8]}"

    status = "BLOCKED_LAYER1" if result["action"] == "BLOCK" else "SCREENING"
    rep = result["reputation"]

    call = Call(
        id=call_id,
        caller_number=request.caller_number,
        caller_name=request.caller_name or ("Spammer Flagged" if status == "BLOCKED_LAYER1" else "Incoming Caller"),
        status=status,
        source=request.source or "simulator",
        reputation_score=rep.get("score", 0),
        reputation_category=rep.get("category"),
        transcript=[
            {
                "id": "init-1",
                "role": "system",
                "text": f"Incoming call screened at Layer 1: {rep.get('category')} (Score: {rep.get('score')})",
                "timestamp": datetime.utcnow().isoformat()
            }
        ]
    )
    if status == "SCREENING":
        call.transcript.append({
            "id": "init-2",
            "role": "assistant",
            "text": "Hello, this is CallGuard automated call screener. Who is calling and what is the purpose of your call?",
            "timestamp": datetime.utcnow().isoformat()
        })

    db.add(call)
    db.commit()
    db.refresh(call)
    return call

@router.get("", response_model=List[CallResponse])
def get_calls(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Call)
    if status:
        query = query.filter(Call.status == status)
    return query.order_by(Call.created_at.desc()).all()

@router.get("/{id}", response_model=CallResponse)
def get_call(id: str, db: Session = Depends(get_db)):
    call = db.query(Call).filter(Call.id == id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    return call

@router.post("/{id}/feedback")
def submit_feedback(id: str, feedback_req: UserFeedbackRequest, db: Session = Depends(get_db)):
    call = db.query(Call).filter(Call.id == id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    return {"status": "feedback_recorded", "call_id": id, "feedback": feedback_req.feedback}
