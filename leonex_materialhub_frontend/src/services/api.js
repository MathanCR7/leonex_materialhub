// services/api.js
import axios from "axios";

const API_URL = "http://localhost:5001/api"; // Your backend URL

const apiClient = axios.create({
  baseURL: API_URL,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    // Content-Type is handled by Axios for FormData, otherwise defaults to application/json
    // For GET requests, Content-Type is not typically needed.
    if (config.method !== "get" && !(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }
    return config;
  },
  (error) => {
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      console.error(
        "Auth error in API interceptor:",
        error.response.data.message
      );
      // Optional: Global logout logic
      // localStorage.removeItem("token");
      // localStorage.removeItem("user");
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const loginUser = (credentials) =>
  apiClient.post("/auth/login", credentials);

export const searchMasterMaterials = (query) =>
  apiClient.get(`/materials/master/search?q=${encodeURIComponent(query)}`);

// Updated to require plantCode
export const getMaterialMasterDetails = (
  materialCode,
  plantCode,
  options = {}
) => {
  if (!plantCode) {
    console.error("getMaterialMasterDetails called without plantCode");
    return Promise.reject(
      new Error("Plant code is required to get material master details.")
    );
  }
  return apiClient.get(
    `/materials/master/${encodeURIComponent(
      materialCode
    )}/details?plantCode=${encodeURIComponent(plantCode)}`,
    options
  );
};

export const getUniqueMaterialValues = (field, options = {}) =>
  apiClient.get(
    `/materials/master/unique-values?field=${encodeURIComponent(field)}`,
    options
  );

export const submitMaterialData = (formData) =>
  apiClient.post("/material-data/submit", formData); // formData should contain 'plant' (plantCode)

// This API already expects plantCode as a query param in the backend controller
export const getLatestMaterialSubmission = (
  materialCode,
  plantCode,
  options = {}
) => {
  if (!plantCode) {
    console.error("getLatestMaterialSubmission called without plantCode");
    return Promise.reject(
      new Error("Plant code is required to get the latest submission.")
    );
  }
  return apiClient.get(
    `/material-data/latest/${encodeURIComponent(
      materialCode
    )}?plantCode=${encodeURIComponent(plantCode)}`,
    options
  );
};

export const updateMaterialData = (
  submissionId,
  formData // formData for update doesn't need to resend material_code/plant
) => apiClient.put(`/material-data/update/${submissionId}`, formData);

export const getCompletedSubmissions = (
  params // params can include search, sortBy, etc.
) => apiClient.get("/material-data/completed/all", { params });

export const getSubmissionDetailsById = (submissionId) =>
  apiClient.get(`/material-data/${submissionId}`);

export const getDashboardStats = () => apiClient.get("/dashboard/stats");

// This is less used, but updated to accept plantCode for consistency
export const getMaterialMasterDescription = (
  materialCode,
  plantCode = null,
  options = {}
) => {
  let url = `/materials/master/${encodeURIComponent(materialCode)}/description`;
  if (plantCode) {
    url += `?plantCode=${encodeURIComponent(plantCode)}`;
  }
  return apiClient.get(url, options);
};

export default apiClient;
