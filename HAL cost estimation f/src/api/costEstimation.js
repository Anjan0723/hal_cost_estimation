import api from "./client";

export const calculateCostEstimation = async (payload) => {
  const response = await api.post("/cost-estimation/calculate", payload);
  return response.data;
};

export const calculateCompleteCostEstimation = async (payload) => {
  const response = await api.post("/cost-estimation/calculate-complete", payload);
  return response.data;
};

export const calculateMhrComplete = async (payload) => {
  const response = await api.post("/cost-estimation/calculate-mhr-complete", payload);
  return response.data;
};

export const calculateMhrFromInputs = async (payload) => {
  const response = await api.post("/mhr/calculate", payload);
  return response.data;
};

export const calculateNrc = async (payload) => {
  const response = await api.post("/cost-estimation/calculate-nrc", payload);
  return response.data;
};

export const calculateMaterialCost = async (payload) => {
  const response = await api.post("/cost-estimation/calculate-material-cost", payload);
  return response.data;
};
