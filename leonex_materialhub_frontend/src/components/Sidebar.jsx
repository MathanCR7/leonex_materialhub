import React, { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
// --- IMPORT ALL NECESSARY API SERVICES ---
import {
  getCompletedSubmissions,
  getMyProvidedEstimations,
  getMyReworks,
  getMyRejections,
  getAssignedReworks,
  getAdminAllReworks,
  getAdminAllRejections,
} from "../services/api";
import {
  FaTachometerAlt,
  FaClipboardList,
  FaFileExport,
  FaArchive,
  FaUsersCog,
  FaSignOutAlt,
  FaFileInvoiceDollar,
  FaAngleLeft,
  FaDatabase,
  FaTasks,
  FaCalculator,
  FaUndo,
  FaTimesCircle,
  FaBoxes,
} from "react-icons/fa";
import leonexLogo from "../assets/company_logo.png";
import "./_Sidebar.scss";

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarRef = useRef();

  const [isCollapsed, setIsCollapsed] = useState(false);

  // --- NEW STATE FOR ALL DYNAMIC COUNTS ---
  const [pendingCount, setPendingCount] = useState(0); // For Third-Party
  const [providedEstimationsCount, setProvidedEstimationsCount] = useState(0); // For Third-Party
  const [myReworksCount, setMyReworksCount] = useState(0); // For Third-Party
  const [myRejectionsCount, setMyRejectionsCount] = useState(0); // For Third-Party
  const [assignedReworksCount, setAssignedReworksCount] = useState(0); // For Cataloguer
  const [adminReworksCount, setAdminReworksCount] = useState(0); // For Admin
  const [adminRejectionsCount, setAdminRejectionsCount] = useState(0); // For Admin

  // --- NEW UNIFIED USEEFFECT TO FETCH ALL COUNTS BASED ON USER ROLE ---
  useEffect(() => {
    if (!user) {
      // Clear all counts if user is logged out
      setPendingCount(0);
      setProvidedEstimationsCount(0);
      setMyReworksCount(0);
      setMyRejectionsCount(0);
      setAssignedReworksCount(0);
      setAdminReworksCount(0);
      setAdminRejectionsCount(0);
      return;
    }

    // Generic function to fetch a count from an API endpoint
    const fetchCount = async (apiFunc, setter, params = {}) => {
      try {
        // We only need the total count, so fetching with limit: 1 is efficient
        const response = await apiFunc({ limit: 1, ...params });
        setter(response.data.totalItems || 0);
      } catch (error) {
        console.error(`Failed to fetch count for ${apiFunc.name}:`, error);
        setter(0); // Fail silently
      }
    };

    const fetchAllCounts = () => {
      if (user.role === "thirdparties") {
        fetchCount(getCompletedSubmissions, setPendingCount, { estimationStatus: "pending" });
        fetchCount(getMyProvidedEstimations, setProvidedEstimationsCount);
        fetchCount(getMyReworks, setMyReworksCount);
        fetchCount(getMyRejections, setMyRejectionsCount);
      } else if (user.role === "cataloguer") {
        fetchCount(getAssignedReworks, setAssignedReworksCount);
      } else if (user.role === "admin") {
        fetchCount(getAdminAllReworks, setAdminReworksCount);
        fetchCount(getAdminAllRejections, setAdminRejectionsCount);
      }
    };

    fetchAllCounts(); // Fetch on initial load/user change
    const intervalId = setInterval(fetchAllCounts, 60000); // Poll every 60 seconds

    return () => clearInterval(intervalId); // Cleanup function
  }, [user]); // Rerun this effect if the user object changes

  // Close mobile sidebar on navigation
  useEffect(() => {
    if (isOpen) {
      setIsOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // Close mobile sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      logout();
      toast.info("You have been logged out.");
      navigate("/login");
    }
  };

  if (!user) {
    return null;
  }

  // --- MOVE LINK DEFINITIONS INSIDE COMPONENT TO ACCESS STATE & ADD COLORS ---
  const adminLinks = [
    { to: "/dashboard", icon: <FaTachometerAlt />, text: "Dashboard" },
    { to: "/material-codes", icon: <FaArchive />, text: "Material Lookup" },
    { to: "/material-management", icon: <FaDatabase />, text: "Material Management" },
    { to: "/cost-estimate-report", icon: <FaCalculator />, text: "Cost Report" },
     { to: "/stock-report", icon: <FaBoxes />, text: "Stock Report" },
    { to: "/material-status", icon: <FaClipboardList />, text: "Submissions" },
    { to: "/admin/reworks", icon: <FaUndo />, text: "ThirdParty Reworks", count: adminReworksCount, badgeColor: 'yellow' },
    { to: "/admin/rejections", icon: <FaTimesCircle />, text: "ThirdParty Rejection", count: adminRejectionsCount, badgeColor: 'red' },
    { to: "/user-management", icon: <FaUsersCog />, text: "Users" },
    { to: "/export-data", icon: <FaFileExport />, text: "Export" },
  ];

  const cataloguerLinks = [
    { to: "/dashboard", icon: <FaTachometerAlt />, text: "Dashboard" },
    { to: "/material-codes", icon: <FaArchive />, text: "Material Lookup" },
    { to: "/reworks", icon: <FaUndo />, text: "Assigned Reworks", count: assignedReworksCount, badgeColor: 'red' },
    { to: "/material-status", icon: <FaClipboardList />, text: "Submissions" },
  ];

  const thirdPartyLinks = [
    { to: "/dashboard", icon: <FaTachometerAlt />, text: "Welcome" },
    { to: "/submissions-for-estimation", icon: <FaFileInvoiceDollar />, text: "Provide Estimations", count: pendingCount, badgeColor: 'red' },
    { to: "/provided-estimations", icon: <FaTasks />, text: "Provided Estimations", count: providedEstimationsCount, badgeColor: 'green' },
    { to: "/my-reworks", icon: <FaUndo />, text: "My Reworks", count: myReworksCount, badgeColor: 'yellow' },
    { to: "/my-rejections", icon: <FaTimesCircle />, text: "My Rejections", count: myRejectionsCount, badgeColor: 'red' },
  ];

  let navLinks = [];
  if (
    (user.username === "itc_user1" || user.username === "itc_user2") &&
    user.role === "cataloguer"
  ) {
    navLinks = [
      { to: "/dashboard", icon: <FaTachometerAlt />, text: "Dashboard" },
      { to: "/material-status", icon: <FaClipboardList />, text: "Submissions" },
    ];
  } else if (user.role === "admin") {
    navLinks = adminLinks;
  } else if (user.role === "cataloguer") {
    navLinks = cataloguerLinks;
  } else if (user.role === "thirdparties") {
    navLinks = thirdPartyLinks;
  }

  const sidebarClasses = `sidebar ${isOpen ? "is-open" : ""} ${
    isCollapsed ? "is-collapsed" : ""
  }`;

  return (
    <>
      {isOpen && (
        <div className="sidebar-overlay" onClick={() => setIsOpen(false)}></div>
      )}
      <aside className={sidebarClasses} ref={sidebarRef}>
        <div className="sidebar-header">
          <Link to="/dashboard" className="sidebar-logo-link">
            <img src={leonexLogo} alt="Leonex Logo" className="logo-img" />
            <span className="logo-text">Material Hub</span>
          </Link>
        </div>

        <button
          className="sidebar-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          <FaAngleLeft />
        </button>

        <nav className="sidebar-nav">
          <ul>
            {navLinks.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} className={({ isActive }) => (isActive ? "active-link" : "")} title={link.text}>
                  <div className="nav-icon">{link.icon}</div>
                  <span className="nav-text">
                    {link.text}
                    {/* --- MODIFIED SPAN TO RENDER COLORED BADGE --- */}
                    {link.count > 0 && (
                      <span className={`sidebar-count-badge sidebar-count-badge--${link.badgeColor || 'red'}`}>
                        {link.count}
                      </span>
                    )}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-name">Welcome, <strong>{user.username}</strong></span>
            <span className="user-role">{user.role}</span>
          </div>
          <button onClick={handleLogout} className="logout-button" title="Logout">
            <div className="nav-icon"><FaSignOutAlt /></div>
            <span className="nav-text">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;