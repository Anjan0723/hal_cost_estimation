import React, { useEffect, useState } from "react";
import CrudTable from "../../components/CrudTable";
import api from "../../api/client";
import { calculateMhrFromInputs } from "../../api/costEstimation";

function MhrPage() {
  const [operationTypes, setOperationTypes] = useState([]);
  const [duties, setDuties] = useState([]);
  const [machines, setMachines] = useState([]);

  const inferMachineCategory = (machineId) => {
    const idNum = Number(machineId);
    const m = machines.find((x) => x.id === idNum);
    const name = (m?.name ?? "").toString().toLowerCase();
    return name.includes("cnc") ? "cnc" : "conventional";
  };

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

  return (
    <div className="space-y-6 w-full">
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
              renderInput: ({ value, onChange, form }) => (
                <select
                  value={value}
                  onChange={async (e) => {
                    const nextMachineId = e.target.value;
                    const patch = { machine_id: nextMachineId };

                    const investment = parseFloat(form.investment_cost);
                    const kw = parseFloat(form.elect_power_rating);
                    const hours = parseFloat(form.available_hrs_per_annum);
                    const category = inferMachineCategory(nextMachineId);

                    if (Number.isFinite(kw)) {
                      patch.elect_power_charges = String((kw * 5).toFixed(2));
                    }

                    if (Number.isFinite(hours)) {
                      const downtime = category === "conventional" ? 0.07 : 0.15;
                      patch.utilization_hrs_year = String((hours * (1 - downtime)).toFixed(2));
                    }

                    if (Number.isFinite(investment) && Number.isFinite(kw) && Number.isFinite(hours)) {
                      try {
                        const result = await calculateMhrFromInputs({
                          investment_cost: investment,
                          power_rating_kw: kw,
                          available_hours_per_annum: hours,
                          machine_category: category,
                        });
                        if (result?.total_machine_hour_rate != null) {
                          patch.machine_hr_rate = String(result.total_machine_hour_rate);
                        }
                      } catch {
                        // ignore
                      }
                    }

                    onChange(patch);
                  }}
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
            {
              key: "investment_cost",
              label: "Investment Cost",
              renderInput: ({ value, onChange, form }) => (
                <input
                  type="number"
                  value={value}
                  onChange={async (e) => {
                    const nextInvestment = e.target.value;

                    const patch = { investment_cost: nextInvestment };
                    const investment = parseFloat(nextInvestment);
                    const kw = parseFloat(form.elect_power_rating);
                    const hours = parseFloat(form.available_hrs_per_annum);
                    const category = inferMachineCategory(form.machine_id);

                    if (Number.isFinite(kw)) {
                      patch.elect_power_charges = String((kw * 5).toFixed(2));
                    }

                    if (Number.isFinite(hours)) {
                      const downtime = category === "conventional" ? 0.07 : 0.15;
                      patch.utilization_hrs_year = String((hours * (1 - downtime)).toFixed(2));
                    }

                    if (Number.isFinite(investment) && Number.isFinite(kw) && Number.isFinite(hours)) {
                      try {
                        const result = await calculateMhrFromInputs({
                          investment_cost: investment,
                          power_rating_kw: kw,
                          available_hours_per_annum: hours,
                          machine_category: category,
                        });
                        if (result?.total_machine_hour_rate != null) {
                          patch.machine_hr_rate = String(result.total_machine_hour_rate);
                        }
                      } catch {
                        // ignore
                      }
                    }

                    onChange(patch);
                  }}
                  placeholder="Investment Cost"
                  className="px-2.5 py-1.5 rounded-md border border-slate-300 text-xs md:text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
                />
              ),
            },
            {
              key: "elect_power_rating",
              label: "Electrical Power Rating",
              renderInput: ({ value, onChange, form }) => (
                <input
                  type="number"
                  value={value}
                  onChange={async (e) => {
                    const nextKw = e.target.value;
                    const patch = { elect_power_rating: nextKw };

                    const investment = parseFloat(form.investment_cost);
                    const kw = parseFloat(nextKw);
                    const hours = parseFloat(form.available_hrs_per_annum);
                    const category = inferMachineCategory(form.machine_id);

                    if (Number.isFinite(kw)) {
                      patch.elect_power_charges = String((kw * 5).toFixed(2));
                    }

                    if (Number.isFinite(hours)) {
                      const downtime = category === "conventional" ? 0.07 : 0.15;
                      patch.utilization_hrs_year = String((hours * (1 - downtime)).toFixed(2));
                    }

                    if (Number.isFinite(investment) && Number.isFinite(kw) && Number.isFinite(hours)) {
                      try {
                        const result = await calculateMhrFromInputs({
                          investment_cost: investment,
                          power_rating_kw: kw,
                          available_hours_per_annum: hours,
                          machine_category: category,
                        });
                        if (result?.total_machine_hour_rate != null) {
                          patch.machine_hr_rate = String(result.total_machine_hour_rate);
                        }
                      } catch {
                        // ignore
                      }
                    }

                    onChange(patch);
                  }}
                  placeholder="Electrical Power Rating"
                  className="px-2.5 py-1.5 rounded-md border border-slate-300 text-xs md:text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
                />
              ),
            },
            {
              key: "elect_power_charges",
              label: "Electrical Power Charges",
              renderInput: ({ value }) => (
                <input
                  type="text"
                  value={value ?? ""}
                  readOnly
                  placeholder="Electrical Power Charges"
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 text-xs md:text-sm bg-slate-50 text-slate-700"
                />
              ),
            },
            {
              key: "available_hrs_per_annum",
              label: "Available Hrs/Annum",
              renderInput: ({ value, onChange, form }) => (
                <input
                  type="number"
                  value={value}
                  onChange={async (e) => {
                    const nextHours = e.target.value;
                    const patch = { available_hrs_per_annum: nextHours };

                    const investment = parseFloat(form.investment_cost);
                    const kw = parseFloat(form.elect_power_rating);
                    const hours = parseFloat(nextHours);
                    const category = inferMachineCategory(form.machine_id);

                    if (Number.isFinite(kw)) {
                      patch.elect_power_charges = String((kw * 5).toFixed(2));
                    }

                    if (Number.isFinite(hours)) {
                      const downtime = category === "conventional" ? 0.07 : 0.15;
                      patch.utilization_hrs_year = String((hours * (1 - downtime)).toFixed(2));
                    }

                    if (Number.isFinite(investment) && Number.isFinite(kw) && Number.isFinite(hours)) {
                      try {
                        const result = await calculateMhrFromInputs({
                          investment_cost: investment,
                          power_rating_kw: kw,
                          available_hours_per_annum: hours,
                          machine_category: category,
                        });
                        if (result?.total_machine_hour_rate != null) {
                          patch.machine_hr_rate = String(result.total_machine_hour_rate);
                        }
                      } catch {
                        // ignore
                      }
                    }

                    onChange(patch);
                  }}
                  placeholder="Available Hrs/Annum"
                  className="px-2.5 py-1.5 rounded-md border border-slate-300 text-xs md:text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
                />
              ),
            },
            {
              key: "utilization_hrs_year",
              label: "Utilization Hrs/Year",
              renderInput: ({ value }) => (
                <input
                  type="text"
                  value={value ?? ""}
                  readOnly
                  placeholder="Utilization Hrs/Year"
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 text-xs md:text-sm bg-slate-50 text-slate-700"
                />
              ),
            },
            {
              key: "machine_hr_rate",
              label: "Machine Hour Rate",
              renderInput: ({ value }) => (
                <input
                  type="text"
                  value={value ?? ""}
                  readOnly
                  placeholder="Machine Hour Rate"
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 text-xs md:text-sm bg-slate-50 text-slate-700"
                />
              ),
            },
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
