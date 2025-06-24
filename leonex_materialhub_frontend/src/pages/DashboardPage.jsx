// pages/DashboardPage.jsx
import React, { useState, useEffect } from "react";
import { getDashboardStats } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaBoxes,
  FaCheckCircle,
  FaClipboardList, // Using for "Pending Verifications"
  FaMapMarkedAlt,
  FaWarehouse,
  FaDollyFlatbed,
  FaListAlt,
  FaSpinner,
  FaBuilding, // For plant in recent materials
  FaTags, // For category in recent materials
  FaBoxOpen, // For SOH in recent materials
} from "react-icons/fa";
import StatCard from "../components/StatCard";
// SCSS is imported via App.scss or directly if needed

const DashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      const fetchStats = async () => {
        setIsLoadingStats(true);
        try {
          const response = await getDashboardStats();
          setStats(response.data);
        } catch (err) {
          toast.error(
            err.response?.data?.message ||
              "Failed to load dashboard statistics."
          );
          console.error("Fetch dashboard stats error:", err);
        } finally {
          setIsLoadingStats(false);
        }
      };
      fetchStats();
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="container loading-fullscreen">
        {" "}
        {/* Ensure .container is styled globally or here */}
        <FaSpinner className="spinner-icon large-spinner" />
        <p>Loading authentication...</p>
      </div>
    );
  }

  return (
    <div className="container dashboard-page">
      {" "}
      {/* Ensure .container is styled globally or here */}
      <header className="page-header">
        <h1>Dashboard Overview</h1>
        {/* Optional: <p className="page-subtitle">Key metrics and recent activity.</p> */}
      </header>
      <section className="statistics-section">
        <h2>System Statistics</h2>
        {isLoadingStats ? (
          <div className="loading-text">
            <FaSpinner
              className="spinner-icon" // spinner-icon might need specific styling
              style={{ marginRight: "10px" }}
            />{" "}
            Loading statistics...
          </div>
        ) : stats ? (
          <>
            <div className="stats-grid">
              <StatCard
                title="Total Material Codes"
                value={stats.totalMasterMaterials ?? 0}
                icon={<FaBoxes />}
                bgColorClass="bg-blue" // SCSS will handle specific bg
              />
              <StatCard
                title="Completed Verifications"
                value={stats.completedSubmissions ?? 0}
                icon={<FaCheckCircle />}
                bgColorClass="bg-green"
              />
              <StatCard
                title="Pending Verifications"
                value={stats.pendingVerifications ?? 0}
                icon={<FaClipboardList />} // Or FaHourglassHalf
                bgColorClass="bg-yellow"
              />
              <StatCard
                title="Total Unique Plants"
                value={stats.totalPlants ?? 0}
                icon={<FaMapMarkedAlt />}
                bgColorClass="bg-teal"
              />
              <StatCard
                title="Total Unique Categories"
                value={stats.totalCategories ?? 0}
                icon={<FaWarehouse />}
                bgColorClass="bg-purple"
              />
              <StatCard
                title="Total Stock On Hand"
                value={stats.totalStockOnHand?.toLocaleString() ?? 0} // Format number
                icon={<FaDollyFlatbed />}
                bgColorClass="bg-orange"
              />
            </div>

            {stats.recentlyAddedMasterMaterials?.length > 0 && (
              <div className="recent-materials-card">
                {" "}
                {/* SCSS handles card-style */}
                <h3>
                  <FaListAlt />
                  Recently Added Master Materials
                </h3>
                <ul>
                  {stats.recentlyAddedMasterMaterials.map((item) => (
                    <li key={item.material_code}>
                      <div className="recent-material-header">
                        <strong>{item.material_code}</strong> -{" "}
                        {item.material_description}
                      </div>
                      <div className="recent-material-details">
                        <span>
                          <FaBuilding /> {item.plantcode || "N/A"}
                        </span>
                        <span>
                          <FaTags /> {item.category || "N/A"}
                        </span>
                        <span>
                          <FaBoxOpen /> SOH: {item.stock_on_hand ?? "N/A"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="error-message">Could not load statistics.</p>
        )}
      </section>
    </div>
  );
};

export default DashboardPage;
