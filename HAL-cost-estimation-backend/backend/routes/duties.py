from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..models.models import Duty
from ..schemas.schemas import DutyCreate, DutyOut

router = APIRouter(prefix="/duties", tags=["Duties"])

@router.post("/", response_model=DutyOut)
def create(data: DutyCreate, db: Session = Depends(get_db)):
    obj = Duty(**data.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.get("/", response_model=list[DutyOut])
def get_all(db: Session = Depends(get_db)):
    return db.query(Duty).all()

@router.get("/{id}", response_model=DutyOut)
def get_one(id: int, db: Session = Depends(get_db)):
    obj = db.get(Duty, id)
    if not obj:
        raise HTTPException(404, "Duty not found")
    return obj

@router.put("/{id}", response_model=DutyOut)
def update(id: int, data: DutyCreate, db: Session = Depends(get_db)):
    obj = db.get(Duty, id)
    if not obj:
        raise HTTPException(404, "Duty not found")
    obj.name = data.name
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/{id}")
def delete(id: int, db: Session = Depends(get_db)):
    obj = db.get(Duty, id)
    if not obj:
        raise HTTPException(404, "Duty not found")
    db.delete(obj)
    db.commit()
    return {"message": "Deleted successfully"}
