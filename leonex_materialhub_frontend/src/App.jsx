// src/App.jsx

import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Sidebar from "./components/Sidebar";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import MaterialCodePage from "./pages/MaterialCodePage";
import MaterialDataFormPage from "./pages/MaterialDataFormPage";
import MaterialStatusPage from "./pages/MaterialStatusPage";
import ExportDataPage from "./pages/ExportDataPage";
import UserManagementPage from "./pages/UserManagementPage";
import MaterialManagementPage from "./pages/MaterialManagementPage";
import ProvidedEstimationsPage from "./pages/ProvidedEstimationsPage";
import SubmissionsForEstimationPage from "./pages/SubmissionsForEstimationPage";
import MaterialInspectionPage from "./pages/MaterialInspectionPage";
import CostEstimateReportPage from "./pages/CostEstimateReportPage";
import StockReportPage from './pages/StockReportPage';
import MyReworksPage from './pages/MyReworksPage';
import MyRejectionsPage from './pages/MyRejectionsPage';
import AdminReworksPage from './pages/AdminReworksPage'; // Import new admin page
import AdminRejectionsPage from './pages/AdminRejectionsPage';
import ReworksPage from './pages/ReworksPage'; // Correct: Only one import is needed
import { ToastContainer } from "react-toastify";
import { FaBars } from "react-icons/fa";
import "react-toastify/dist/ReactToastify.css";
import "./App.scss";

// No changes needed for ProtectedRoute
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="loading-fullscreen">
        <div className="spinner-icon large-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function AppContent() {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className={`app-layout ${user ? "has-sidebar" : "no-sidebar"}`}>
      {user && <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />}

      <main className="main-content">
        {user && (
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="menu-toggle-btn"
            aria-label="Toggle Menu"
          >
            <FaBars />
          </button>
        )}

        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/material-codes"
            element={
              <ProtectedRoute>
                <MaterialCodePage />
              </ProtectedRoute>
            }
          />

          {/* === MODIFICATION START: UPDATED ROUTE PERMISSIONS === */}
          <Route
            path="/material-form/:materialCode"
            element={
              <ProtectedRoute allowedRoles={["admin", "cataloguer"]}>
                <MaterialDataFormPage />
              </ProtectedRoute>
            }
          />
          {/* === MODIFICATION END === */}

          <Route
            path="/material-status"
            element={
              <ProtectedRoute allowedRoles={["admin", "cataloguer"]}>
                <MaterialStatusPage />
              </ProtectedRoute>
            }
          />


            {/* === NEW STOCK REPORT ROUTE === */}
          <Route
            path="/stock-report"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <StockReportPage />
              </ProtectedRoute>
            }
          />
           {/* === NEW ADMIN ROUTES ADDED === */}

           
          <Route
            path="/user-management"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/export-data"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <ExportDataPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inspection/:submissionId"
            element={
              <ProtectedRoute
                allowedRoles={["admin", "cataloguer", "thirdparties"]}
              >
                <MaterialInspectionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/material-management"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <MaterialManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cost-estimate-report"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <CostEstimateReportPage />
              </ProtectedRoute>
            }
          />
           {/* === NEW ADMIN ROUTES ADDED === */}
          <Route
            path="/admin/reworks"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminReworksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/rejections"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminRejectionsPage />
              </ProtectedRoute>
            }
          />
          {/* === END OF NEW ADMIN ROUTES === */}
          
          <Route
            path="/submissions-for-estimation"
            element={
              <ProtectedRoute allowedRoles={["thirdparties"]}>
                <SubmissionsForEstimationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provided-estimations"
            element={
              <ProtectedRoute allowedRoles={["thirdparties"]}>
                <ProvidedEstimationsPage />
              </ProtectedRoute>
            }
          />
          
          {/* === MODIFICATION START: NEW ROUTE FOR REWORKS PAGE === */}
          <Route
            path="/reworks"
            element={
              <ProtectedRoute allowedRoles={["cataloguer"]}>
                <ReworksPage />
              </ProtectedRoute>
            }
          />
          {/* === MODIFICATION END === */}


          {/* --- MODIFICATION: Add the two new routes --- */}
          <Route
            path="/my-reworks"
            element={
              <ProtectedRoute allowedRoles={["thirdparties"]}>
                <MyReworksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-rejections"
            element={
              <ProtectedRoute allowedRoles={["thirdparties"]}>
                <MyRejectionsPage />
              </ProtectedRoute>
            }
          />
          {/* The old "/my-actions" route is now removed */}
          {/* --- END MODIFICATION --- */}



          <Route
            path="*"
            element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
          />
        </Routes>
      </main>
    </div>
  );
}

// No changes needed for App component
function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={true}
          theme="colored"
        />
      </AuthProvider>
    </Router>
  );
}

export default App;