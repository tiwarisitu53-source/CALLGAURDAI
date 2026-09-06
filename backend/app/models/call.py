from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database.connection import Base

class Call(Base):
    __tablename__ = "calls"

    id = Column(String, primary_key=True, index=True)
    caller_number = Column(String, index=True, nullable=False)
    caller_name = Column(String, nullable=True)
    status = Column(String, default="SCREENING")  # INCOMING, BLOCKED_LAYER1, SCREENING, CONNECTED, BLOCKED_AI
    source = Column(String, default="simulator")  # android, twilio, simulator
    reputation_score = Column(Integer, default=0)
    reputation_category = Column(String, nullable=True)
    transcript = Column(JSON, default=list)
    duration_sec = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    analysis = relationship("Analysis", back_populates="call", uselist=False)
