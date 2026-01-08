from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from ..db import get_db
from ..models.models import Machine
from ..schemas.schemas import MachineCreate, MachineOut

router = APIRouter(prefix="/machines", tags=["Machines"])

@router.post("/", response_model=MachineOut)
def create(data: MachineCreate, db: Session = Depends(get_db)):
    obj = Machine(**data.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.get("/", response_model=list[MachineOut])
def get_all(db: Session = Depends(get_db)):
    return db.query(Machine).options(joinedload(Machine.operation_type)).all()

@router.get("/{id}", response_model=MachineOut)
def get_one(id: int, db: Session = Depends(get_db)):
    obj = db.query(Machine).options(joinedload(Machine.operation_type)).filter(Machine.id == id).first()
    if not obj:
        raise HTTPException(404, "Machine not found")
    return obj

@router.put("/{id}", response_model=MachineOut)
def update(id: int, data: MachineCreate, db: Session = Depends(get_db)):
    obj = db.get(Machine, id)
    if not obj:
        raise HTTPException(404, "Machine not found")
    obj.name = data.name
    obj.op_id = data.op_id
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/{id}")
def delete(id: int, db: Session = Depends(get_db)):
    obj = db.get(Machine, id)
    if not obj:
        raise HTTPException(404, "Machine not found")
    db.delete(obj)
    db.commit()
    return {"message": "Deleted successfully"}