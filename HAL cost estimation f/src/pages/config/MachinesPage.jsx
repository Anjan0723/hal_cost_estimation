import React, { useEffect, useState } from "react";
import CrudTable from "../../components/CrudTable";
import api from "../../api/client";

function MachinesPage() {
  const [operationTypes, setOperationTypes] = useState([]);

  useEffect(() => {
    const fetchOperationTypes = async () => {
      try {
        const res = await api.get("/operation-type/");
        setOperationTypes(res.data || []);
      } catch (err) {
        console.error("Failed to load operation types", err);
      }
    };
    fetchOperationTypes();
  }, []);

  return (
    <div className="space-y-6 w-full">
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
                className="px-2.5 py-1.5 rounded-md border border-slate-300 text-xs md:text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
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
    </div>
  );
}

export default MachinesPage;
