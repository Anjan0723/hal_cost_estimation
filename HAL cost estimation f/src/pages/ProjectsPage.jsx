import React, { useMemo, useState, useEffect } from "react";
import { getProjects, deleteProject } from "../api/projects";

function ProjectsPage({ onChange }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await getProjects();
      setProjects(data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch projects");
      console.error("Error fetching projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      try {
        await deleteProject(projectId);
        setProjects(projects.filter(p => p.id !== projectId));
      } catch (err) {
        console.error("Error deleting project:", err);
        alert("Failed to delete project");
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const activeCount = useMemo(
    () => projects.filter((p) => String(p.status || "").toLowerCase().includes("active")).length,
    [projects]
  );

  const scrollToTable = () => {
    const el = document.getElementById("existing-projects");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-slate-100 p-6 shadow-sm">
        <h1 className="text-xl md:text-2xl font-semibold tracking-wide">Cost Estimation Software</h1>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-sky-600 to-indigo-600 flex items-center justify-center shadow-md cursor-pointer hover:from-sky-700 hover:to-indigo-700 transition-colors"
              onClick={() => onChange("create_project")}
              role="button"
              aria-label="Create New Project">
                <span className="text-white text-xl leading-none">+</span>
              </div>
              <div className="flex-1">
                <h2 className="text-base md:text-lg font-semibold text-slate-900">Create New Project</h2>
                <p className="text-xs md:text-sm text-slate-500 mt-1">
                  Start a new cost estimation project
                </p>
              </div>
            </div>

            <p className="text-xs md:text-sm text-slate-600 mt-4 leading-relaxed">
              Initialize a new project with parts, drawings, and specifications for comprehensive cost analysis and estimation.
              Upload technical documents and manage project details efficiently.
            </p>

            <button
              type="button"
              onClick={() => onChange("create_project")}
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-800"
            >
              Get Started
              <span className="text-base">›</span>
            </button>
          </div>
        </div>

        {/* Projects Table Section */}
      </section>

      <section
        id="existing-projects"
        className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
      >
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-slate-100 border-b border-slate-700">
          <h3 className="text-base font-semibold">Existing Projects</h3>
          <p className="text-xs text-slate-300 mt-1">Manage and track your cost estimation projects</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs md:text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-600 tracking-wider">PROJECT NAME</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600 tracking-wider">CUSTOMER NAME</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600 tracking-wider">CREATED DATE</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600 tracking-wider">NUMBER OF PARTS</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600 tracking-wider">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    Loading projects...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    No projects found. Create your first project to get started.
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <div>
                          <div className="font-semibold text-slate-900">{p.project_name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">ID: {p.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 font-medium">{p.customer_name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Customer</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 font-medium">{formatDate(p.created_at)}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Creation Date</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100 font-semibold text-[11px]">
                        {p.parts?.length || 0} Parts
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onChange("project_detail", { projectId: p.id })}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 shadow-sm"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M14 3h7v7" />
                            <path d="M10 14L21 3" />
                            <path d="M21 14v7h-7" />
                            <path d="M3 10V3h7" />
                            <path d="M3 21h7v-7" />
                          </svg>
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => onChange("edit_project", { projectId: p.id })}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200"
                          title="Edit Project"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(p.id)}
                          className="inline-flex items-center gap-1 px-2 py-2 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200"
                          title="Delete Project"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">Showing {projects.length} projects</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded-md text-xs border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              Previous
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-md text-xs border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ProjectsPage;
