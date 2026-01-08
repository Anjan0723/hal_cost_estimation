from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..models.models import OperationType
from ..schemas.schemas import OperationTypeCreate, OperationTypeOut

router = APIRouter(prefix="/operation-type", tags=["Operation Type"])

@router.post("/", response_model=OperationTypeOut)
def create(data: OperationTypeCreate, db: Session = Depends(get_db)):
    obj = OperationType(**data.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.get("/", response_model=list[OperationTypeOut])
def get_all(db: Session = Depends(get_db)):
    return db.query(OperationType).all()

@router.get("/{id}", response_model=OperationTypeOut)
def get_one(id: int, db: Session = Depends(get_db)):
    obj = db.get(OperationType, id)
    if not obj:
        raise HTTPException(404, "Operation Type not found")
    return obj

@router.put("/{id}", response_model=OperationTypeOut)
def update(id: int, data: OperationTypeCreate, db: Session = Depends(get_db)):
    obj = db.get(OperationType, id)
    if not obj:
        raise HTTPException(404, "Operation Type not found")
    obj.operation_name = data.operation_name
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/{id}")
def delete(id: int, db: Session = Depends(get_db)):
    obj = db.get(OperationType, id)
    if not obj:
        raise HTTPException(404, "Operation Type not found")
    db.delete(obj)
    db.commit()
    return {"message": "Deleted successfully"}
