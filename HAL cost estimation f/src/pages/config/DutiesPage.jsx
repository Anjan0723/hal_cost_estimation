import React from "react";
import CrudTable from "../../components/CrudTable";

function DutiesPage() {
  return (
    <div className="space-y-6 w-full">
      <CrudTable
        title="Duties"
        resourcePath="/duties/"
        columns={[{ key: "name", label: "Duty" }]}
        initialFormState={{ name: "" }}
      />
    </div>
  );
}

export default DutiesPage;
