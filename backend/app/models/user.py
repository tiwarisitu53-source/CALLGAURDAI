from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from ..database.connection import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    screening_mode = Column(String, default="ADAPTIVE")  # STRICT, ADAPTIVE, PERMISSIVE
    created_at = Column(DateTime, default=datetime.utcnow)
