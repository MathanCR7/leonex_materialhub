// src/components/Sidebar.jsx

import React, { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
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
  FaCalculator, // <<< IMPORT NEW ICON
} from "react-icons/fa";
import leonexLogo from "../assets/leonex_logo.png";
import "./_Sidebar.scss";

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarRef = useRef();

  // State for desktop collapsed view
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  // Define navigation links
  const adminLinks = [
    { to: "/dashboard", icon: <FaTachometerAlt />, text: "Dashboard" },
    { to: "/material-codes", icon: <FaArchive />, text: "Material Lookup" },
    {
      to: "/material-management",
      icon: <FaDatabase />,
      text: "Material Management",
    },
    {
      to: "/cost-estimate-report",
      icon: <FaCalculator />,
      text: "Cost Report",
    },
    { to: "/material-status", icon: <FaClipboardList />, text: "Submissions" },
    { to: "/user-management", icon: <FaUsersCog />, text: "Users" },
    { to: "/export-data", icon: <FaFileExport />, text: "Export" },
  ];
  const cataloguerLinks = [
    { to: "/dashboard", icon: <FaTachometerAlt />, text: "Dashboard" },
    { to: "/material-codes", icon: <FaArchive />, text: "Material Lookup" },
    { to: "/material-status", icon: <FaClipboardList />, text: "Submissions" },
  ];
  const thirdPartyLinks = [
    { to: "/dashboard", icon: <FaTachometerAlt />, text: "Welcome" },
    {
      to: "/submissions-for-estimation",
      icon: <FaFileInvoiceDollar />,
      text: "Provide Estimations",
    },
    // --- FIX: ADDED LINK TO THE NEW PAGE ---
    {
      to: "/provided-estimations",
      icon: <FaTasks />,
      text: "My Provided Estimations",
    },
  ];

  let navLinks = [];
  if (user.role === "admin") navLinks = adminLinks;
  else if (user.role === "cataloguer") navLinks = cataloguerLinks;
  else if (user.role === "thirdparties") navLinks = thirdPartyLinks;

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

        {/* This button is only visible on desktop */}
        <button
          className="sidebar-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isCollapsed}
          aria-controls="sidebar-navigation"
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          <FaAngleLeft />
        </button>

        <nav className="sidebar-nav" id="sidebar-navigation">
          <ul>
            {navLinks.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) => (isActive ? "active-link" : "")}
                  title={link.text}
                >
                  <div className="nav-icon">{link.icon}</div>
                  <span className="nav-text">{link.text}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-name">
              Welcome, <strong>{user.username}</strong>
            </span>
            <span className="user-role">{user.role}</span>
          </div>
          <button
            onClick={handleLogout}
            className="logout-button"
            title="Logout"
          >
            <div className="nav-icon">
              <FaSignOutAlt />
            </div>
            <span className="nav-text">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
