import React from "react";
import CrudTable from "../../components/CrudTable";
import api from "../../api/client";

function OperationTypesPage() {
  return (
    <div className="space-y-6 w-full">
      <CrudTable
        title="Operation Type"
        resourcePath="/operation-type/"
        columns={[
          { key: "operation_name", label: "Operation Name" },
        ]}
        initialFormState={{ operation_name: "" }}
      />
    </div>
  );
}

export default OperationTypesPage;
