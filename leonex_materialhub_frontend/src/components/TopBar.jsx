import React, { useState, useEffect, useRef } from "react"; // Added useEffect, useRef
import { Link, useNavigate, NavLink, useLocation } from "react-router-dom"; // Added useLocation
import { useAuth } from "../contexts/AuthContext";
import {
  FaSignOutAlt,
  FaUserCircle,
  FaTachometerAlt,
  FaClipboardList,
  FaFileExport,
  FaArchive,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import { toast } from "react-toastify";
// import logoImage from "../assets/logo.svg"; // Example

const TopBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // For closing mobile menu on route change
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null); // Ref for the mobile menu

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      logout();
      toast.info("You have been logged out.");
      navigate("/login");
      setIsMobileMenuOpen(false);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Close mobile menu on route change
  useEffect(() => {
    closeMobileMenu();
  }, [location]);

  // Add/remove no-transition class to prevent initial animation flicker
  useEffect(() => {
    if (mobileMenuRef.current) {
      mobileMenuRef.current.classList.add("no-transition");
      const timer = setTimeout(() => {
        if (mobileMenuRef.current) {
          mobileMenuRef.current.classList.remove("no-transition");
        }
      }, 100); // Small delay, enough for initial render
      return () => clearTimeout(timer);
    }
  }, []);

  const navLinks = [
    { to: "/dashboard", icon: <FaTachometerAlt />, text: "Dashboard" },
    { to: "/material-codes", icon: <FaArchive />, text: "Material Codes" },
    {
      to: "/material-status",
      icon: <FaClipboardList />,
      text: "Completed",
    },
    { to: "/export-data", icon: <FaFileExport />, text: "Export" },
  ];

  return (
    <header
      className={`top-bar ${isMobileMenuOpen ? "mobile-menu-active" : ""}`}
    >
      <div className="container top-bar-content">
        {" "}
        {/* Ensure .container gives appropriate padding */}
        <Link
          to={user ? "/dashboard" : "/login"}
          className="logo"
          onClick={closeMobileMenu} // Also close menu if logo clicked (optional)
        >
          {/* <img src={logoImage} alt="Leonex Tool Logo" /> */}
          <span>Leonex Material Hub</span>
        </Link>
        {user && (
          <>
            {/* Desktop Navigation */}
            <nav className="main-nav desktop-nav">
              <ul>
                {navLinks.map((link) => (
                  <li key={link.to}>
                    <NavLink
                      to={link.to}
                      className={({ isActive }) =>
                        isActive ? "active-link" : ""
                      }
                    >
                      {link.icon} {link.text}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            {/* User Actions - Part of Desktop */}
            <div className="user-actions">
              <span className="welcome-user">
                <FaUserCircle className="user-icon" />
                <span>
                  Welcome, <strong>{user.username}</strong>
                </span>
              </span>
              <button onClick={handleLogout} className="logout-button">
                <FaSignOutAlt /> <span className="logout-text">Logout</span>
              </button>
            </div>

            {/* Mobile Navigation Toggle */}
            <button
              className="mobile-nav-toggle"
              onClick={toggleMobileMenu}
              aria-label="Toggle navigation"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav-menu-list" // For accessibility
            >
              {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
            </button>
          </>
        )}
      </div>

      {/* Mobile Navigation Menu (drawer) */}
      {user && ( // Only render if user exists, visibility handled by CSS
        <nav
          className="main-nav mobile-nav-menu"
          ref={mobileMenuRef}
          aria-hidden={!isMobileMenuOpen}
        >
          <ul id="mobile-nav-menu-list">
            {" "}
            {/* ID for aria-controls */}
            {navLinks.map((link) => (
              <li key={`mobile-${link.to}`}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) => (isActive ? "active-link" : "")}
                  onClick={closeMobileMenu} // Close menu on link click
                >
                  {link.icon} {link.text}
                </NavLink>
              </li>
            ))}
            <li className="mobile-logout-item">
              <button
                onClick={handleLogout} // Uses the same handleLogout which includes confirm and closing menu
                className="mobile-logout-button"
              >
                <FaSignOutAlt /> Logout
              </button>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
};

export default TopBar;
