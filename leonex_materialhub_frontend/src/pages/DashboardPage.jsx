import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, LineChart, Line
} from "recharts";
import { getDashboardStats } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import {
  FaBoxes, FaCheckCircle, FaClipboardList, FaFileInvoiceDollar, FaListAlt, FaSpinner, FaBuilding,
  FaTags, FaBoxOpen, FaClock, FaChartPie, FaUndo, FaHistory, FaUserClock, FaUserTimes, FaMapMarkedAlt,
  FaWarehouse, FaDollyFlatbed, FaChartLine, FaUsers, FaUserCog, FaCogs, FaSitemap, FaInfoCircle
} from "react-icons/fa";
import StatCard from "../components/StatCard";
import "./_DashboardPage.scss";

// --- SUB-COMPONENTS for a clean and modular structure ---

const DashboardCard = ({ title, subtitle, icon, children, className = '', count }) => (
  <div className={`dashboard-card ${className}`}>
    <header className="dashboard-card-header">
      <div className="header-text-content">
        <div className="header-title-row">
          <span className="header-icon-wrapper">{icon}</span>
          <h3>{title}</h3>
        </div>
        {subtitle && <span className="header-subtitle">{subtitle}</span>}
      </div>
      {typeof count === 'number' && <span className="header-count-badge">{count}</span>}
    </header>
    <div className="dashboard-card-body">
      {children}
    </div>
  </div>
);

const RoleTag = ({ role }) => {
    const roleMap = {
        admin: { label: 'Admin', icon: <FaCogs />, className: 'role-admin' },
        cataloguer: { label: 'Cataloguer', icon: <FaTags />, className: 'role-cataloguer' },
        thirdparties: { label: 'Third Party', icon: <FaUserCog />, className: 'role-thirdparty' }
    };
    const roleInfo = roleMap[role] || { label: role, icon: null, className: '' };
    return <span className={`role-tag ${roleInfo.className}`}>{roleInfo.icon}{roleInfo.label}</span>;
}

