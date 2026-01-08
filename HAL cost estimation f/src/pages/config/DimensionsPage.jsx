import React from "react";
import CrudTable from "../../components/CrudTable";

function DimensionsPage() {
  return (
    <div className="space-y-6 w-full">
      <CrudTable
        title="Dimensions"
        resourcePath="/dimensions/"
        columns={[{ key: "name", label: "Dimension" }]}
        initialFormState={{ name: "" }}
      />
    </div>
  );
}

export default DimensionsPage;
