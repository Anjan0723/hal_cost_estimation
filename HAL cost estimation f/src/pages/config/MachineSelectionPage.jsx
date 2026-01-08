import React, { useEffect, useState } from "react";
import CrudTable from "../../components/CrudTable";
import api from "../../api/client";

function MachineSelectionPage() {
  const [machines, setMachines] = useState([]);
  const [dimensions, setDimensions] = useState([]);
  const [duties, setDuties] = useState([]);
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [machinesRes, dimensionsRes, dutiesRes, materialsRes] = await Promise.all([
          api.get("/machines/"),
          api.get("/dimensions/"),
          api.get("/duties/"),
          api.get("/materials/"),
        ]);
        setMachines(machinesRes.data || []);
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
    <div className="space-y-6 w-full">
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
                className="px-2.5 py-1.5 rounded-md border border-slate-600 text-xs md:text-sm bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-500"
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
                className="px-2.5 py-1.5 rounded-md border border-slate-600 text-xs md:text-sm bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-500"
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
    </div>
  );
}

export default MachineSelectionPage;
