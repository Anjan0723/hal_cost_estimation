import React, { useState } from "react";
import { createProject, addProjectPart } from "../api/projects";

function CreateProjectPage({ onChange, onCreate }) {
  const [projectName, setProjectName] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [projectDate, setProjectDate] = useState("");
  const [requirementDocs, setRequirementDocs] = useState([]);
  const [otherDocs, setOtherDocs] = useState([]);
  const [parts, setParts] = useState([
    {
      partNumber: "",
      partName: "",
      model3D: null,
      drawing2D: null,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (setter, multiple) => (event) => {
    setter(multiple ? Array.from(event.target.files) : event.target.files[0]);
  };

  const removeFile = (setter, index) => {
    setter((prev) => {
      if (Array.isArray(prev)) {
        return prev.filter((_, i) => i !== index);
      } else {
        return null;
      }
    });
  };

  const replaceFile = (setter, index, multiple) => (event) => {
    const newFiles = Array.from(event.target.files);
    setter((prev) => {
      if (Array.isArray(prev)) {
        const updated = [...prev];
        updated[index] = newFiles[0];
        return updated;
      } else {
        return newFiles[0];
      }
    });
  };

  const handlePartFileChange = (index, field) => (event) => {
    const newParts = [...parts];
    newParts[index][field] = event.target.files[0];
    setParts(newParts);
  };

  const addPart = () => {
    setParts([
      ...parts,
      {
        partNumber: "",
        partName: "",
        model3D: null,
        drawing2D: null,
      },
    ]);
  };

  const removePart = (index) => {
    const newParts = parts.filter((_, i) => i !== index);
    setParts(newParts);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Create FormData for project creation
      const formData = new FormData();
      formData.append('project_name', projectName);
      formData.append('customer_name', customerName);
      formData.append('po_reference_number', poNumber);
      formData.append('project_date', projectDate);
      
      // Add requirement docs (take first one if multiple)
      if (requirementDocs.length > 0) {
        formData.append('requirement_docs', requirementDocs[0]);
      }
      
      // Add other docs (take first one if multiple)
      if (otherDocs.length > 0) {
        formData.append('other_docs', otherDocs[0]);
      }

      // Create the project
      const createdProject = await createProject(formData);
      
      // Add parts to the created project
      const validParts = parts.filter(part => 
        part.partNumber.trim() !== '' || part.partName.trim() !== ''
      );
      
      if (validParts.length > 0) {
        for (const part of validParts) {
          const partFormData = new FormData();
          partFormData.append('part_number', part.partNumber || '');
          partFormData.append('part_name', part.partName || '');
          
          if (part.model3D) {
            partFormData.append('model_3d', part.model3D);
          }
          
          if (part.drawing2D) {
            partFormData.append('drawing_2d', part.drawing2D);
          }
          
          try {
            await addProjectPart(createdProject.id, partFormData);
          } catch (partError) {
            console.error(`Error adding part ${part.partNumber}:`, partError);
            // Continue with other parts even if one fails
          }
        }
      }
      
      // Show success message
      const message = validParts.length > 0 
        ? `Project "${createdProject.project_name}" created successfully with ${validParts.length} part(s)!`
        : `Project "${createdProject.project_name}" created successfully!`;
      alert(message);
      
      // Call onCreate callback if provided
      if (onCreate) {
        onCreate(createdProject);
      }
      
      // Navigate back to projects list
      onChange("projects");
    } catch (err) {
      setError("Failed to create project. Please try again.");
      console.error("Error creating project:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-slate-100 p-6 shadow-sm">
        <h1 className="text-xl md:text-2xl font-semibold tracking-wide">Create New Project</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h2 className="text-base font-semibold text-slate-800">Project Information</h2>
          </div>
          <div className="p-6 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Project Name</label>
              <input
                type="text"
                placeholder="Enter project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs md:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 shadow-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">PO / Reference Number</label>
              <input
                type="text"
                placeholder="Enter PO or reference number"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs md:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 shadow-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Customer Name</label>
              <input
                type="text"
                placeholder="Enter customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs md:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 shadow-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Project Date</label>
              <input
                type="date"
                value={projectDate}
                onChange={(e) => setProjectDate(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs md:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 shadow-sm"
              />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h2 className="text-base font-semibold text-slate-800">Documents</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Requirement Documents</label>
              <input
                type="file"
                multiple
                onChange={handleFileChange(setRequirementDocs, true)}
                className="text-xs md:text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
              />
              {requirementDocs.length > 0 && (
                <ul className="text-xs text-slate-600 mt-1 space-y-1">
                  {requirementDocs.map((f, i) => (
                    <li key={i} className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded border border-slate-200">
                      <span className="truncate mr-2">{f.name}</span>
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-sky-600 hover:text-sky-700 cursor-pointer font-medium">
                          Edit
                          <input
                            type="file"
                            onChange={replaceFile(setRequirementDocs, i, true)}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => removeFile(setRequirementDocs, i)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Other Documents</label>
              <input
                type="file"
                multiple
                onChange={handleFileChange(setOtherDocs, true)}
                className="text-xs md:text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
              />
              {otherDocs.length > 0 && (
                <ul className="text-xs text-slate-600 mt-1 space-y-1">
                  {otherDocs.map((f, i) => (
                    <li key={i} className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded border border-slate-200">
                      <span className="truncate mr-2">{f.name}</span>
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-sky-600 hover:text-sky-700 cursor-pointer font-medium">
                          Edit
                          <input
                            type="file"
                            onChange={replaceFile(setOtherDocs, i, true)}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => removeFile(setOtherDocs, i)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Parts</h2>
            <button
              type="button"
              onClick={addPart}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 shadow-sm"
            >
              Add Part
            </button>
          </div>
          <div className="p-6 space-y-4">
            {parts.map((part, index) => (
              <div key={index} className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">Part {index + 1}</h3>
                  {parts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePart(index)}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-600">Part Number</label>
                    <input
                      type="text"
                      placeholder="Enter part number"
                      value={part.partNumber}
                      onChange={(e) => {
                        const newParts = [...parts];
                        newParts[index].partNumber = e.target.value;
                        setParts(newParts);
                      }}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-xs md:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 shadow-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-600">Part Name</label>
                    <input
                      type="text"
                      placeholder="Enter part name"
                      value={part.partName}
                      onChange={(e) => {
                        const newParts = [...parts];
                        newParts[index].partName = e.target.value;
                        setParts(newParts);
                      }}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-xs md:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 shadow-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-600">3D Model</label>
                    {part.model3D ? (
                      <div className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded border border-slate-200">
                        <span className="text-xs text-slate-600 truncate mr-2">{part.model3D.name}</span>
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-sky-600 hover:text-sky-700 cursor-pointer font-medium">
                            Edit
                            <input
                              type="file"
                              onChange={handlePartFileChange(index, "model3D")}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const newParts = [...parts];
                              newParts[index].model3D = null;
                              setParts(newParts);
                            }}
                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <input
                        type="file"
                        onChange={handlePartFileChange(index, "model3D")}
                        className="text-xs md:text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-600">2D Drawing</label>
                    {part.drawing2D ? (
                      <div className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded border border-slate-200">
                        <span className="text-xs text-slate-600 truncate mr-2">{part.drawing2D.name}</span>
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-sky-600 hover:text-sky-700 cursor-pointer font-medium">
                            Edit
                            <input
                              type="file"
                              onChange={handlePartFileChange(index, "drawing2D")}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const newParts = [...parts];
                              newParts[index].drawing2D = null;
                              setParts(newParts);
                            }}
                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <input
                        type="file"
                        onChange={handlePartFileChange(index, "drawing2D")}
                        className="text-xs md:text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onChange("projects")}
            className="px-4 py-2 rounded-lg text-xs md:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg text-xs md:text-sm font-semibold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating Project..." : "Create Project"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateProjectPage;
