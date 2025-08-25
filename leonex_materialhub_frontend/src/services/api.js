// src/services/api.js
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const apiClient = axios.create({
  baseURL: API_URL,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    if (config.method !== "get" && !(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const loginUser = (credentials) =>
  apiClient.post("/auth/login", credentials);

export const searchMasterMaterials = (query) =>
  apiClient.get(`/materials/master/search?q=${encodeURIComponent(query)}`);

export const getMaterialMasterDetails = (
  materialCode,
  plantCode,
  options = {}
) => {
  if (!plantCode) {
    return Promise.reject(new Error("Plant code is required."));
  }
  // MODIFICATION: materialCode is now a query parameter
  return apiClient.get(
    `/materials/master/details?materialCode=${encodeURIComponent(
      materialCode
    )}&plantCode=${encodeURIComponent(plantCode)}`,
    options
  );
};

export const getUniqueMaterialValues = (field, options = {}) =>
  apiClient.get(
    `/materials/master/unique-values?field=${encodeURIComponent(field)}`,
    options
  );

export const submitMaterialData = (formData) =>
  apiClient.post("/material-data/submit", formData);

export const getLatestMaterialSubmission = (
  materialCode,
  plantCode,
  options = {}
) => {
  if (!plantCode) {
    return Promise.reject(new Error("Plant code is required."));
  }
  return apiClient.get(
    `/material-data/latest/${encodeURIComponent(
      materialCode
    )}?plantCode=${encodeURIComponent(plantCode)}`,
    options
  );
};

export const updateMaterialData = (submissionId, formData) =>
  apiClient.put(`/material-data/update/${submissionId}`, formData);

export const getCompletedSubmissions = (params) =>
  apiClient.get("/material-data/completed/all", { params });

export const getSubmissionDetailsById = (submissionId) =>
  apiClient.get(`/material-data/${submissionId}`);

export const getDashboardStats = () => apiClient.get("/dashboard/stats");

export const getAllUsers = () => apiClient.get("/users");
export const createUser = (userData) => apiClient.post("/users", userData);
export const updateUser = (id, userData) =>
  apiClient.put(`/users/${id}`, userData);

export const getUniquePlants = () => apiClient.get("/plants/unique");

export const submitCostEstimation = (submissionId, estimationData) =>
  apiClient.post(`/estimations/${submissionId}`, estimationData);
export const getCostEstimationsForSubmission = (submissionId) =>
  apiClient.get(`/estimations/${submissionId}`);

// This function fetches the paginated list for the "My Provided Estimations" page.
export const getMyProvidedEstimations = (params) =>
  apiClient.get("/estimations/my-estimations", { params });

// This new function fetches a single estimation for the current user to populate an edit form.
export const getMyEstimationForSubmission = (submissionId) =>
  apiClient.get(`/estimations/my-estimation/${submissionId}`);



// <<< MODIFICATION: getMyActions is replaced by two new functions >>>
// Fetches the list for the "My Reworks" page
export const getMyReworks = (params) =>
  apiClient.get("/estimations/my-reworks", { params });

// Fetches the list for the "My Rejections" page
export const getMyRejections = (params) =>
  apiClient.get("/estimations/my-rejections", { params });
// <<< END MODIFICATION >>>





// ==========================================================================
export const getAdminAllReworks = (params) => apiClient.get('/users/reports/reworks', { params });
export const getAdminAllRejections = (params) => apiClient.get('/users/reports/rejections', { params });
export const getThirdPartyUsers = () => apiClient.get('/users/third-parties/list');



// --- NEW Material Management API functions ---
export const getManagedMaterials = (params) =>
  apiClient.get("/materials/manage", { params });

export const downloadMaterialTemplate = () =>
  apiClient.get("/materials/manage/template", { responseType: "blob" });

export const importMaterials = (formData) =>
  apiClient.post("/materials/manage/import", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });



  

// --- REPORTING API FUNCTIONS ---
export const getCostSummaryReport = (options = {}) =>
  apiClient.get("/reports/cost-summary", options);

export const getCostDetailReportForUser = (userId, options = {}) =>
  apiClient.get(`/reports/cost-details/${userId}`, options);


// DEFINITIVE FIX: Added the missing export for the plant dropdown.
export const getUniquePlantsForReport = () => 
  apiClient.get("/reports/unique-plants");


// --- NEW STOCK REPORT API FUNCTIONS ---
export const getStockReport = (params) =>
  apiClient.get("/stock-report", { params });
  
export const getUniqueSubmittersForReport = () =>
  apiClient.get("/stock-report/unique-submitters");
// --- END NEW STOCK REPORT FUNCTIONS ---




// --- NEW WORKFLOW API FUNCTIONS START ---
export const getAssignedReworks = (params) =>
  apiClient.get("/material-data/reworks/assigned", { params });

export const updateSubmissionStatus = (submissionId, data) =>
  apiClient.put(`/material-data/status/${submissionId}`, data);
// --- NEW WORKFLOW API FUNCTIONS END ---



export default apiClient;
