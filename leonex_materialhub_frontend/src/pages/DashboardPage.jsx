// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import { getDashboardStats } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import {
  FaBoxes,
  FaCheckCircle,
  FaClipboardList,
  FaMapMarkedAlt,
  FaWarehouse,
  FaDollyFlatbed,
  FaListAlt,
  FaSpinner,
  FaBuilding,
  FaTags,
  FaBoxOpen,
  FaUserTie,
  FaFileInvoiceDollar,
  FaClock,
  FaChartBar,
  FaChartPie,
} from "react-icons/fa";
import StatCard from "../components/StatCard";

const DashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const navigate = useNavigate();

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

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return "₹0.00";
    return `₹${Number(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (authLoading) {
    return (
      <div className="loading-fullscreen">
        <FaSpinner className="spinner-icon large-spinner" /> <p>Loading...</p>
      </div>
    );
  }

  if (user?.role === "thirdparties") {
    const financialData = stats
      ? [
          { name: "Good", value: stats.totalGoodMaterialValue },
          { name: "Package Defects", value: stats.totalPackageDefectsValue },
          { name: "Physical Defects", value: stats.totalPhysicalDefectsValue },
          { name: "Other Defects", value: stats.totalOtherDefectsValue },
        ].filter((d) => d.value > 0)
      : [];
    const PIE_COLORS = ["#34c759", "#ff9500", "#ff3b30", "#6c757d"];

    return (
      <div className="container dashboard-page">
        <header className="page-header">
          <h1>Welcome, {user.username}</h1>
          <p className="page-subtitle">
            Your portal for providing cost estimations.
          </p>
        </header>

        {isLoadingStats ? (
          <div className="loading-text">
            {" "}
            <FaSpinner className="spinner-icon" /> Loading your stats...{" "}
          </div>
        ) : stats ? (
          <div className="third-party-dashboard-layout">
            <div className="stats-grid">
              <StatCard
                title="Submissions Ready for Estimation"
                value={stats.totalCompletedSubmissions ?? 0}
                icon={<FaClipboardList />}
                bgColorClass="bg-blue"
              />
              <div
                onClick={() => navigate("/provided-estimations")}
                style={{ cursor: "pointer" }}
              >
                <StatCard
                  title="Your Estimations Provided"
                  value={stats.estimationsProvided ?? 0}
                  icon={<FaCheckCircle />}
                  bgColorClass="bg-green"
                />
              </div>
              <div
                onClick={() => navigate("/submissions-for-estimation")}
                style={{ cursor: "pointer" }}
              >
                <StatCard
                  title="Estimations Pending Your Input"
                  value={stats.pendingEstimations ?? 0}
                  icon={<FaClock />}
                  bgColorClass="bg-yellow"
                />
              </div>
              <StatCard
                title="Assigned Plants"
                value={stats.assignedPlants ?? 0}
                icon={<FaMapMarkedAlt />}
                bgColorClass="bg-teal"
              />
            </div>
            <div className="financial-grid stats-grid">
              <StatCard
                title="Total Estimated Value"
                value={formatCurrency(stats.totalEstimatedValue)}
                icon={<FaFileInvoiceDollar />}
                bgColorClass="bg-primary"
              />
              <StatCard
                title="Good Material Value"
                value={formatCurrency(stats.totalGoodMaterialValue)}
                icon={<FaBoxes />}
                bgColorClass="bg-success-light"
              />
              <StatCard
                title="Package Defect Value"
                value={formatCurrency(stats.totalPackageDefectsValue)}
                icon={<FaBoxOpen />}
                bgColorClass="bg-warning-light"
              />
              <StatCard
                title="Physical & Other Defect Value"
                value={formatCurrency(
                  stats.totalPhysicalDefectsValue + stats.totalOtherDefectsValue
                )}
                icon={<FaDollyFlatbed />}
                bgColorClass="bg-danger-light"
              />
            </div>

            {stats.totalEstimatedValue > 0 ? (
              <div className="charts-container">
                <div className="chart-card">
                  <h3>
                    <FaChartBar /> Estimation Value by Category
                  </h3>
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={financialData}
                        margin={{ top: 5, right: 20, left: 30, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(value) => `₹${value / 1000}k`} />
                        <Tooltip
                          formatter={(value) => formatCurrency(value)}
                          cursor={{ fill: "rgba(230, 242, 255, 0.5)" }}
                        />
                        <Legend />
                        <Bar
                          dataKey="value"
                          name="Total Value"
                          fill="#007aff"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="chart-card">
                  <h3>
                    <FaChartPie /> Value Distribution
                  </h3>
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={financialData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={"80%"}
                          dataKey="value"
                          nameKey="name"
                          label={(entry) =>
                            `${(
                              (entry.value / stats.totalEstimatedValue) *
                              100
                            ).toFixed(0)}%`
                          }
                        >
                          {financialData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="welcome-card card-style">
                <FaFileInvoiceDollar size={50} />
                <h2>No estimations provided yet.</h2>
                <p>
                  Once you provide cost estimations, your financial breakdown
                  and charts will appear here.
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="error-message">Could not load your statistics.</p>
        )}
      </div>
    );
  }

  // --- Dashboard for Admin and Cataloguer ---
  return (
    <div className="container dashboard-page">
      <header className="page-header">
        <h1>Dashboard Overview</h1>
        {user.role === "cataloguer" && (
          <p className="page-subtitle">
            Showing statistics for your assigned plants.
          </p>
        )}
      </header>
      <section className="statistics-section">
        {isLoadingStats ? (
          <div className="loading-text">
            <FaSpinner className="spinner-icon" /> Loading statistics...
          </div>
        ) : stats ? (
          <>
            <div className="stats-grid">
              <div
                onClick={() =>
                  user.role === "admin" && navigate("/material-management")
                }
                style={{
                  cursor: user.role === "admin" ? "pointer" : "default",
                }}
              >
                <StatCard
                  title="Total Material Codes"
                  value={stats.totalMasterMaterials ?? 0}
                  icon={<FaBoxes />}
                  bgColorClass="bg-blue"
                />
              </div>
              <div
                onClick={() =>
                  user.role === "admin" && navigate("/material-status")
                }
                style={{
                  cursor: user.role === "admin" ? "pointer" : "default",
                }}
              >
                <StatCard
                  title="Completed Submissions"
                  value={stats.completedSubmissions ?? 0}
                  icon={<FaCheckCircle />}
                  bgColorClass="bg-green"
                />
              </div>
              <StatCard
                title="Pending Verifications"
                value={stats.pendingVerifications ?? 0}
                icon={<FaClipboardList />}
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
                value={stats.totalStockOnHand?.toLocaleString() ?? 0}
                icon={<FaDollyFlatbed />}
                bgColorClass="bg-orange"
              />
            </div>
            {stats.recentlyAddedMasterMaterials?.length > 0 && (
              <div className="recent-materials-card">
                <h3>
                  <FaListAlt /> Recently Added Materials
                </h3>
                <ul>
                  {stats.recentlyAddedMasterMaterials.map((item, index) => (
                    <li key={`${item.material_code}-${index}`}>
                      <div className="recent-material-header">
                        <strong>{item.material_code}</strong> -{" "}
                        {item.material_description}
                      </div>
                      <div className="recent-material-details">
                        <span>
                          <FaBuilding />{" "}
                          {item.plantlocation
                            ? `${item.plantlocation} (${item.plantcode})`
                            : item.plantcode || "N/A"}
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
