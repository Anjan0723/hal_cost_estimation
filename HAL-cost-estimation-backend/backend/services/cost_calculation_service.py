from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models.models import MHR, Machine, Duty, OperationType as OperationTypeModel
from typing import Tuple, Optional

class CostCalculationService:
    """Service class for manufacturing cost calculations"""
    
    # Wage rate calculation constants
    CONVENTIONAL_OPERATOR_MONTHLY_WAGE = 15000.0
    CNC_OPERATOR_MONTHLY_WAGE = 20000.0
    HOURS_PER_MONTH_FOR_WAGE = 200.0
    
    # Machine Hour Rate calculation constants
    ANNUAL_DEPRECIATION_RATE = 0.10  # 10% of investment cost
    MAINTENANCE_RATE = 0.05  # 5% of machine utilization cost
    POWER_RATE_PER_UNIT = 5.0  # ₹5 per unit
    CONVENTIONAL_DOWNTIME_RATE = 0.07  # 7% downtime
    CNC_DOWNTIME_RATE = 0.15  # 15% downtime
    ANNUAL_WORKING_HOURS = 2400  # Standard annual working hours
    
    # Man-hours estimation based on operation and duty
    # Format: {operation: {duty: hours_per_unit}}
    MAN_HOURS_MATRIX = {
        "turning": {"light": 0.25, "medium": 0.5, "heavy": 1.0},
        "milling": {"light": 0.5, "medium": 1.0, "heavy": 2.0},
        "drilling": {"light": 0.15, "medium": 0.3, "heavy": 0.6},
        "grinding": {"light": 0.3, "medium": 0.6, "heavy": 1.2},
        "boring": {"light": 0.4, "medium": 0.8, "heavy": 1.5},
        "heat_treatment": {"light": 0.5, "medium": 1.0, "heavy": 2.0},
        "welding": {"light": 0.3, "medium": 0.6, "heavy": 1.2},
        "surface_treatment": {"light": 0.2, "medium": 0.4, "heavy": 0.8}
    }
    
    def __init__(self, db: Session):
        self.db = db
    
    def determine_duty_category(
        self, 
        shape: str, 
        dimensions: dict, 
        material: str,
        operation: str
    ) -> str:
        """
        Determine duty category based on dimensions, material, and operation
        """
        def _bump(d: str, steps: int) -> str:
            order = ["light", "medium", "heavy"]
            try:
                idx = order.index(d)
            except ValueError:
                idx = 0
            return order[min(len(order) - 1, max(0, idx + steps))]

        op = (operation or "").strip().lower()
        mat = (material or "").strip().lower()

        # Deterministic thresholds by geometry.
        # These are monotonic (bigger part => same or higher duty) to avoid surprising flips.
        base: Optional[str] = None

        if shape == "rectangular" and all(k in dimensions for k in ("length", "breadth", "height")):
            length = float(dimensions["length"])
            breadth = float(dimensions["breadth"])
            height = float(dimensions["height"])
            max_dim = max(length, breadth, height)

            # Rectangular operations (milling/grinding/surface treatment):
            # light  : up to 750 mm
            # medium : 751..1500 mm
            # heavy  : > 1500 mm
            if max_dim <= 750:
                base = "light"
            elif max_dim <= 1500:
                base = "medium"
            else:
                base = "heavy"

        elif shape == "round" and all(k in dimensions for k in ("diameter", "length")):
            diameter = float(dimensions["diameter"])
            length = float(dimensions["length"])

            if op in {"turning", "boring"}:
                if mat == "aluminium":
                    if diameter < 80 and length < 500:
                        base = "light"
                    elif diameter <= 150 and length <= 1000:
                        base = "medium"
                    else:
                        base = "heavy"
                elif mat == "steel":
                    if diameter < 50 and length < 200:
                        base = "light"
                    elif diameter <= 100 and length <= 500:
                        base = "medium"
                    else:
                        base = "heavy"
                elif mat == "titanium":
                    if diameter < 30 and length < 150:
                        base = "light"
                    elif diameter <= 60 and length <= 300:
                        base = "medium"
                    else:
                        base = "heavy"
                else:
                    if diameter < 80 and length < 500:
                        base = "light"
                    elif diameter <= 150 and length <= 1000:
                        base = "medium"
                    else:
                        base = "heavy"
            else:
                if diameter <= 100 and length <= 300:
                    base = "light"
                elif diameter <= 300 and length <= 1200:
                    base = "medium"
                else:
                    base = "heavy"

        if base is None:
            # Fallback to previous volume-based heuristic for unsupported shapes/inputs.
            if shape == "round":
                volume = 3.14159 * (dimensions["diameter"]/2)**2 * dimensions["length"]
            else:
                volume = dimensions["length"] * dimensions["breadth"] * dimensions["height"]

            material_factor = {
                "aluminium": 1.0,
                "steel": 3.0,
                "titanium": 1.7
            }.get(mat, 1.0)

            operation_factor = {
                "turning": 1.0,
                "milling": 1.5,
                "drilling": 0.8,
                "grinding": 1.2,
                "boring": 1.3,
                "heat_treatment": 2.0,
                "welding": 1.8,
                "surface_treatment": 1.0
            }.get(op, 1.0)

            score = (volume / 1000000) * material_factor * operation_factor

            if score < 5:
                base = "light"
            elif score < 20:
                base = "medium"
            else:
                base = "heavy"

        if mat in {"steel", "titanium"}:
            base = _bump(base, 1 if base == "light" else 0)
            if mat == "titanium" and base == "medium":
                base = _bump(base, 1)

        # Operation adjustment (conservative): some ops are inherently more demanding.
        if op in {"heat_treatment", "welding"}:
            base = _bump(base, 1)

        return base
    
    def select_machine(
        self,
        operation: str,
        duty: str,
        material: str,
        machine_category: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Select appropriate machine based on operation, duty, and material
        Returns: (machine_name, machine_category)
        """
        # If machine category is provided, use it
        if machine_category:
            category = machine_category
        else:
            # Auto-select based on duty and operation
            if duty == "heavy" or material == "titanium":
                category = "cnc_5axis"
            elif duty == "medium":
                category = "cnc_3axis"
            else:
                category = "conventional"
        
        # Machine naming based on operation and category
        # Updated to match actual database names
        machine_names = {
            "turning": {
                "conventional": "Conventional Lathe",
                "cnc_3axis": "CNC Lathe",
                "cnc_5axis": "CNC Lathe",
                "spm": "Special Purpose Lathe"
            },
            "milling": {
                "conventional": "Conv.Milling",
                "cnc_3axis": "CNC Mill",
                "cnc_5axis": "5 axis cnc",
                "spm": "Special Purpose Machine (SPM)"
            },
            "drilling": {
                "conventional": "Conventional Drill Press",
                "cnc_3axis": "CNC Drilling Machine",
                "cnc_5axis": "CNC Multi-Axis Drill",
                "spm": "Special Purpose Drill"
            },
            "grinding": {
                "conventional": "Conventional",
                "cnc_3axis": "CNC",
                "cnc_5axis": "Special Purpose Machine(SPM)",
                "spm": "Special Purpose Grinder"
            },
            "boring": {
                "conventional": "Small (less than 650 MMX 650 MM)",
                "cnc_3axis": "CNC",
                "cnc_5axis": "Medium (more than 650 MMX 650 MM)",
                "spm": "Special Purpose Boring"
            }
        }
        
        machine_name = machine_names.get(operation, {}).get(
            category, 
            f"{category.upper()} Machine"
        )
        
        return machine_name, category
    
    def get_machine_details(self, machine_name: str, db: Session) -> dict:
        """
        Get machine details from database by name
        """
        machine = db.query(Machine).filter(Machine.name == machine_name).first()
        if not machine:
            raise ValueError(f"Machine with name '{machine_name}' not found")
        
        return {
            "id": machine.id,
            "name": machine.name,
            "operation_type_id": machine.op_id
        }
    
    def determine_machine_category(self, machine_name: str) -> str:
        """
        Determine machine category from machine name
        """
        name_lower = machine_name.lower()
        
        if "cnc" in name_lower or "precision" in name_lower:
            if "5" in name_lower or "five" in name_lower or "5 axis" in name_lower or "5-axis" in name_lower:
                return "cnc_5axis"
            else:
                return "cnc_3axis"
        elif "spm" in name_lower or "special" in name_lower:
            return "spm"
        else:
            return "conventional"

    def get_wage_rate(self, machine_name: str) -> float:
        """Get Wage Rate (C) in ₹/hr based on selected machine.

        Wage Rate, C = Monthly wages / 200 (Rs/Hour)
        Conventional machine operators : 15000 per month
        CNC/Precision machine operators : 20000 per month
        """
        category = self.determine_machine_category(machine_name)
        if category == "conventional":
            monthly = self.CONVENTIONAL_OPERATOR_MONTHLY_WAGE
        else:
            monthly = self.CNC_OPERATOR_MONTHLY_WAGE
        return monthly / self.HOURS_PER_MONTH_FOR_WAGE
    
    def calculate_complete_machine_hour_rate(
        self,
        investment_cost: float,
        power_rating_kw: float,
        machine_category: str,
        available_hours_per_annum: Optional[float] = None
    ) -> float:
        """
        Calculate complete Machine Hour Rate (B) as per methodology
        
        Formula from methodology:
        1. Available Hours = Annual working hours (default 2400)
        2. Utilization Hours (U) = Available Hours - Downtime
        3. Power Charges per hour = Power Rating (kW) × ₹5/unit
        4. Machine Utilization Cost per hour (M) = (Investment × 10% / U) + Power Charges per hour
        5. Total MHR per hour = M × 1.05 (5% maintenance)
        
        Note: Power charges are per hour, not multiplied by working hours
        """
        if available_hours_per_annum is None:
            available_hours_per_annum = self.ANNUAL_WORKING_HOURS
        
        # Apply machine downtime to get utilization hours (U)
        if machine_category.lower() == "conventional":
            downtime_rate = self.CONVENTIONAL_DOWNTIME_RATE
        else:  # CNC machines
            downtime_rate = self.CNC_DOWNTIME_RATE
        
        utilization_hours = available_hours_per_annum * (1 - downtime_rate)
        
        # Electrical power charges per hour = kW rating × ₹5/unit
        # methodology shows power charges as per hour rate
        power_charges_per_hour = power_rating_kw * self.POWER_RATE_PER_UNIT
        
        # Calculate machine utilization cost per hour (M) = (Investment × 10% / U) + Power Charges per hour
        depreciation_cost_per_hour = (investment_cost * self.ANNUAL_DEPRECIATION_RATE) / utilization_hours
        machine_utilization_cost_per_hour = depreciation_cost_per_hour + power_charges_per_hour
        
        # Add 5% maintenance cost
        total_machine_hour_rate = machine_utilization_cost_per_hour * (1 + self.MAINTENANCE_RATE)
        
        return total_machine_hour_rate
    
    def get_machine_hour_rate(
        self,
        operation: str,
        duty: str,
        machine_name: str,
        db: Session,
        machine_id: Optional[int] = None,
        op_type_id: Optional[int] = None,
        duty_id: Optional[int] = None,
    ) -> float:
        """
        Fetch Machine Hour Rate from database or calculate default
        """
        def _to_float(v: Optional[str]) -> Optional[float]:
            if v is None:
                return None
            try:
                return float(str(v).strip())
            except (ValueError, TypeError):
                return None

        def _to_str(v: Optional[str]) -> str:
            return "" if v is None else str(v).strip()

        def _to_float_or_none(v: Optional[str]) -> Optional[float]:
            try:
                if v is None:
                    return None
                return float(str(v).strip())
            except (ValueError, TypeError):
                return None

        def _calculate_mhr_from_record(rec: MHR) -> Optional[float]:
            inv = _to_float(getattr(rec, "investment_cost", None))
            kw = _to_float(getattr(rec, "elect_power_rating", None))
            avail = _to_float(getattr(rec, "available_hrs_per_annum", None))
            category = self.determine_machine_category(machine_name)

            if inv is None or kw is None:
                return None
            # If available hours are missing, default to service constant.
            if avail is None or avail <= 0:
                avail = float(self.ANNUAL_WORKING_HOURS)

            downtime_rate = (
                self.CONVENTIONAL_DOWNTIME_RATE
                if category.lower() == "conventional"
                else self.CNC_DOWNTIME_RATE
            )

            utilization_hours = avail * (1 - downtime_rate)
            power_charges_per_hour = kw * self.POWER_RATE_PER_UNIT  # Per hour rate
            depreciation_cost_per_hour = (inv * self.ANNUAL_DEPRECIATION_RATE) / utilization_hours
            machine_utilization_cost_per_hour = depreciation_cost_per_hour + power_charges_per_hour

            total_machine_hour_rate = machine_utilization_cost_per_hour
            
            return total_machine_hour_rate

        def _category_bucket(cat: str) -> str:
            c = (cat or "").strip().lower()
            if c.startswith("cnc"):
                return "cnc"
            if c == "spm":
                return "spm"
            return "conventional"

        def _methodology_inputs(op: str, du: str, machine_cat: str) -> Optional[tuple[float, float, float, float]]:
            op_key = (op or "").strip().lower()
            du_key = (du or "").strip().lower()
            cat_key = _category_bucket(machine_cat)

            table: dict[tuple[str, str, str], tuple[float, float, float, float]] = {
                ("turning", "light", "conventional"): (2000000.0, 5.0, 3600.0, self.CONVENTIONAL_DOWNTIME_RATE),
                ("turning", "light", "cnc"): (5000000.0, 12.0, 4500.0, self.CNC_DOWNTIME_RATE),
                ("turning", "medium", "conventional"): (3000000.0, 8.0, 3600.0, self.CONVENTIONAL_DOWNTIME_RATE),
                ("turning", "medium", "cnc"): (6000000.0, 15.0, 4500.0, self.CNC_DOWNTIME_RATE),
                ("turning", "heavy", "conventional"): (5000000.0, 12.0, 3600.0, self.CONVENTIONAL_DOWNTIME_RATE),
                ("turning", "heavy", "cnc"): (10000000.0, 20.0, 4500.0, self.CNC_DOWNTIME_RATE),

                ("milling", "light", "conventional"): (3000000.0, 8.0, 3600.0, self.CONVENTIONAL_DOWNTIME_RATE),
                ("milling", "light", "cnc"): (6000000.0, 15.0, 4500.0, self.CNC_DOWNTIME_RATE),
                ("milling", "medium", "conventional"): (5000000.0, 10.0, 3600.0, self.CONVENTIONAL_DOWNTIME_RATE),
                ("milling", "medium", "cnc"): (7000000.0, 20.0, 4500.0, self.CNC_DOWNTIME_RATE),
                ("milling", "heavy", "conventional"): (6000000.0, 15.0, 3600.0, self.CONVENTIONAL_DOWNTIME_RATE),
                ("milling", "heavy", "cnc"): (12000000.0, 30.0, 4500.0, self.CNC_DOWNTIME_RATE),
            }

            return table.get((op_key, du_key, cat_key))

        def _norm(s: Optional[str]) -> str:
            if s is None:
                return ""
            out = s.strip().lower()
            out = out.replace("_", " ")
            out = out.replace("-", " ")
            out = " ".join(out.split())
            if out.endswith(" duty"):
                out = out[: -len(" duty")]
            return out

        def _resolve_duty_id(d: str) -> Optional[int]:
            d_norm = _norm(d)
            if not d_norm:
                return None
            try:
                duties = db.query(Duty).all()
            except Exception:
                return None
            for du in duties:
                if _norm(getattr(du, "name", None)) == d_norm:
                    return du.id
            return None

        # Prefer deterministic lookup by IDs (matches configuration table exactly)
        try:
            machine_category = self.determine_machine_category(machine_name)
            meth = _methodology_inputs(operation, duty, machine_category)
            if meth is not None:
                inv, kw, avail_hours, downtime_rate = meth
                utilization_hours = avail_hours * (1 - downtime_rate)
                power_charges_per_hour = kw * self.POWER_RATE_PER_UNIT
                depreciation_cost_per_hour = (inv * self.ANNUAL_DEPRECIATION_RATE) / utilization_hours
                machine_hour_rate = depreciation_cost_per_hour + power_charges_per_hour
                return float(machine_hour_rate)

            op_id = op_type_id
            if op_id is None and operation:
                op_row = (
                    db.query(OperationTypeModel)
                    .filter(func.lower(func.trim(OperationTypeModel.operation_name)) == operation.strip().lower())
                    .first()
                )
                op_id = op_row.id if op_row else None

            du_id = duty_id if duty_id is not None else _resolve_duty_id(duty)
            m_id = machine_id

            if op_id is not None and du_id is not None and m_id is not None:
                rec = (
                    db.query(MHR)
                    .filter(
                        MHR.op_type_id == op_id,
                        MHR.duty_id == du_id,
                        MHR.machine_id == m_id,
                    )
                    .first()
                )
                if rec:
                    computed = _calculate_mhr_from_record(rec)
                    if computed is not None:
                        return float(computed)
                    configured = _to_float_or_none(getattr(rec, "machine_hr_rate", None))
                    if configured is not None:
                        return float(configured)
        except Exception:
            pass

        # Prefer MHR configuration table values; do a normalized match to tolerate
        # differences like: "Medium duty" vs "medium", "Turning" vs "turning".
        try:
            op_norm = _norm(operation)
            duty_norm = _norm(duty)
            machine_norm = _norm(machine_name)

            # Narrow candidates by operation+duty in SQL first. Machine naming can differ
            # (e.g., "Conventional" vs "Conventional Lathe"), so we score matches in Python.
            candidates = (
                db.query(MHR)
                .join(OperationTypeModel, MHR.op_type_id == OperationTypeModel.id)
                .join(Duty, MHR.duty_id == Duty.id)
                .join(Machine, MHR.machine_id == Machine.id)
                .filter(func.lower(func.trim(OperationTypeModel.operation_name)) == operation.strip().lower())
                .all()
            )

            best = None
            best_score = -1
            for rec in candidates:
                rec_op = _norm(getattr(rec.operation_type, "operation_name", None))
                rec_duty = _norm(getattr(rec.duty, "name", None))
                if rec_op != op_norm or rec_duty != duty_norm:
                    continue

                rec_machine = _norm(getattr(rec.machine, "name", None))
                # 2 = exact, 1 = substring match, 0 = mismatch
                if rec_machine == machine_norm:
                    score = 2
                elif rec_machine and machine_norm and (rec_machine in machine_norm or machine_norm in rec_machine):
                    score = 1
                else:
                    score = 0

                if score > best_score:
                    best = rec
                    best_score = score

                if best_score == 2:
                    break

            if best:
                computed = _calculate_mhr_from_record(best)
                if computed is not None:
                    return float(computed)
                configured = _to_float_or_none(getattr(best, "machine_hr_rate", None))
                if configured is not None:
                    return float(configured)
        except Exception:
            # If database query fails, use defaults
            pass

        raise ValueError(
            "MHR not configured for the selected operation, duty, and machine. "
            "Please add a matching row in the MHR configuration table."
        )
    
    def get_machine_hour_rate_with_fallback(
        self,
        operation: str,
        duty: str,
        machine_name: str,
        db: Session
    ) -> float:
        """
        Get Machine Hour Rate with fallback to calculation if not in database
        """
        try:
            # Try to get from database first
            return self.get_machine_hour_rate(
                operation=operation,
                duty=duty,
                machine_name=machine_name,
                db=db
            )
        except ValueError:
            # Fallback to calculated MHR based on machine category
            machine_category = self.determine_machine_category(machine_name)
            
            # Default investment and power based on machine category
            if machine_category == "conventional":
                investment_cost = 1000000  # ₹10 lakhs
                power_rating_kw = 15
            elif machine_category == "cnc_3axis":
                investment_cost = 3000000  # ₹30 lakhs
                power_rating_kw = 20
            else:  # cnc_5axis
                investment_cost = 5000000  # ₹50 lakhs
                power_rating_kw = 25
            
            return self.calculate_complete_machine_hour_rate(
                investment_cost=investment_cost,
                power_rating_kw=power_rating_kw,
                machine_category=machine_category
            )
    
    def calculate_man_hours(
        self,
        operation: str,
        duty: str,
        override: Optional[float] = None
    ) -> float:
        """
        Calculate or return man-hours per unit
        """
        if override:
            return override
        
        return self.MAN_HOURS_MATRIX.get(operation, {}).get(duty, 0.5)
    
    def calculate_nrc_amortization(
        self,
        tooling_cost: float = 0.0,
        development_cost: float = 0.0,
        cnc_programming_cost: float = 0.0,
        special_process_cost: float = 0.0,
        other_nrc_cost: float = 0.0,
        ordered_quantity: int = 1,
        amortize_over_quantity: Optional[int] = None
    ) -> dict:
        """
        Calculate Non-Recurring Costs (NRC) and amortization
        
        NRC Components:
        - Tooling cost
        - Development cost
        - CNC programming cost
        - Special processes (heat treatment, welding, surface treatment)
        - Other costs
        
        Can be amortized over total ordered quantity or treated separately
        """
        total_nrc = (tooling_cost + development_cost + cnc_programming_cost + 
                    special_process_cost + other_nrc_cost)
        
        # Use amortization quantity if provided, otherwise use ordered quantity
        amortization_quantity = amortize_over_quantity if amortize_over_quantity else ordered_quantity
        
        if amortization_quantity > 0:
            nrc_per_unit = total_nrc / amortization_quantity
        else:
            nrc_per_unit = 0.0
        
        return {
            "total_nrc": round(total_nrc, 2),
            "nrc_per_unit": round(nrc_per_unit, 2),
            "amortization_quantity": amortization_quantity,
            "tooling_cost": round(tooling_cost, 2),
            "development_cost": round(development_cost, 2),
            "cnc_programming_cost": round(cnc_programming_cost, 2),
            "special_process_cost": round(special_process_cost, 2),
            "other_nrc_cost": round(other_nrc_cost, 2)
        }
    
    def calculate_material_cost(
        self,
        material: str,
        dimensions: dict,
        shape: str,
        material_cost_per_kg: float,
        is_hal_free_issue: bool = False
    ) -> dict:
        """
        Calculate material cost when HAL does not supply as free issue
        
        Material Cost = Volume × Density × Cost per kg
        """
        if is_hal_free_issue:
            return {
                "material_cost_per_unit": 0.0,
                "material_weight_kg": 0.0,
                "is_free_issue": True
            }
        
        # Calculate volume based on shape
        if shape == "round" and all(k in dimensions for k in ("diameter", "length")):
            diameter = float(dimensions["diameter"])
            length = float(dimensions["length"])
            volume_mm3 = 3.14159 * (diameter/2)**2 * length
        elif shape == "rectangular" and all(k in dimensions for k in ("length", "breadth", "height")):
            length = float(dimensions["length"])
            breadth = float(dimensions["breadth"])
            height = float(dimensions["height"])
            volume_mm3 = length * breadth * height
        else:
            volume_mm3 = 0.0
        
        # Convert to cubic centimeters and calculate weight
        volume_cm3 = volume_mm3 / 1000
        
        # Material densities (g/cm³)
        densities = {
            "aluminium": 2.70,
            "steel": 7.85,
            "titanium": 4.51,
            "copper": 8.96,
            "brass": 8.50
        }
        
        density = densities.get(material.lower(), 7.85)  # Default to steel
        weight_kg = (volume_cm3 * density) / 1000
        
        material_cost_per_unit = weight_kg * material_cost_per_kg
        
        return {
            "material_cost_per_unit": round(material_cost_per_unit, 2),
            "material_weight_kg": round(weight_kg, 3),
            "volume_cm3": round(volume_cm3, 3),
            "density_g_cm3": density,
            "is_free_issue": False
        }
    
    def calculate_enhanced_costs(
        self,
        operations_data: list,  # List of dicts with operation details
        quantity: int,
        miscellaneous_amount: float = 0.0,
        nrc_data: Optional[dict] = None,
        material_data: Optional[dict] = None
    ) -> dict:
        """
        Calculate costs with complete methodology including multiple operations
        
        operations_data format:
        [{
            "operation": "turning",
            "duty": "medium",
            "man_hours": 0.5,
            "machine_hour_rate": 150.0,
            "wage_rate": 75.0
        }, ...]
        
        Enhanced Basic Cost Formula:
        D = Σ(A1×B1 + A2×B2 + ... + An×Bn) + Σ(A1×C1 + A2×C2 + ... + An×Cm)
        """
        # Calculate enhanced basic cost
        total_machine_cost = 0.0
        total_labor_cost = 0.0
        
        for op_data in operations_data:
            man_hours = op_data.get("man_hours", 0.0)
            machine_hour_rate = op_data.get("machine_hour_rate", 0.0)
            wage_rate = op_data.get("wage_rate", 0.0)
            
            total_machine_cost += man_hours * machine_hour_rate
            total_labor_cost += man_hours * wage_rate
        
        # Enhanced Basic Cost (D)
        basic_cost = total_machine_cost + total_labor_cost
        
        # Overheads: 100% of total labor cost
        overheads = total_labor_cost
        
        # Profit: 10% of (D + OH)
        profit = 0.10 * (basic_cost + overheads)
        
        # Packing & Forwarding: 2% of D
        packing_forwarding = 0.02 * basic_cost
        
        # Calculate NRC per unit if provided
        nrc_per_unit = 0.0
        if nrc_data:
            nrc_result = self.calculate_nrc_amortization(**nrc_data)
            nrc_per_unit = nrc_result["nrc_per_unit"]
        
        # Calculate material cost per unit if provided
        material_cost_per_unit = 0.0
        if material_data:
            material_result = self.calculate_material_cost(**material_data)
            material_cost_per_unit = material_result["material_cost_per_unit"]
        
        # Unit cost before NRC and material
        unit_cost = basic_cost + overheads + profit + packing_forwarding
        
        # Total unit cost with all components
        total_unit_cost = (unit_cost + nrc_per_unit + material_cost_per_unit + 
                          miscellaneous_amount)
        
        # Total cost
        total_cost = total_unit_cost * quantity
        
        # Calculate average outsourcing MHR
        total_man_hours = sum(op.get("man_hours", 0.0) for op in operations_data)
        avg_machine_hour_rate = (total_machine_cost / total_man_hours if total_man_hours > 0 
                                else 0.0)
        avg_wage_rate = (total_labor_cost / total_man_hours if total_man_hours > 0 
                        else 0.0)
        outsourcing_mhr = avg_machine_hour_rate + (2 * avg_wage_rate)
        
        return {
            "total_man_hours_per_unit": round(total_man_hours, 4),
            "total_machine_cost_per_unit": round(total_machine_cost, 2),
            "total_labor_cost_per_unit": round(total_labor_cost, 2),
            "basic_cost_per_unit": round(basic_cost, 2),
            "overheads_per_unit": round(overheads, 2),
            "profit_per_unit": round(profit, 2),
            "packing_forwarding_per_unit": round(packing_forwarding, 2),
            "nrc_per_unit": round(nrc_per_unit, 2),
            "material_cost_per_unit": round(material_cost_per_unit, 2),
            "unit_cost_before_extras": round(unit_cost, 2),
            "total_unit_cost": round(total_unit_cost, 2),
            "total_cost": round(total_cost, 2),
            "outsourcing_mhr": round(outsourcing_mhr, 2),
            "miscellaneous_amount": round(miscellaneous_amount, 2)
        }
    
    def calculate_costs(
        self,
        man_hours: float,
        machine_hour_rate: float,
        wage_rate: float,
        quantity: int,
        miscellaneous_amount: float = 0.0
    ) -> dict:
        """
        Calculate all cost components based on the formula
        
        Methodology formulas:
        D = A × (B + C)  # Basic Cost
        OH = 100% of C × A = C × A  # Overheads
        Profit = 10% of (D + OH)
        PF = 2% of D  # Packing & Forwarding
        Unit Cost = D + OH + Profit + PF
        Total Unit Cost with Misc = Unit Cost + Miscellaneous Amount
        Outsourcing MHR = B + 2C
        
        Where:
        A = man_hours, B = machine_hour_rate, C = wage_rate
        """
        # A = man_hours, B = machine_hour_rate, C = wage_rate
        
        # Basic cost per unit: D = A × (B + C)
        basic_cost = man_hours * (machine_hour_rate + wage_rate)
        
        # Overheads: OH = 100% of C × A = C × A (fixed to match methodology)
        overheads = wage_rate * man_hours
        
        # Profit: 10% of (D + OH)
        profit = 0.10 * (basic_cost + overheads)
        
        # Packing & Forwarding: 2% of D
        packing_forwarding = 0.02 * basic_cost
        
        # Unit cost
        unit_cost = basic_cost + overheads + profit + packing_forwarding
        
        # Total unit cost with miscellaneous amount
        total_unit_cost_with_misc = unit_cost + miscellaneous_amount
        
        # Total cost
        total_cost = total_unit_cost_with_misc * quantity
        
        # Outsourcing MHR
        outsourcing_mhr = machine_hour_rate + (2 * wage_rate)
        
        return {
            "man_hours_per_unit": round(man_hours, 4),
            "machine_hour_rate": round(machine_hour_rate, 2),
            "wage_rate": round(wage_rate, 2),
            "basic_cost_per_unit": round(basic_cost, 2),
            "overheads_per_unit": round(overheads, 2),
            "profit_per_unit": round(profit, 2),
            "packing_forwarding_per_unit": round(packing_forwarding, 2),
            "unit_cost": round(unit_cost, 2),
            "total_unit_cost_with_misc": round(total_unit_cost_with_misc, 2),
            "total_cost": round(total_cost, 2),
            "outsourcing_mhr": round(outsourcing_mhr, 2),
            "miscellaneous_amount": round(miscellaneous_amount, 2)
        }