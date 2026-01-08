from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db import Base

# -------------------------------------------------
# OPERATION TYPE
# -------------------------------------------------
class OperationType(Base):
    __tablename__ = "operation_type"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    operation_name = Column(String, nullable=False)

    machines = relationship("Machine", back_populates="operation_type")
    mhr = relationship("MHR", back_populates="operation_type")


# -------------------------------------------------
# MACHINES
# -------------------------------------------------
class Machine(Base):
    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    op_id = Column(Integer, ForeignKey("operation_type.id"))

    operation_type = relationship("OperationType", back_populates="machines")
    machine_selections = relationship("MachineSelection", back_populates="machine")
    mhr = relationship("MHR", back_populates="machine")


# -------------------------------------------------
# DIMENSIONS
# -------------------------------------------------
class Dimension(Base):
    __tablename__ = "dimensions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)

    machine_selections = relationship("MachineSelection", back_populates="dimension")


# -------------------------------------------------
# DUTIES
# -------------------------------------------------
class Duty(Base):
    __tablename__ = "duties"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)

    machine_selections = relationship("MachineSelection", back_populates="duty")
    mhr = relationship("MHR", back_populates="duty")


# -------------------------------------------------
# MATERIALS
# -------------------------------------------------
class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)

    machine_selections = relationship("MachineSelection", back_populates="material")


# -------------------------------------------------
# MACHINE SELECTION
# -------------------------------------------------
class MachineSelection(Base):
    __tablename__ = "machine_selection"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    machine_id = Column(Integer, ForeignKey("machines.id"))
    dimension_id = Column(Integer, ForeignKey("dimensions.id"))
    duty_id = Column(Integer, ForeignKey("duties.id"))
    material_id = Column(Integer, ForeignKey("materials.id"))
    size = Column(String, nullable=True)

    machine = relationship("Machine", back_populates="machine_selections")
    dimension = relationship("Dimension", back_populates="machine_selections")
    duty = relationship("Duty", back_populates="machine_selections")
    material = relationship("Material", back_populates="machine_selections")


# -------------------------------------------------
# MHR (Machine Hour Rate)
# -------------------------------------------------
class MHR(Base):
    __tablename__ = "mhr"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    op_type_id = Column(Integer, ForeignKey("operation_type.id"))
    duty_id = Column(Integer, ForeignKey("duties.id"))
    machine_id = Column(Integer, ForeignKey("machines.id"))

    # Machine Hour Rate calculation components
    investment_cost = Column(String)  # Investment cost of machine
    elect_power_rating = Column(String)  # Power rating in kW
    elect_power_charges = Column(String)  # Power charges per hour
    available_hrs_per_annum = Column(String)  # Available hours per year
    utilization_hrs_year = Column(String)  # Actual utilization hours
    machine_hr_rate = Column(String)  # Final machine hour rate
    
    # Additional fields for complete calculation
    

    operation_type = relationship("OperationType", back_populates="mhr")
    duty = relationship("Duty", back_populates="mhr")
    machine = relationship("Machine", back_populates="mhr")


# -------------------------------------------------
# USER
# -------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# -------------------------------------------------
# NON-RECURRING COSTS (NRC)
# -------------------------------------------------
class NRC(Base):
    __tablename__ = "nrc"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(Integer, nullable=True)  # Link to project if needed
    
    # NRC Components
    tooling_cost = Column(String, default="0.0")
    development_cost = Column(String, default="0.0")
    cnc_programming_cost = Column(String, default="0.0")
    special_process_cost = Column(String, default="0.0")  # Heat treatment, welding, etc.
    other_nrc_cost = Column(String, default="0.0")
    
    # Amortization details
    ordered_quantity = Column(String, default="1")
    amortize_over_quantity = Column(String, nullable=True)  # If different from ordered
    
    # Calculated fields
    total_nrc = Column(String, default="0.0")
    nrc_per_unit = Column(String, default="0.0")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# -------------------------------------------------
# MATERIAL COSTS
# -------------------------------------------------
class MaterialCost(Base):
    __tablename__ = "material_costs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(Integer, nullable=True)  # Link to project if needed
    
    # Material details
    material_type = Column(String, nullable=False)  # aluminium, steel, titanium, etc.
    shape = Column(String, nullable=False)  # round, rectangular
    
    # Dimensions (stored as JSON string)
    dimensions = Column(String, nullable=False)  # {"diameter": 100, "length": 200}
    
    # Cost details
    material_cost_per_kg = Column(String, nullable=False)
    is_hal_free_issue = Column(Boolean, default=True)
    
    # Calculated fields
    volume_cm3 = Column(String, default="0.0")
    material_weight_kg = Column(String, default="0.0")
    material_cost_per_unit = Column(String, default="0.0")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# -------------------------------------------------
# COST ESTIMATION RECORDS
# -------------------------------------------------
class CostEstimation(Base):
    __tablename__ = "cost_estimations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(Integer, nullable=True)
    
    # Basic cost components
    total_man_hours_per_unit = Column(String, default="0.0")
    total_machine_cost_per_unit = Column(String, default="0.0")
    total_labor_cost_per_unit = Column(String, default="0.0")
    basic_cost_per_unit = Column(String, default="0.0")
    
    # Additional cost components
    overheads_per_unit = Column(String, default="0.0")
    profit_per_unit = Column(String, default="0.0")
    packing_forwarding_per_unit = Column(String, default="0.0")
    nrc_per_unit = Column(String, default="0.0")
    material_cost_per_unit = Column(String, default="0.0")
    miscellaneous_amount = Column(String, default="0.0")
    
    # Final costs
    unit_cost_before_extras = Column(String, default="0.0")
    total_unit_cost = Column(String, default="0.0")
    total_cost = Column(String, default="0.0")
    outsourcing_mhr = Column(String, default="0.0")
    
    # Quantity
    quantity = Column(String, default="1")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
