import React, { useState, useEffect } from "react";
import { getProject, updateProject } from "../api/projects";

function EditProjectPage({ onChange, projectId }) {
  const [projectName, setProjectName] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [projectDate, setProjectDate] = useState("");
  const [requirementDocs, setRequirementDocs] = useState([]);
  const [otherDocs, setOtherDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const project = await getProject(projectId);
      setProjectName(project.project_name || "");
      setCustomerName(project.customer_name || "");
      setPoNumber(project.po_reference_number || "");
      setProjectDate(project.project_date || "");
      setError(null);
    } catch (err) {
      setError("Failed to fetch project data");
      console.error("Error fetching project:", err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Create FormData for project update
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

      // Update the project
      await updateProject(projectId, formData);
      
      // Show success message
      alert(`Project "${projectName}" updated successfully!`);
      
      // Navigate back to projects list
      onChange("projects");
    } catch (err) {
      setError("Failed to update project. Please try again.");
      console.error("Error updating project:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">Loading project data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-slate-100 p-6 shadow-sm">
        <h1 className="text-xl md:text-2xl font-semibold tracking-wide">Edit Project</h1>
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
                required
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
                required
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
            <h2 className="text-base font-semibold text-slate-800">Add Additional Documents</h2>
            <p className="text-xs text-slate-500 mt-1">Upload new documents to add to this project</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Additional Requirement Documents</label>
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
                      <button
                        type="button"
                        onClick={() => removeFile(setRequirementDocs, i)}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Additional Other Documents</label>
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
                      <button
                        type="button"
                        onClick={() => removeFile(setOtherDocs, i)}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onChange("projects")}
            className="px-4 py-2 rounded-lg text-xs md:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
          >
            ← Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg text-xs md:text-sm font-semibold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Updating Project..." : "Update Project"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditProjectPage;
