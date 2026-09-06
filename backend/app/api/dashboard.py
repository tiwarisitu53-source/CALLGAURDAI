from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.call import Call
from ..models.analysis import Analysis

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total = db.query(Call).count()
    blocked_l1 = db.query(Call).filter(Call.status == "BLOCKED_LAYER1").count()
    blocked_ai = db.query(Call).filter(Call.status == "BLOCKED_AI").count()
    connected = db.query(Call).filter(Call.status == "CONNECTED").count()
    screening = db.query(Call).filter(Call.status == "SCREENING").count()

    analyses = db.query(Analysis).all()
    avg_score = round(sum(a.risk_score for a in analyses) / len(analyses)) if analyses else 0

    signals_map = {}
    category_map = {}
    for a in analyses:
        for s in (a.signals or []):
            signals_map[s] = signals_map.get(s, 0) + 1
        cat = a.scam_category or "Other"
        category_map[cat] = category_map.get(cat, 0) + 1

    return {
        "total_calls": total,
        "safe_calls": connected,
        "suspicious_calls": screening,
        "blocked_calls": blocked_l1 + blocked_ai,
        "avg_risk_score": avg_score,
        "layer1_blocked": blocked_l1,
        "layer2_blocked": blocked_ai,
        "signals_frequency": signals_map,
        "category_distribution": category_map
    }
