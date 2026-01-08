import api from "./client";

// Get all projects
export const getProjects = async () => {
  const response = await api.get("/projects/");
  return response.data;
};

// Get a single project by ID
export const getProject = async (id) => {
  const response = await api.get(`/projects/${id}`);
  return response.data;
};

// Create a new project
export const createProject = async (formData) => {
  const response = await api.post("/projects/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// Update a project
export const updateProject = async (id, formData) => {
  const response = await api.put(`/projects/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// Delete a project
export const deleteProject = async (id) => {
  const response = await api.delete(`/projects/${id}`);
  return response.data;
};

// Get parts for a project
export const getProjectParts = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/parts`);
  return response.data;
};

// Add a part to a project
export const addProjectPart = async (projectId, formData) => {
  const response = await api.post(`/projects/${projectId}/parts`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// Update a part
export const updatePart = async (partId, formData) => {
  const response = await api.put(`/projects/parts/${partId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Delete a part
export const deleteProjectPart = async (partId) => {
  const response = await api.delete(`/projects/parts/${partId}`);
  return response.data;
};
