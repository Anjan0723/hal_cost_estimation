import React, { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import Sidebar from "./components/Sidebar.jsx";
import ConfigurationPage from "./pages/ConfigurationPage.jsx";
import CostEstimationPage from "./pages/CostEstimationPage.jsx";
import ProjectsPage from "./pages/ProjectsPage.jsx";
import CreateProjectPage from "./pages/CreateProjectPage.jsx";
import ProjectDetailPage from "./pages/ProjectDetailPage.jsx";
import EditProjectPage from "./pages/EditProjectPage.jsx";
import PartCostEstimationPage from "./pages/PartCostEstimationPage.jsx";
import OperationTypesPage from "./pages/config/OperationTypesPage.jsx";
import MachinesPage from "./pages/config/MachinesPage.jsx";
import DimensionsPage from "./pages/config/DimensionsPage.jsx";
import DutiesPage from "./pages/config/DutiesPage.jsx";
import MaterialsPage from "./pages/config/MaterialsPage.jsx";
import MachineSelectionPage from "./pages/config/MachineSelectionPage.jsx";
import MhrPage from "./pages/config/MhrPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";

function AppContent() {
  const [activeSection, setActiveSection] = useState("configuration");
  const [createdProject, setCreatedProject] = useState(null);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [editProjectId, setEditProjectId] = useState(null);
  const [currentPartId, setCurrentPartId] = useState(null);
  const { isAuthenticated, isLoading, user } = useAuth();

  const handleSectionChange = (section, data) => {
    if (section === "project_detail" && data?.projectId) {
      setCurrentProjectId(data.projectId);
    } else if (section === "edit_project" && data?.projectId) {
      setEditProjectId(data.projectId);
    } else if (section === "part_cost_estimation" && data?.projectId && data?.partId) {
      setCurrentProjectId(data.projectId);
      setCurrentPartId(data.partId);
    }
    setActiveSection(section);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden text-slate-900">
      <div className="flex h-full">
        <Sidebar active={activeSection} onChange={handleSectionChange} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-white/1 backdrop-blur-sm">
          {activeSection === "configuration" && <ConfigurationPage />}
          {activeSection === "cost_estimation" && <CostEstimationPage />}
          {activeSection === "projects" && <ProjectsPage onChange={handleSectionChange} />}
          {activeSection === "create_project" && <CreateProjectPage onChange={handleSectionChange} onCreate={setCreatedProject} />}
          {activeSection === "project_detail" && <ProjectDetailPage onChange={handleSectionChange} projectId={currentProjectId} />}
          {activeSection === "part_cost_estimation" && (
            <PartCostEstimationPage onChange={handleSectionChange} projectId={currentProjectId} partId={currentPartId} />
          )}
          {activeSection === "edit_project" && <EditProjectPage onChange={handleSectionChange} projectId={editProjectId} />}
          {activeSection === "config_operation_types" && <OperationTypesPage />}
          {activeSection === "config_machines" && <MachinesPage />}
          {activeSection === "config_dimensions" && <DimensionsPage />}
          {activeSection === "config_duties" && <DutiesPage />}
          {activeSection === "config_materials" && <MaterialsPage />}
          {activeSection === "config_machine_selection" && <MachineSelectionPage />}
          {activeSection === "config_mhr" && <MhrPage />}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
