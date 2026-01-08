import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";

function Sidebar({ active, onChange }) {
  const [isConfigOpen, setIsConfigOpen] = useState(
    active.startsWith("config_") || active === "configuration"
  );
  const { user, logout } = useAuth();

  const configItems = [
    { key: "config_operation_types", label: "Operation Types" },
    { key: "config_machines", label: "Machines" },
    { key: "config_dimensions", label: "Dimensions" },
    { key: "config_duties", label: "Duties" },
    { key: "config_materials", label: "Materials" },
    { key: "config_machine_selection", label: "Machine Selection" },
    { key: "config_mhr", label: "MHR" },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen sticky top-0">
      <div className="px-6 py-4 border-b border-slate-800">
        <h1 className="text-lg font-semibold tracking-wide">HAL Cost Estimation</h1>
        <p className="text-xs text-slate-400 mt-1">Admin Panel</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
        <button
          type="button"
          onClick={() => onChange("projects")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors border
            ${
              active === "projects"
                ? "bg-slate-100 text-slate-900 border-slate-300"
                : "bg-transparent text-slate-200 border-transparent hover:bg-slate-800 hover:border-slate-700"
            }`}
        >
          <span>Projects</span>
        </button>

        <div>
          <button
            type="button"
            onClick={() => {
              setIsConfigOpen(!isConfigOpen);
              if (!isConfigOpen) onChange("config_operation_types");
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors border
              ${
                active.startsWith("config_") || active === "configuration"
                  ? "bg-slate-100 text-slate-900 border-slate-300"
                  : "bg-transparent text-slate-200 border-transparent hover:bg-slate-800 hover:border-slate-700"
              }`}
          >
            <span>Configuration</span>
            <svg
              className={`w-4 h-4 transition-transform ${isConfigOpen ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {isConfigOpen && (
            <div className="ml-3 mt-1 space-y-1">
              {configItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onChange(item.key)}
                  className={`w-full flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors border
                    ${
                      active === item.key
                        ? "bg-slate-100 text-slate-900 border-slate-300"
                        : "bg-transparent text-slate-200 border-transparent hover:bg-slate-800 hover:border-slate-700"
                    }`}
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="px-4 py-3 border-t border-slate-800">
        <div className="mb-3">
          <p className="text-xs text-slate-400">Logged in as</p>
          <p className="text-sm text-slate-200 font-medium truncate">{user?.full_name || user?.username}</p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 rounded-md hover:bg-slate-700 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
        <div className="mt-3 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} HAL</p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
