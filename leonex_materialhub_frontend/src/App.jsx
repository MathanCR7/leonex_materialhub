import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import TopBar from "./components/TopBar";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import MaterialCodePage from "./pages/MaterialCodePage";
import MaterialDataFormPage from "./pages/MaterialDataFormPage";
import MaterialStatusPage from "./pages/MaterialStatusPage";
import ExportDataPage from "./pages/ExportDataPage";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.scss"; // Imports src/scss/main.scss and all other styles

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="loading-fullscreen">
        <div className="spinner-icon large-spinner"></div>{" "}
        {/* Optional: Add actual spinner SVG/component */}
        <p>Loading Authentication...</p>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" />;
}

function AppContent() {
  const { user } = useAuth();
  return (
    <>
      <TopBar />
      {/* The 'container' class can be added here if the whole main content area should be constrained */}
      {/* Or, individual pages can use the 'container' class themselves */}
      <main className="main-content">
        {" "}
        {/* Ensure this matches _base.scss target */}
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
          <Route
            path="/material-form/:materialCode"
            element={
              <ProtectedRoute>
                <MaterialDataFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/material-status"
            element={
              <ProtectedRoute>
                <MaterialStatusPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/export-data"
            element={
              <ProtectedRoute>
                <ExportDataPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={<Navigate to={user ? "/dashboard" : "/login"} />}
          />
        </Routes>
      </main>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </AuthProvider>
    </Router>
  );
}

export default App;
