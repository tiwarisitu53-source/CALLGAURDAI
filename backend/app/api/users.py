from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.user import User
from pydantic import BaseModel

router = APIRouter(prefix="/users", tags=["users"])

class UserCreate(BaseModel):
    phone_number: str
    name: str = ""
    screening_mode: str = "ADAPTIVE"

@router.get("/me")
def get_current_user(db: Session = Depends(get_db)):
    user = db.query(User).first()
    if not user:
        user = User(phone_number="+15551234567", name="Demo User", screening_mode="ADAPTIVE")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
