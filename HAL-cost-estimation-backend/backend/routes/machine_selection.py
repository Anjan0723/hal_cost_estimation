from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from ..db import get_db
from ..models.models import MachineSelection
from ..schemas.schemas import MachineSelectionCreate, MachineSelectionOut
from ..models.models import Machine
router = APIRouter(prefix="/machine-selection", tags=["Machine Selection"])

@router.post("/", response_model=MachineSelectionOut)
def create(data: MachineSelectionCreate, db: Session = Depends(get_db)):
    obj = MachineSelection(**data.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.get("/", response_model=list[MachineSelectionOut])
def get_all(db: Session = Depends(get_db)):
    return db.query(MachineSelection).options(
        joinedload(MachineSelection.machine).joinedload(Machine.operation_type),
        joinedload(MachineSelection.dimension),
        joinedload(MachineSelection.duty),
        joinedload(MachineSelection.material)
    ).all()

@router.get("/{id}", response_model=MachineSelectionOut)
def get_one(id: int, db: Session = Depends(get_db)):
    obj = db.query(MachineSelection).options(
        joinedload(MachineSelection.machine).joinedload(Machine.operation_type),
        joinedload(MachineSelection.dimension),
        joinedload(MachineSelection.duty),
        joinedload(MachineSelection.material)
    ).filter(MachineSelection.id == id).first()
    if not obj:
        raise HTTPException(404, "Machine Selection not found")
    return obj

@router.put("/{id}", response_model=MachineSelectionOut)
def update(id: int, data: MachineSelectionCreate, db: Session = Depends(get_db)):
    obj = db.get(MachineSelection, id)
    if not obj:
        raise HTTPException(404, "Machine Selection not found")
    for k, v in data.dict().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/{id}")
def delete(id: int, db: Session = Depends(get_db)):
    obj = db.get(MachineSelection, id)
    if not obj:
        raise HTTPException(404, "Machine Selection not found")
    db.delete(obj)
    db.commit()
    return {"message": "Deleted successfully"}