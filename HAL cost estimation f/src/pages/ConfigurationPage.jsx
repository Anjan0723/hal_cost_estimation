import React, { useEffect, useState } from "react";
import CrudTable from "../components/CrudTable";
import api from "../api/client";

function ConfigurationPage() {
  const [machines, setMachines] = useState([]);
  const [operationTypes, setOperationTypes] = useState([]);
  const [dimensions, setDimensions] = useState([]);
  const [duties, setDuties] = useState([]);
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [
          machinesRes,
          opTypesRes,
          dimensionsRes,
          dutiesRes,
          materialsRes,
        ] = await Promise.all([
          api.get("/machines/"),
          api.get("/operation-type/"),
          api.get("/dimensions/"),
          api.get("/duties/"),
          api.get("/materials/"),
        ]);
        setMachines(machinesRes.data || []);
        setOperationTypes(opTypesRes.data || []);
        setDimensions(dimensionsRes.data || []);
        setDuties(dutiesRes.data || []);
        setMaterials(materialsRes.data || []);
      } catch (err) {
        console.error("Failed to load lookup data", err);
      }
    };

    fetchLookups();
  }, []);
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-2">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-900">
            Configuration
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-2xl">
            Manage master data used for cost estimation. Use the Add, Edit and
            Delete actions in each card.
          </p>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-2 items-start">
        {/* Operation Type */}
        <CrudTable
          title="Operation Type"
          resourcePath="/operation-type/"
          columns={[
            { key: "operation_name", label: "Operation Name" },
          ]}
          initialFormState={{ operation_name: "" }}
        />

        {/* Machines */}
        <CrudTable
          title="Machines"
          resourcePath="/machines/"
          columns={[
            { key: "name", label: "Machine Name" },
            {
              key: "op_id",
              label: "Operation Type",
              getValue: (item) => {
                const opFromLookup = operationTypes.find(
                  (ot) => ot.id === item.op_id
                );
                return (
                  item.operation_types?.operation_name ??
                  opFromLookup?.operation_name ??
                  item.op_id ??
                  "-"
                );
              },
              renderInput: ({ value, onChange }) => (
                <select
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 text-xs md:text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-500"
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
          ]}
          initialFormState={{ name: "", op_id: "" }}
        />

        {/* Dimensions */}
        <CrudTable
          title="Dimensions"
          resourcePath="/dimensions/"
          columns={[{ key: "name", label: "Dimension" }]}
          initialFormState={{ name: "" }}
        />

        {/* Duties */}
        <CrudTable
          title="Duties"
          resourcePath="/duties/"
          columns={[{ key: "name", label: "Duty" }]}
          initialFormState={{ name: "" }}
        />

        {/* Materials */}
        <CrudTable
          title="Materials"
          resourcePath="/materials/"
          columns={[{ key: "name", label: "Material" }]}
          initialFormState={{ name: "" }}
        />

        {/* Machine Selection */}
        <CrudTable
          title="Machine Selection"
          resourcePath="/machine-selection/"
          columns={[
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
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 text-xs md:text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-500"
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
              key: "dimension_id",
              label: "Dimension",
              getValue: (item) => {
                const d = dimensions.find((dim) => dim.id === item.dimension_id);
                return d?.name ?? item.dimension_id ?? "-";
              },
              renderInput: ({ value, onChange }) => (
                <select
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 text-xs md:text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-500"
                >
                  <option value="">Select Dimension</option>
                  {dimensions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
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
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 text-xs md:text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-500"
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
              key: "material_id",
              label: "Material",
              getValue: (item) => {
                const mat = materials.find((m) => m.id === item.material_id);
                return mat?.name ?? item.material_id ?? "-";
              },
              renderInput: ({ value, onChange }) => (
                <select
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 text-xs md:text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-500"
                >
                  <option value="">Select Material</option>
                  {materials.map((mat) => (
                    <option key={mat.id} value={mat.id}>
                      {mat.name}
                    </option>
                  ))}
                </select>
              ),
            },
            { key: "size", label: "Size" },
          ]}
          initialFormState={{
            machine_id: "",
            dimension_id: "",
            duty_id: "",
            material_id: "",
            size: "",
          }}
        />

        {/* MHR */}
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
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 text-xs md:text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-500"
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
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 text-xs md:text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-500"
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
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 text-xs md:text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-500"
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

export default ConfigurationPage;
