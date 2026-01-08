from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from enum import Enum

# -------------------------------------------------
# ENUMS
# -------------------------------------------------
class ShapeType(str, Enum):
    ROUND = "round"
    RECTANGULAR = "rectangular"

class MaterialType(str, Enum):
    ALUMINIUM = "aluminium"
    STEEL = "steel"
    TITANIUM = "titanium"

class OperationType(str, Enum):
    TURNING = "turning"
    MILLING = "milling"
    DRILLING = "drilling"
    GRINDING = "grinding"
    BORING = "boring"
    HEAT_TREATMENT = "heat_treatment"
    WELDING = "welding"
    SURFACE_TREATMENT = "surface_treatment"

class MachineCategory(str, Enum):
    CONVENTIONAL = "conventional"
    CNC_3AXIS = "cnc_3axis"
    CNC_5AXIS = "cnc_5axis"
    SPM = "spm"

class DutyCategory(str, Enum):
    LIGHT = "light"
    MEDIUM = "medium"
    HEAVY = "heavy"

# -------------------------------------------------
# DIMENSIONS (Now supports both round and rectangular)
# -------------------------------------------------
class ComponentDimensions(BaseModel):
    # For round parts (turning, boring, drilling)
    diameter: Optional[float] = Field(None, gt=0, description="Diameter in mm (required for turning/boring)")
    
    # Common to all
    length: float = Field(..., gt=0, description="Length in mm (always required)")
    
    # For rectangular parts (milling, grinding, etc.)
    breadth: Optional[float] = Field(None, gt=0, description="Breadth/Width in mm (required for milling/grinding)")
    height: Optional[float] = Field(None, gt=0, description="Height in mm (required for milling/grinding)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "diameter": 50,
                "length": 200,
                "breadth": None,
                "height": None
            }
        }

# -------------------------------------------------
# COST ESTIMATION REQUEST
# -------------------------------------------------
class CostEstimationRequest(BaseModel):
    # Material & Operations (moved up so we can validate dimensions based on operation)
    material: MaterialType = Field(..., description="Material type: aluminium, steel, titanium")
    operation_type: OperationType = Field(..., description="Operation: turning, milling, drilling, etc.")
    
    # Dimensions (validated based on operation_type)
    dimensions: ComponentDimensions = Field(..., description="Component dimensions - varies by operation type")
    
    # Machine Selection (REQUIRED)
    machine_name: str = Field(..., description="Machine name from machines table")
    
    # Required Input
    man_hours_per_unit: float = Field(..., gt=0, description="Man-hours required per unit (A)")
    
    # Duty (optional - will use defaults if not provided)
    duty_category: Optional[DutyCategory] = Field(None, description="Optional: light, medium, heavy")
    
    # Miscellaneous amount (optional - additional costs)
    miscellaneous_amount: Optional[float] = Field(0, ge=0, description="Optional miscellaneous amount to add to total cost")

    @field_validator('dimensions')
    @classmethod
    def validate_dimensions_by_operation(cls, v, info):
        """Validate dimensions based on operation type"""
        operation = info.data.get('operation_type')
        
        if not operation:
            return v
        
        # Operations that require round dimensions (diameter + length)
        round_operations = ['turning', 'boring']
        
        # Operations that require rectangular dimensions (length + breadth + height)
        rectangular_operations = ['milling', 'grinding', 'surface_treatment']
        
        if operation.value in round_operations:
            # Must have diameter and length, should NOT have breadth and height
            if v.diameter is None:
                raise ValueError(f"For {operation.value} operation, 'diameter' is required")
            if v.breadth is not None or v.height is not None:
                raise ValueError(f"For {operation.value} operation, only 'diameter' and 'length' are needed (round part)")
        
        elif operation.value in rectangular_operations:
            # Must have length, breadth, and height, should NOT have diameter
            if v.breadth is None or v.height is None:
                raise ValueError(f"For {operation.value} operation, 'length', 'breadth', and 'height' are required")
            if v.diameter is not None:
                raise ValueError(f"For {operation.value} operation, only 'length', 'breadth', and 'height' are needed (rectangular part)")
        
        else:
            # For drilling, welding, heat_treatment - allow both types
            # Check that either (diameter + length) OR (length + breadth + height) is provided
            has_round = v.diameter is not None
            has_rectangular = v.breadth is not None and v.height is not None
            
            if not (has_round or has_rectangular):
                raise ValueError(f"For {operation.value} operation, provide either (diameter + length) for round parts OR (length + breadth + height) for rectangular parts")
            
            if has_round and has_rectangular:
                raise ValueError(f"For {operation.value} operation, provide EITHER round dimensions (diameter + length) OR rectangular dimensions (length + breadth + height), not both")
        
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "material": "steel",
                "operation_type": "turning",
                "dimensions": {
                    "diameter": 50,
                    "length": 200
                },
                "machine_name": "CNC Lathe",
                "man_hours_per_unit": 0.5
            }
        }

# -------------------------------------------------
# COST BREAKDOWN RESPONSE
# -------------------------------------------------
class CostBreakdown(BaseModel):
    # Input Values
    man_hours_per_unit: float = Field(..., description="A - Man-hours per unit (input)")
    machine_hour_rate: float = Field(..., description="B - Machine Hour Rate in ₹/hr (from database or default)")
    wage_rate: float = Field(..., description="C - Wage Rate in ₹/hr (based on machine category)")
    
    # Calculated Costs
    basic_cost_per_unit: float = Field(..., description="D = A × (B + C) - Basic manufacturing cost")
    overheads_per_unit: float = Field(..., description="OH = C × A - Overhead cost (100% of wage)")
    profit_per_unit: float = Field(..., description="Profit = 10% of (D + OH)")
    packing_forwarding_per_unit: float = Field(..., description="P&F = 2% of D")
    
    # Final Costs
    unit_cost: float = Field(..., description="Total = D + OH + Profit + P&F")
    total_unit_cost_with_misc: float = Field(..., description="Total unit cost including miscellaneous amount")
    
    # Additional Info
    outsourcing_mhr: float = Field(..., description="Outsourcing MHR = B + 2C")
    miscellaneous_amount: float = Field(0, description="Miscellaneous amount added to total cost")

class CostEstimationResponse(BaseModel):
    # Classification Results
    duty_category: DutyCategory = Field(..., description="Duty classification: light, medium, or heavy")
    selected_machine: dict = Field(..., description="Selected machine details (id, name, operation_type)")
    machine_category: MachineCategory = Field(..., description="Machine type used for calculation")
    
    # Component Info
    shape: str = Field(..., description="Auto-detected shape: round or rectangular")
    dimensions: dict = Field(..., description="Component dimensions")
    volume: Optional[float] = Field(None, description="Calculated volume in mm³")
    
    # Cost Details
    cost_breakdown: CostBreakdown
    
    # Input Echo
    material: MaterialType
    operation_type: OperationType
    
    # Calculation Explanation
    calculation_steps: dict = Field(..., description="Step-by-step calculation breakdown")

    class Config:
        json_schema_extra = {
            "example": {}
        }