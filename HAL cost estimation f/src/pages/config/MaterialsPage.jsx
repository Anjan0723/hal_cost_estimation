import React from "react";
import CrudTable from "../../components/CrudTable";

function MaterialsPage() {
  return (
    <div className="space-y-6 w-full">
      <CrudTable
        title="Materials"
        resourcePath="/materials/"
        columns={[{ key: "name", label: "Material" }]}
        initialFormState={{ name: "" }}
      />
    </div>
  );
}

export default MaterialsPage;