// --- MAIN DASHBOARD COMPONENT ---
const DashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) fetchDashboardData();
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
  
  const totalUserActivity = useMemo(() => stats?.userActivity?.reduce((sum, item) => sum + item.count, 0) || 0, [stats]);

  const formatCurrency = (value) => value === null || value === undefined ? "₹0.00" : `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  // Data processing for new admin charts
  const userSubmissionsData = useMemo(() => {
      if (!stats?.submissionsByUserOverTime) return [];
      const pivotedData = stats.submissionsByUserOverTime.reduce((acc, { date, username, count }) => {
          const formattedDate = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (!acc[formattedDate]) acc[formattedDate] = { date: formattedDate };
          acc[formattedDate][username] = (acc[formattedDate][username] || 0) + count;
          return acc;
      }, {});
      return Object.values(pivotedData).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [stats?.submissionsByUserOverTime]);

  const allUsernamesForChart = useMemo(() => {
      if (!stats?.submissionsByUserOverTime) return [];
      return [...new Set(stats.submissionsByUserOverTime.map(item => item.username))];
  }, [stats?.submissionsByUserOverTime]);


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
              <DashboardCard title="Estimation Value by Category" icon={<FaChartLine />} className="chart-card">
                 <ResponsiveContainer width="100%" height={350}><BarChart data={financialData} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis tickFormatter={(value) => `₹${value / 1000}k`} /><Tooltip formatter={(value) => formatCurrency(value)} cursor={{ fill: "rgba(230, 242, 255, 0.5)" }} /><Legend /><Bar dataKey="value" name="Total Value" fill="#007aff" /></BarChart></ResponsiveContainer>
              </DashboardCard>
              <DashboardCard title="Value Distribution" icon={<FaChartPie />} className="chart-card">
                 <ResponsiveContainer width="100%" height={350}><PieChart><Pie data={financialData} cx="50%" cy="50%" labelLine={false} outerRadius={"80%"} dataKey="value" nameKey="name" label={(entry) => `${((entry.value / stats.totalEstimatedValue) * 100).toFixed(0)}%`}>{financialData.map((entry, index) => (<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]}/>))}</Pie><Tooltip formatter={(value) => formatCurrency(value)} /><Legend /></PieChart></ResponsiveContainer>
              </DashboardCard>
            </div>
          ) : ( <div className="welcome-card"><FaFileInvoiceDollar size={50} /><h2>No estimations provided yet.</h2><p>Once you provide cost estimations, your financial breakdown and charts will appear here.</p></div> )}
        </div>
      </div>
    );
  }

  // CASE 2: Special ITC Users
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
                    <ul className="scrollable-list">
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
  const USER_LINE_COLORS = ["#ffca28", "#66bb6a", "#42a5f5", "#ef5350", "#ab47bc"];
  const PLANT_BAR_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF"];
  
  const { totalMasterMaterials, approvedCount, pendingCount, reworkRequested, reworkCompleted } = stats;
  const calculatePercentage = (count, total) => total > 0 ? `${(count / total * 100).toFixed(1)}%` : `0.0%`;
  const remainingForAction = totalMasterMaterials - approvedCount;

  return (
    <div className="dashboard-professional">

      
      <div className={`professional-grid professional-grid-${user.role}`}>
        {/* --- TOP STATS ROW --- */}
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

        {/* --- ROW 1: CHARTS --- */}
        <DashboardCard title="Status Distribution" icon={<FaChartPie />} className="donut-chart-card">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart><Pie data={stats.statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" paddingAngle={5}>{stats.statusDistribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={STATUS_CHART_COLORS[index % STATUS_CHART_COLORS.length]} />))}</Pie><Tooltip /></PieChart>
          </ResponsiveContainer>
          <div className="donut-legend">
            {stats.statusDistribution.map((entry, index) => (<div className="legend-item" key={index}><span className="dot" style={{ backgroundColor: STATUS_CHART_COLORS[index % STATUS_CHART_COLORS.length] }}></span><span>{entry.name}</span><span className="value">{entry.value}</span></div>))}
          </div>
        </DashboardCard>

        {user.role === 'admin' && (
            <DashboardCard title="User Activity" subtitle={`${totalUserActivity} total submissions`} icon={<FaUsers />} className="user-activity-card">
               <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.userActivity} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <defs><linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#007aff" stopOpacity={0.9}/><stop offset="95%" stopColor="#5856d6" stopOpacity={0.8}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="username" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip cursor={{ fill: 'rgba(230, 242, 255, 0.5)' }} />
                  <Legend />
                  <Bar dataKey="count" name="Submissions" barSize={25} radius={[4, 4, 0, 0]} fill="url(#colorActivity)" />
                </BarChart>
              </ResponsiveContainer>
            </DashboardCard>
        )}
        
        <DashboardCard title="Submissions Over Time" subtitle="Last 30 Days" icon={<FaChartLine />} className="area-chart-card">
          <ResponsiveContainer width="100%" height={300}><AreaChart data={stats.submissionsOverTime} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}><defs><linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#007aff" stopOpacity={0.8}/><stop offset="95%" stopColor="#007aff" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} /><YAxis tickLine={false} axisLine={false} fontSize={12} /><Tooltip /><Area type="monotone" dataKey="count" stroke="#007aff" strokeWidth={2} fillOpacity={1} fill="url(#colorSubmissions)" name="Submissions"/></AreaChart></ResponsiveContainer>
        </DashboardCard>
        
         {/* --- NEW ROW 2 (ADMIN ONLY): ADVANCED ANALYTICS --- */}
        {user.role === 'admin' && (
          <>
            <DashboardCard title="User Submission Comparison" subtitle="Last 30 Days" icon={<FaUsers />} className="user-submission-comparison-card">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={userSubmissionsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {allUsernamesForChart.map((username, index) => (
                    <Line key={username} type="monotone" dataKey={username} stroke={USER_LINE_COLORS[index % USER_LINE_COLORS.length]} strokeWidth={2} activeDot={{ r: 8 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </DashboardCard>
            
            <DashboardCard title="Top 10 Plant Submissions" icon={<FaBuilding />} className="submissions-by-plant-card">
               <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.submissionsByPlant} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="plant" type="category" width={80} />
                    <Tooltip cursor={{ fill: 'rgba(230, 242, 255, 0.5)' }} />
                    <Legend />
                    <Bar dataKey="count" name="Submissions" fill="#28a745" barSize={20}>
                      {stats.submissionsByPlant.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PLANT_BAR_COLORS[index % PLANT_BAR_COLORS.length]} />
                      ))}
                    </Bar>
                </BarChart>
              </ResponsiveContainer>
            </DashboardCard>

            <DashboardCard title="Third-Party Costing Report" icon={<FaFileInvoiceDollar />} className="third-party-costing-card">
              <ResponsiveContainer width="100%" height={300}>
                 <PieChart>
                    <Pie data={stats.thirdPartyEstimations} dataKey="count" nameKey="username" cx="50%" cy="50%" outerRadius={100} label>
                       {stats.thirdPartyEstimations.map((entry, index) => (<Cell key={`cell-${index}`} fill={USER_LINE_COLORS[index % USER_LINE_COLORS.length]}/>))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} estimations`, name]} />
                    <Legend />
                 </PieChart>
              </ResponsiveContainer>
            </DashboardCard>
          </>
        )}

        {/* --- ROW 3: LISTS & DATA --- */}
        <DashboardCard title="Recently Added Materials" icon={<FaListAlt />} className="recent-materials-card">
          <ul className="scrollable-list">
            {stats.recentlyAddedMasterMaterials?.length > 0 ? (
              stats.recentlyAddedMasterMaterials.map((item, index) => (
                <li key={`${item.material_code}-${index}`}>
                  <div className="recent-material-header"><strong>{item.material_code}</strong> - {item.material_description}</div>
                  <div className="recent-material-details">
                    <span><FaBuilding /> {item.plantlocation ? `${item.plantlocation} (${item.plantcode})` : item.plantcode || "N/A"}</span>
                    <span><FaTags /> {item.category || "N/A"}</span>
                    <span><FaBoxOpen /> SOH: {item.stock_on_hand?.toLocaleString() ?? "N/A"}</span>
                  </div>
                </li>
              ))
            ) : (<li className="list-empty-state"><FaInfoCircle /> No recent materials found.</li>)}
          </ul>
        </DashboardCard>
        
        {user.role === 'admin' && (
          <>
            <DashboardCard title="Plant Directory" icon={<FaMapMarkedAlt/>} className="plant-directory-card list-card" count={stats.plantDirectory?.length}>
               <ul className="scrollable-list">
                {stats.plantDirectory?.length > 0 ? (
                  stats.plantDirectory.map(p => (
                    <li key={p.plantcode}>
                       <div className="list-item-main"><span className="plant-code">{p.plantcode}</span></div>
                       <div className="list-item-sub"><FaBuilding/> {p.plantlocation}</div>
                    </li>
                  ))
                ) : (<li className="list-empty-state"><FaInfoCircle /> No plants found in the directory.</li>)}
              </ul>
            </DashboardCard>

            <DashboardCard title="User Assignments" icon={<FaUserCog/>} className="user-assignments-card list-card" count={stats.userAssignments?.length}>
              <ul className="scrollable-list user-list">
                {stats.userAssignments?.length > 0 ? (
                  stats.userAssignments.map(u => (
                    <li key={u.id}>
                      <div className="list-item-main"><span className="username">{u.username}</span><RoleTag role={u.role}/></div>
                      <div className="list-item-sub"><FaSitemap/> {u.plants || 'All plants assigned'}</div>
                    </li>
                  ))
                ) : (<li className="list-empty-state"><FaInfoCircle /> No users have been assigned plants.</li>)}
              </ul>
            </DashboardCard>

            <DashboardCard title="Third-Party Actions" icon={<FaUserClock />} className="third-party-actions-card">
              <div className="action-item purple" onClick={() => navigate('/admin/reworks')}><FaUserClock className="icon"/> <div className="details"><span>Rework Requests</span><strong>{stats.thirdPartyReworks}</strong></div></div>
              <div className="action-item orange" onClick={() => navigate('/admin/rejections')}><FaUserTimes className="icon"/> <div className="details"><span>Rejections</span><strong>{stats.thirdPartyRejections}</strong></div></div>
            </DashboardCard>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;