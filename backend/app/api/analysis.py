from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.call import Call
from ..models.analysis import Analysis
from ..schemas.analysis import AnalysisResponse
from ..services.risk_engine import risk_engine

router = APIRouter(tags=["analysis"])

@router.post("/calls/{id}/analyze", response_model=AnalysisResponse)
def analyze_call(id: str, db: Session = Depends(get_db)):
    call = db.query(Call).filter(Call.id == id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    caller_turns = [t["text"] for t in (call.transcript or []) if t.get("role") == "caller"]
    latest_text = caller_turns[-1] if caller_turns else "No caller statement"

    eval_result = risk_engine.evaluate(
        caller_text=latest_text,
        conversation_history=call.transcript or [],
        caller_number=call.caller_number
    )

    analysis = db.query(Analysis).filter(Analysis.call_id == id).first()
    if not analysis:
        analysis = Analysis(call_id=id)
        db.add(analysis)

    analysis.risk_score = eval_result["risk_score"]
    analysis.risk_level = eval_result["risk_level"]
    analysis.intent = eval_result["intent"]
    analysis.scam_category = eval_result["scam_category"]
    analysis.signals = eval_result["signals"]
    analysis.explanation = eval_result["explanation"]
    analysis.recommended_action = eval_result["recommended_action"]

    db.commit()
    db.refresh(analysis)
    return analysis
