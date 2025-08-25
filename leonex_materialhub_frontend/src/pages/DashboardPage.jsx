import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar,
} from "recharts";
import { getDashboardStats } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import {
  FaBoxes, FaCheckCircle, FaClipboardList, FaFileInvoiceDollar, FaListAlt,
  FaSpinner, FaBuilding, FaTags, FaBoxOpen, FaClock, FaChartPie,
  FaUndo, FaHistory, FaUserClock, FaUserTimes, FaMapMarkedAlt,
  FaWarehouse, FaDollyFlatbed, FaChartBar, FaChartLine, FaUsers,
} from "react-icons/fa";
import StatCard from "../components/StatCard";
import "./_DashboardPage.scss";

// --- SUB-COMPONENTS for a clean and modular structure ---

const DashboardCard = ({ title, subtitle, icon, children, className = '' }) => (
  <div className={`dashboard-card ${className}`}>
    <header className="dashboard-card-header">
      <div className="header-content">
        {icon && <span className="header-icon">{icon}</span>}
        <h3>{title}</h3>
      </div>
      {subtitle && <span className="header-subtitle">{subtitle}</span>}
    </header>
    <div className="dashboard-card-body">
      {children}
    </div>
  </div>
);

const ActivityProgressBar = ({ user, count, total, color }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="activity-progress-bar">
      <div className="user-info">
        <span>{user}</span>
        <span>{count}</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${percentage}%`, backgroundColor: color }}></div>
      </div>
    </div>
  );
};

// --- MAIN DASHBOARD COMPONENT ---

const DashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setIsLoadingStats(true);
    try {
      const response = await getDashboardStats();
      setStats(response.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load dashboard statistics.");
    } finally {
      setIsLoadingStats(false);
    }
  };
  
  const handleStatClick = (path, filter) => {
    if (path) navigate(path, { state: { defaultFilter: filter } });
  };
  
  const totalUserActivity = useMemo(() => {
    return stats?.userActivity?.reduce((sum, item) => sum + item.count, 0) || 0;
  }, [stats]);

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return "₹0.00";
    return `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  if (authLoading || isLoadingStats || !stats) {
    return <div className="loading-fullscreen"><FaSpinner className="spinner-icon large-spinner" /> <p>Loading Dashboard...</p></div>;
  }

  // --- RENDER LOGIC FOR DIFFERENT USER ROLES ---

  // CASE 1: Standard Third-Party User
  if (user?.role === 'thirdparties' && !['itc_user1', 'itc_user2'].includes(user.username)) {
    const financialData = stats ? [{ name: "Good", value: stats.totalGoodMaterialValue }, { name: "Package Defects", value: stats.totalPackageDefectsValue }, { name: "Physical Defects", value: stats.totalPhysicalDefectsValue }, { name: "Other Defects", value: stats.totalOtherDefectsValue }].filter((d) => d.value > 0) : [];
    const PIE_COLORS = ["#28a745", "#ffc107", "#dc3545", "#6c757d"];

    return (
      <div className="container dashboard-page">
        <header className="page-header">
          <h1>Welcome, {user.username}</h1>
          <p className="page-subtitle">Your portal for providing cost estimations.</p>
        </header>
        <div className="dashboard-layout">
          <div className="stats-grid">
            <StatCard title="Submissions for Estimation" value={stats.totalCompletedSubmissions} icon={<FaClipboardList />} bgColorClass="bg-blue" />
            <StatCard title="Estimations Provided" value={stats.estimationsProvided} icon={<FaCheckCircle />} bgColorClass="bg-green" onClick={() => navigate("/provided-estimations")} />
            <StatCard title="Pending Your Input" value={stats.pendingEstimations} icon={<FaClock />} bgColorClass="bg-yellow" onClick={() => navigate("/submissions-for-estimation")} />
            <StatCard title="Assigned Plants" value={stats.assignedPlants} icon={<FaMapMarkedAlt />} bgColorClass="bg-teal"/>
          </div>
          <div className="stats-grid financial-grid">
            <StatCard title="Total Estimated Value" value={formatCurrency(stats.totalEstimatedValue)} icon={<FaFileInvoiceDollar />} bgColorClass="bg-purple"/>
            <StatCard title="Good Material Value" value={formatCurrency(stats.totalGoodMaterialValue)} icon={<FaBoxes />} bgColorClass="bg-green"/>
            <StatCard title="Package Defect Value" value={formatCurrency(stats.totalPackageDefectsValue)} icon={<FaBoxOpen />} bgColorClass="bg-orange"/>
            <StatCard title="Physical & Other Defect Value" value={formatCurrency(stats.totalPhysicalDefectsValue + stats.totalOtherDefectsValue)} icon={<FaDollyFlatbed />} bgColorClass="bg-red"/>
          </div>

          {stats.totalEstimatedValue > 0 ? (
            <div className="charts-container">
              <DashboardCard title="Estimation Value by Category" icon={<FaChartBar />} className="chart-card">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={financialData} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `₹${value / 1000}k`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} cursor={{ fill: "rgba(230, 242, 255, 0.5)" }} />
                    <Legend />
                    <Bar dataKey="value" name="Total Value" fill="#007aff" />
                  </BarChart>
                </ResponsiveContainer>
              </DashboardCard>
              <DashboardCard title="Value Distribution" icon={<FaChartPie />} className="chart-card">
                 <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie data={financialData} cx="50%" cy="50%" labelLine={false} outerRadius={"80%"} dataKey="value" nameKey="name" label={(entry) => `${((entry.value / stats.totalEstimatedValue) * 100).toFixed(0)}%`}>
                      {financialData.map((entry, index) => (<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]}/>))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </DashboardCard>
            </div>
          ) : (
            <div className="welcome-card"><FaFileInvoiceDollar size={50} /><h2>No estimations provided yet.</h2><p>Once you provide cost estimations, your financial breakdown and charts will appear here.</p></div>
          )}
        </div>
      </div>
    );
  }

  // CASE 2: Special ITC Users (Cataloguer-like view without charts)
  if (user?.role === 'thirdparties' && ['itc_user1', 'itc_user2'].includes(user.username)) {
     return (
        <div className="container dashboard-page">
            <header className="page-header"><h1>Dashboard Overview</h1><p className="page-subtitle">Showing statistics for your assigned plants.</p></header>
            <div className="dashboard-layout">
                <div className="stats-grid">
                    <StatCard title="Total Material Codes" value={stats.totalMasterMaterials} icon={<FaBoxes />} bgColorClass="bg-blue" />
                    <StatCard title="Completed Submissions" value={stats.completedSubmissions} icon={<FaCheckCircle />} bgColorClass="bg-green" />
                    <StatCard title="Pending Verifications" value={stats.pendingVerifications} icon={<FaClipboardList />} bgColorClass="bg-yellow" />
                    <StatCard title="Total Unique Plants" value={stats.totalPlants} icon={<FaMapMarkedAlt />} bgColorClass="bg-teal" />
                    <StatCard title="Total Unique Categories" value={stats.totalCategories} icon={<FaWarehouse />} bgColorClass="bg-purple" />
                    <StatCard title="Total Stock On Hand" value={stats.totalStockOnHand?.toLocaleString()} icon={<FaDollyFlatbed />} bgColorClass="bg-orange" />
                </div>
                {stats.recentlyAddedMasterMaterials?.length > 0 && (
                  <DashboardCard title="Recently Added Materials" icon={<FaListAlt />} className="recent-materials-card">
                    <ul>
                      {stats.recentlyAddedMasterMaterials.map((item, index) => (
                        <li key={`${item.material_code}-${index}`}>
                          <div className="recent-material-header"><strong>{item.material_code}</strong> - {item.material_description}</div>
                          <div className="recent-material-details">
                            <span><FaBuilding /> {item.plantlocation ? `${item.plantlocation} (${item.plantcode})` : item.plantcode || "N/A"}</span>
                            <span><FaTags /> {item.category || "N/A"}</span>
                            <span><FaBoxOpen /> SOH: {item.stock_on_hand?.toLocaleString() ?? "N/A"}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </DashboardCard>
                )}
            </div>
        </div>
     );
  }

  // CASE 3: ADVANCED ADMIN & CATALOGUER DASHBOARD
  const STATUS_CHART_COLORS = ['#28a745', '#ffc107', '#17a2b8', '#6c757d', '#dc3545'];

  const { totalMasterMaterials, approvedCount, pendingCount, reworkRequested, reworkCompleted } = stats;

  const calculatePercentage = (count, total) => {
    if (!total || total === 0) {
      return `0.0%`;
    }
    return `${(count / total * 100).toFixed(1)}%`;
  };

  const remainingForAction = totalMasterMaterials - approvedCount;

  return (
    <div className="dashboard-professional">
      <header className="professional-header">
        <h1>Dashboard</h1>
        {user.role === "cataloguer" && <p>Showing data for your assigned plants</p>}
      </header>
      
      <div className="professional-grid">
        {/* --- MODIFICATION START: Wrapper for Stat Cards --- */}
        <div className={`stats-grid-professional ${user.role === 'admin' ? 'stats-grid-admin' : 'stats-grid-cataloguer'}`}>
          <StatCard title="Total Materials" value={<>{totalMasterMaterials} <small className="percentage-badge">100%</small></>} icon={<FaBoxes/>} bgColorClass="bg-blue" size="compact"/>
          <StatCard title="Approved" value={<>{approvedCount} <small className="percentage-badge">{calculatePercentage(approvedCount, totalMasterMaterials)}</small></>} icon={<FaCheckCircle/>} onClick={() => handleStatClick('/material-status', ['APPROVED'])} bgColorClass="bg-green" size="compact" />
          <StatCard title="Remaining" value={<>{remainingForAction} <small className="percentage-badge">{calculatePercentage(remainingForAction, totalMasterMaterials)}</small></>} icon={<FaClipboardList/>} onClick={() => handleStatClick('/material-status', ['PENDING', 'REWORK_REQUESTED', 'REWORK_COMPLETED'])} bgColorClass="bg-orange" size="compact" />
          <StatCard title="Pending Review" value={<>{pendingCount} <small className="percentage-badge">{calculatePercentage(pendingCount, totalMasterMaterials)}</small></>} icon={<FaClock/>} onClick={() => handleStatClick('/material-status', ['PENDING'])} bgColorClass="bg-gray" size="compact" />
          <StatCard title="Needs Rework" value={<>{reworkRequested} <small className="percentage-badge">{calculatePercentage(reworkRequested, totalMasterMaterials)}</small></>} icon={<FaUndo/>} onClick={() => handleStatClick('/material-status', ['REWORK_REQUESTED'])} bgColorClass="bg-red" size="compact" />
          
          {user.role === 'admin' && (
            <StatCard title="Rework Completed" value={<>{reworkCompleted} <small className="percentage-badge">{calculatePercentage(reworkCompleted, totalMasterMaterials)}</small></>} icon={<FaHistory/>} onClick={() => handleStatClick('/material-status', ['REWORK_COMPLETED'])} bgColorClass="bg-yellow" size="compact" />
          )}
        </div>
        {/* --- MODIFICATION END --- */}

        <DashboardCard title="Status Distribution" icon={<FaChartPie />} className="donut-chart-card">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={stats.statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" paddingAngle={5}>
                {stats.statusDistribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={STATUS_CHART_COLORS[index % STATUS_CHART_COLORS.length]} />))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-legend">
            {stats.statusDistribution.map((entry, index) => (<div className="legend-item" key={index}><span className="dot" style={{ backgroundColor: STATUS_CHART_COLORS[index % STATUS_CHART_COLORS.length] }}></span><span>{entry.name}</span><span className="value">{entry.value}</span></div>))}
          </div>
        </DashboardCard>

        <DashboardCard title="Submissions Over Time" subtitle="Last 30 Days" icon={<FaChartLine />} className="area-chart-card">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={stats.submissionsOverTime} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs><linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#007aff" stopOpacity={0.8}/><stop offset="95%" stopColor="#007aff" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} /><YAxis tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#007aff" strokeWidth={2} fillOpacity={1} fill="url(#colorSubmissions)" name="Submissions"/>
            </AreaChart>
          </ResponsiveContainer>
        </DashboardCard>

        <DashboardCard title="User Activity" subtitle={`${totalUserActivity} total`} icon={<FaUsers />} className="user-activity-card">
          {stats.userActivity.map((activity, index) => (<ActivityProgressBar key={index} user={activity.username} count={activity.count} total={totalUserActivity} color={['#007aff', '#34c759', '#ff9500', '#ff3b30', '#5856d6'][index % 5]} />))}
        </DashboardCard>
        
        <DashboardCard title="Recently Added Materials" icon={<FaListAlt />} className="recent-items-card">
           <ul className="recent-list">
            {stats.recentlyAddedMasterMaterials.map((item, index) => (<li key={index}><div className="item-icon"><FaBoxOpen/></div><div className="item-details"><strong>{item.material_code}</strong><span>{item.material_description}</span></div><div className="item-meta"><span>{item.plantlocation}</span><span className="stock">{item.stock_on_hand?.toLocaleString()} SOH</span></div></li>))}
          </ul>
        </DashboardCard>

        {user.role === 'admin' && (
          <DashboardCard title="Third-Party Actions" icon={<FaUserClock />} className="third-party-actions-card">
            <div className="action-item" onClick={() => navigate('/admin/reworks')}>
                <FaUserClock className="icon purple"/>
                <div className="details"><span>Rework Requests</span><strong>{stats.thirdPartyReworks}</strong></div>
            </div>
            <div className="action-item" onClick={() => navigate('/admin/rejections')}>
                <FaUserTimes className="icon orange"/>
                <div className="details"><span>Rejections</span><strong>{stats.thirdPartyRejections}</strong></div>
            </div>
          </DashboardCard>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;