from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..models.models import Material
from ..schemas.schemas import MaterialCreate, MaterialOut

router = APIRouter(prefix="/materials", tags=["Materials"])

@router.post("/", response_model=MaterialOut)
def create(data: MaterialCreate, db: Session = Depends(get_db)):
    obj = Material(**data.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.get("/", response_model=list[MaterialOut])
def get_all(db: Session = Depends(get_db)):
    return db.query(Material).all()

@router.get("/{id}", response_model=MaterialOut)
def get_one(id: int, db: Session = Depends(get_db)):
    obj = db.get(Material, id)
    if not obj:
        raise HTTPException(404, "Material not found")
    return obj

@router.put("/{id}", response_model=MaterialOut)
def update(id: int, data: MaterialCreate, db: Session = Depends(get_db)):
    obj = db.get(Material, id)
    if not obj:
        raise HTTPException(404, "Material not found")
    obj.name = data.name
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/{id}")
def delete(id: int, db: Session = Depends(get_db)):
    obj = db.get(Material, id)
    if not obj:
        raise HTTPException(404, "Material not found")
    db.delete(obj)
    db.commit()
    return {"message": "Deleted successfully"}
