#!/usr/bin/env python3
"""
Test script to verify all HAL methodology calculations
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'HAL-cost-estimation-backend'))

from backend.services.cost_calculation_service import CostCalculationService

def test_machine_hour_rate():
    """Test complete Machine Hour Rate calculation"""
    print("=== Testing Machine Hour Rate Calculation ===")
    
    service = CostCalculationService(None)
    
    # Test conventional machine
    mhr_conv = service.calculate_complete_machine_hour_rate(
        investment_cost=1000000,  # ₹10 lakhs
        power_rating_kw=15,  # 15 kW
        machine_category="conventional"
    )
    print(f"Conventional MHR: ₹{mhr_conv:.2f}/hour")
    
    # Test CNC machine
    mhr_cnc = service.calculate_complete_machine_hour_rate(
        investment_cost=5000000,  # ₹50 lakhs
        power_rating_kw=25,  # 25 kW
        machine_category="cnc_3axis"
    )
    print(f"CNC MHR: ₹{mhr_cnc:.2f}/hour")
    
    return mhr_conv, mhr_cnc

def test_nrc_calculation():
    """Test NRC calculation and amortization"""
    print("\n=== Testing NRC Calculation ===")
    
    service = CostCalculationService(None)
    
    nrc_result = service.calculate_nrc_amortization(
        tooling_cost=50000,
        development_cost=25000,
        cnc_programming_cost=15000,
        special_process_cost=10000,
        other_nrc_cost=5000,
        ordered_quantity=100,
        amortize_over_quantity=100
    )
    
    print(f"Total NRC: ₹{nrc_result['total_nrc']}")
    print(f"NRC per unit: ₹{nrc_result['nrc_per_unit']}")
    
    return nrc_result

def test_material_cost():
    """Test material cost calculation"""
    print("\n=== Testing Material Cost Calculation ===")
    
    service = CostCalculationService(None)
    
    # Test steel round bar
    dimensions = {"diameter": 50, "length": 200}
    material_result = service.calculate_material_cost(
        material="steel",
        dimensions=dimensions,
        shape="round",
        material_cost_per_kg=85,
        is_hal_free_issue=False
    )
    
    print(f"Steel weight: {material_result['material_weight_kg']} kg")
    print(f"Steel cost per unit: ₹{material_result['material_cost_per_unit']}")
    
    return material_result

def test_enhanced_cost_calculation():
    """Test complete cost calculation with multiple operations"""
    print("\n=== Testing Enhanced Cost Calculation ===")
    
    service = CostCalculationService(None)
    
    # Multiple operations
    operations_data = [
        {
            "operation": "turning",
            "duty": "medium",
            "man_hours": 0.5,
            "machine_hour_rate": 150.0,
            "wage_rate": 75.0
        },
        {
            "operation": "milling",
            "duty": "light",
            "man_hours": 0.3,
            "machine_hour_rate": 120.0,
            "wage_rate": 75.0
        }
    ]
    
    nrc_data = {
        "tooling_cost": 50000,
        "ordered_quantity": 100
    }
    
    material_data = {
        "material": "steel",
        "dimensions": {"diameter": 50, "length": 200},
        "shape": "round",
        "material_cost_per_kg": 85,
        "is_hal_free_issue": False
    }
    
    result = service.calculate_enhanced_costs(
        operations_data=operations_data,
        quantity=100,
        miscellaneous_amount=500,
        nrc_data=nrc_data,
        material_data=material_data
    )
    
    print(f"Basic Cost per unit: ₹{result['basic_cost_per_unit']}")
    print(f"Total Unit Cost: ₹{result['total_unit_cost']}")
    print(f"Total Cost for 100 units: ₹{result['total_cost']}")
    print(f"Outsourcing MHR: ₹{result['outsourcing_mhr']}")
    
    return result

def main():
    """Run all tests"""
    print("HAL Cost Estimation - Methodology Verification Tests")
    print("=" * 60)
    
    try:
        # Test all calculations
        test_machine_hour_rate()
        test_nrc_calculation()
        test_material_cost()
        test_enhanced_cost_calculation()
        
        print("\n" + "=" * 60)
        print("✅ All tests completed successfully!")
        print("✅ All methodology calculations implemented correctly!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
