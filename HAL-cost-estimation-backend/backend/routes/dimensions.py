from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..models.models import Dimension
from ..schemas.schemas import DimensionCreate, DimensionOut

router = APIRouter(prefix="/dimensions", tags=["Dimensions"])

@router.post("/", response_model=DimensionOut)
def create(data: DimensionCreate, db: Session = Depends(get_db)):
    obj = Dimension(**data.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.get("/", response_model=list[DimensionOut])
def get_all(db: Session = Depends(get_db)):
    return db.query(Dimension).all()

@router.get("/{id}", response_model=DimensionOut)
def get_one(id: int, db: Session = Depends(get_db)):
    obj = db.get(Dimension, id)
    if not obj:
        raise HTTPException(404, "Dimension not found")
    return obj

@router.put("/{id}", response_model=DimensionOut)
def update(id: int, data: DimensionCreate, db: Session = Depends(get_db)):
    obj = db.get(Dimension, id)
    if not obj:
        raise HTTPException(404, "Dimension not found")
    obj.name = data.name
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/{id}")
def delete(id: int, db: Session = Depends(get_db)):
    obj = db.get(Dimension, id)
    if not obj:
        raise HTTPException(404, "Dimension not found")
    db.delete(obj)
    db.commit()
    return {"message": "Deleted successfully"}
