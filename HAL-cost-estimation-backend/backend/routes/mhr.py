from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from ..db import get_db
from ..models.models import MHR, Machine
from ..schemas.schemas import MHRCreate, MHROut
from ..services.cost_calculation_service import CostCalculationService
router = APIRouter(prefix="/mhr", tags=["MHR"])

@router.post("/", response_model=MHROut)
def create(data: MHRCreate, db: Session = Depends(get_db)):
    obj = MHR(**data.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.get("/", response_model=list[MHROut])
def get_all(db: Session = Depends(get_db)):
    return db.query(MHR).options(
        joinedload(MHR.operation_type),
        joinedload(MHR.duty),
        joinedload(MHR.machine)
    ).all()

@router.get("/{id}", response_model=MHROut)
def get_one(id: int, db: Session = Depends(get_db)):
    obj = db.query(MHR).options(
        joinedload(MHR.operation_type),
        joinedload(MHR.duty),
        joinedload(MHR.machine)
    ).filter(MHR.id == id).first()
    if not obj:
        raise HTTPException(404, "MHR not found")
    return obj

@router.put("/{id}", response_model=MHROut)
def update(id: int, data: MHRCreate, db: Session = Depends(get_db)):
    obj = db.get(MHR, id)
    if not obj:
        raise HTTPException(404, "MHR not found")
    for k, v in data.dict().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/{id}")
def delete(id: int, db: Session = Depends(get_db)):
    obj = db.get(MHR, id)
    if not obj:
        raise HTTPException(404, "MHR not found")
    db.delete(obj)
    db.commit()
    return {"message": "Deleted successfully"}


class MHRCalculateIn(BaseModel):
    investment_cost: float
    power_rating_kw: float
    available_hours_per_annum: float
    machine_category: str


@router.post("/calculate", response_model=dict)
def calculate_mhr_from_inputs(
    payload: MHRCalculateIn,
    db: Session = Depends(get_db)
):
    """
    Calculate MHR using methodology formulas
    
    Formula:
    P = KW Rating * 5 (power charges per hour)
    U = Available hours per Year - Down Time (7% conventional, 15% CNC)
    M = (I * 10% / U) + P (machine utilization cost per hour)
    B = M * 1.05 (total machine hour rate with 5% maintenance)
    """
    service = CostCalculationService(db)

    investment_cost = payload.investment_cost
    power_rating_kw = payload.power_rating_kw
    available_hours_per_annum = payload.available_hours_per_annum
    machine_category = payload.machine_category
    
    # Calculate downtime based on machine category
    if machine_category.lower() == "conventional":
        downtime_rate = service.CONVENTIONAL_DOWNTIME_RATE  # 7%
    else:
        downtime_rate = service.CNC_DOWNTIME_RATE  # 15%
    
    # Calculate utilization hours (U)
    downtime_hours = available_hours_per_annum * downtime_rate
    utilization_hours = available_hours_per_annum - downtime_hours
    
    # Calculate power charges per hour (P)
    power_charges_per_hour = power_rating_kw * service.POWER_RATE_PER_UNIT
    
    # Calculate machine utilization cost per hour (M)
    depreciation_per_hour = (investment_cost * service.ANNUAL_DEPRECIATION_RATE) / utilization_hours
    machine_utilization_cost_per_hour = depreciation_per_hour + power_charges_per_hour
    
    # Calculate total machine hour rate (B)
    total_mhr = machine_utilization_cost_per_hour * (1 + service.MAINTENANCE_RATE)
    
    return {
        "investment_cost": investment_cost,
        "power_rating_kw": power_rating_kw,
        "available_hours_per_annum": available_hours_per_annum,
        "machine_category": machine_category,
        "downtime_rate": downtime_rate,
        "downtime_hours": round(downtime_hours, 2),
        "utilization_hours": round(utilization_hours, 2),
        "power_charges_per_hour": round(power_charges_per_hour, 2),
        "depreciation_per_hour": round(depreciation_per_hour, 2),
        "machine_utilization_cost_per_hour": round(machine_utilization_cost_per_hour, 2),
        "maintenance_rate": service.MAINTENANCE_RATE,
        "total_machine_hour_rate": round(total_mhr, 2),
        "calculation_steps": {
            "step_1_power_charges": f"P = {power_rating_kw} kW × 5 Rs/unit = {power_charges_per_hour:.2f} Rs/hour",
            "step_2_utilization": f"U = {available_hours_per_annum} - ({downtime_rate*100}% of {available_hours_per_annum}) = {utilization_hours:.2f} hours",
            "step_3_depreciation": f"Depreciation = ({investment_cost} × 10%) / {utilization_hours:.2f} = {depreciation_per_hour:.2f} Rs/hour",
            "step_4_machine_utilization": f"M = {depreciation_per_hour:.2f} + {power_charges_per_hour:.2f} = {machine_utilization_cost_per_hour:.2f} Rs/hour",
            "step_5_total_mhr": f"B = {machine_utilization_cost_per_hour:.2f} × 1.05 = {total_mhr:.2f} Rs/hour"
        }
    }