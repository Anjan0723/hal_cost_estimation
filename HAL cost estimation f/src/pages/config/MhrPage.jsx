import React, { useEffect, useState } from "react";
import CrudTable from "../../components/CrudTable";
import api from "../../api/client";
import { calculateMhrFromInputs } from "../../api/costEstimation";

function MhrPage() {
  const [operationTypes, setOperationTypes] = useState([]);
  const [duties, setDuties] = useState([]);
  const [machines, setMachines] = useState([]);
  
  // MHR Calculator state
  const [calculatorForm, setCalculatorForm] = useState({
    investment_cost: "",
    power_rating_kw: "",
    available_hours_per_annum: "",
    machine_category: "conventional"
  });
  const [calculationResult, setCalculationResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [opTypesRes, dutiesRes, machinesRes] = await Promise.all([
          api.get("/operation-type/"),
          api.get("/duties/"),
          api.get("/machines/"),
        ]);
        setOperationTypes(opTypesRes.data || []);
        setDuties(dutiesRes.data || []);
        setMachines(machinesRes.data || []);
      } catch (err) {
        console.error("Failed to load lookup data", err);
      }
    };
    fetchLookups();
  }, []);

  // Separate useEffect to fetch MHR data
  useEffect(() => {
    const fetchMhrData = async () => {
      try {
        const mhrRes = await api.get("/mhr/");
        console.log("MHR Data fetched:", mhrRes.data);
      } catch (err) {
        console.error("Failed to load MHR data:", err);
        if (err.response) {
          console.error("Response status:", err.response.status);
          console.error("Response data:", err.response.data);
        }
      }
    };
    fetchMhrData();
  }, []);

  const handleCalculate = async () => {
    if (!calculatorForm.investment_cost || !calculatorForm.power_rating_kw || !calculatorForm.available_hours_per_annum) {
      alert("Please fill in all required fields");
      return;
    }

    setIsCalculating(true);
    try {
      const result = await calculateMhrFromInputs({
        investment_cost: parseFloat(calculatorForm.investment_cost),
        power_rating_kw: parseFloat(calculatorForm.power_rating_kw),
        available_hours_per_annum: parseFloat(calculatorForm.available_hours_per_annum),
        machine_category: calculatorForm.machine_category
      });
      setCalculationResult(result);
    } catch (error) {
      console.error("Calculation failed:", error);
      alert("Calculation failed. Please check your inputs.");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleInputChange = (field, value) => {
    setCalculatorForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-6 w-full">
      {/* MHR Calculator Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4 text-slate-800">MHR Calculator</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-end mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Investment Cost (I) *
            </label>
            <input
              type="number"
              value={calculatorForm.investment_cost}
              onChange={(e) => handleInputChange("investment_cost", e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="e.g., 2000000"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Power Rating (kW) *
            </label>
            <input
              type="number"
              value={calculatorForm.power_rating_kw}
              onChange={(e) => handleInputChange("power_rating_kw", e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="e.g., 5"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Available Hours/Annum *
            </label>
            <input
              type="number"
              value={calculatorForm.available_hours_per_annum}
              onChange={(e) => handleInputChange("available_hours_per_annum", e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="e.g., 3600"
            />
          </div>
          
          <div className="col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Machine Category *
            </label>
            <select
              value={calculatorForm.machine_category}
              onChange={(e) => handleInputChange("machine_category", e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="conventional">Conventional (7% downtime)</option>
              <option value="cnc">CNC (15% downtime)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-start gap-3">
          <button
            onClick={handleCalculate}
            disabled={isCalculating}
            className="bg-sky-600 text-white px-5 py-2 rounded-md hover:bg-sky-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {isCalculating ? "Calculating..." : "Calculate MHR"}
          </button>
        </div>
        
        {/* Calculation Results */}
        {calculationResult && (
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-slate-800">Calculation Results</h3>

            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Final Machine Hour Rate</h4>
              <p className="text-2xl font-bold text-green-700">
                Rs {calculationResult.total_machine_hour_rate} per hour
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Original CRUD Table */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4 text-slate-800">MHR Configuration</h2>
        <CrudTable
          title="MHR"
          resourcePath="/mhr/"
          columns={[
            {
              key: "op_type_id",
              label: "Operation Type",
              getValue: (item) => {
                const op = operationTypes.find(
                  (ot) => ot.id === item.op_type_id
                );
                return op?.operation_name ?? item.op_type_id ?? "-";
              },
              renderInput: ({ value, onChange }) => (
                <select
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="px-2.5 py-1.5 rounded-md border border-slate-600 text-xs md:text-sm bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-500"
                >
                  <option value="">Select Operation Type</option>
                  {operationTypes.map((ot) => (
                    <option key={ot.id} value={ot.id}>
                      {ot.operation_name}
                    </option>
                  ))}
                </select>
              ),
            },
            {
              key: "duty_id",
              label: "Duty",
              getValue: (item) => {
                const du = duties.find((duty) => duty.id === item.duty_id);
                return du?.name ?? item.duty_id ?? "-";
              },
              renderInput: ({ value, onChange }) => (
                <select
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="px-2.5 py-1.5 rounded-md border border-slate-600 text-xs md:text-sm bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-500"
                >
                  <option value="">Select Duty</option>
                  {duties.map((du) => (
                    <option key={du.id} value={du.id}>
                      {du.name}
                    </option>
                  ))}
                </select>
              ),
            },
            {
              key: "machine_id",
              label: "Machine",
              getValue: (item) => {
                const m = machines.find((mach) => mach.id === item.machine_id);
                return m?.name ?? item.machine_id ?? "-";
              },
              renderInput: ({ value, onChange }) => (
                <select
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="px-2.5 py-1.5 rounded-md border border-slate-600 text-xs md:text-sm bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-500"
                >
                  <option value="">Select Machine</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              ),
            },
            { key: "investment_cost", label: "Investment Cost" },
            { key: "elect_power_rating", label: "Electrical Power Rating" },
            { key: "elect_power_charges", label: "Electrical Power Charges" },
            { key: "available_hrs_per_annum", label: "Available Hrs/Annum" },
            { key: "utilization_hrs_year", label: "Utilization Hrs/Year" },
            { key: "machine_hr_rate", label: "Machine Hour Rate" },
          ]}
          initialFormState={{
            op_type_id: "",
            duty_id: "",
            machine_id: "",
            investment_cost: "",
            elect_power_rating: "",
            elect_power_charges: "",
            available_hrs_per_annum: "",
            utilization_hrs_year: "",
            machine_hr_rate: "",
          }}
        />
      </div>
    </div>
  );
}

export default MhrPage;
