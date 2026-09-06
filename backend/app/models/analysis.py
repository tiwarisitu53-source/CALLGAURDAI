from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database.connection import Base

class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(String, ForeignKey("calls.id"), unique=True, nullable=False)
    risk_score = Column(Integer, nullable=False)
    risk_level = Column(String, nullable=False)  # LOW, MEDIUM, HIGH
    intent = Column(String, nullable=True)
    scam_category = Column(String, nullable=True)
    signals = Column(JSON, default=list)
    explanation = Column(Text, nullable=True)
    recommended_action = Column(String, nullable=False)  # CONNECT, SCREEN_FURTHER, BLOCK
    created_at = Column(DateTime, default=datetime.utcnow)

    call = relationship("Call", back_populates="analysis")
