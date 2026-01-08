from pydantic import BaseModel
from typing import Optional

# -------------------------------------------------
# OPERATION TYPE
# -------------------------------------------------
class OperationTypeBase(BaseModel):
    operation_name: str

class OperationTypeCreate(OperationTypeBase):
    pass

class OperationTypeOut(OperationTypeBase):
    id: int
    
    class Config:
        from_attributes = True


# -------------------------------------------------
# DIMENSION
# -------------------------------------------------
class DimensionBase(BaseModel):
    name: str

class DimensionCreate(DimensionBase):
    pass

class DimensionOut(DimensionBase):
    id: int
    
    class Config:
        from_attributes = True


# -------------------------------------------------
# DUTY
# -------------------------------------------------
class DutyBase(BaseModel):
    name: str

class DutyCreate(DutyBase):
    pass

class DutyOut(DutyBase):
    id: int
    
    class Config:
        from_attributes = True


# -------------------------------------------------
# MATERIAL
# -------------------------------------------------
class MaterialBase(BaseModel):
    name: str

class MaterialCreate(MaterialBase):
    pass

class MaterialOut(MaterialBase):
    id: int
    
    class Config:
        from_attributes = True


# -------------------------------------------------
# MACHINE
# -------------------------------------------------
class MachineBase(BaseModel):
    name: str
    op_id: Optional[int] = None  # ✅ CHANGED: Made optional

class MachineCreate(MachineBase):
    pass

class MachineOut(MachineBase):
    id: int
    operation_type: Optional[OperationTypeOut] = None
    
    class Config:
        from_attributes = True


# -------------------------------------------------
# MACHINE SELECTION
# -------------------------------------------------
class MachineSelectionBase(BaseModel):
    machine_id: Optional[int] = None      # ✅ CHANGED: Made optional
    dimension_id: Optional[int] = None    # ✅ CHANGED: Made optional
    duty_id: Optional[int] = None         # ✅ CHANGED: Made optional
    material_id: Optional[int] = None     # ✅ CHANGED: Made optional
    size: Optional[str] = None

class MachineSelectionCreate(MachineSelectionBase):
    pass

class MachineSelectionOut(MachineSelectionBase):
    id: int
    machine: Optional[MachineOut] = None
    dimension: Optional[DimensionOut] = None
    duty: Optional[DutyOut] = None
    material: Optional[MaterialOut] = None
    
    class Config:
        from_attributes = True


# -------------------------------------------------
# MHR (Machine Hour Rate)
# -------------------------------------------------
class MHRBase(BaseModel):
    op_type_id: Optional[int] = None      # ✅ CHANGED: Made optional
    duty_id: Optional[int] = None         # ✅ CHANGED: Made optional
    machine_id: Optional[int] = None      # ✅ CHANGED: Made optional
    investment_cost: Optional[str] = None
    elect_power_rating: Optional[str] = None
    elect_power_charges: Optional[str] = None
    available_hrs_per_annum: Optional[str] = None
    utilization_hrs_year: Optional[str] = None
    machine_hr_rate: Optional[str] = None

class MHRCreate(MHRBase):
    pass

class MHROut(MHRBase):
    id: int
    operation_type: Optional[OperationTypeOut] = None
    duty: Optional[DutyOut] = None
    machine: Optional[MachineOut] = None
    
    class Config:
        from_attributes = True