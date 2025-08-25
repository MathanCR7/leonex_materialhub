import React, { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { searchMasterMaterials } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import _ from "lodash";
import { toast } from "react-toastify";
import {
  FaSearch,
  FaSpinner,
  FaExclamationCircle,
  FaBuilding,
  FaTags,
  FaMapMarkerAlt,
} from "react-icons/fa";
import "./_MaterialCodePage.scss";

const MaterialCodePage = () => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (location.state?.error) {
      toast.error(location.state.error);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const debouncedSearch = useCallback(
    _.debounce(async (searchQuery) => {
      if (searchQuery.trim().length > 1) {
        setIsLoading(true);
        setError("");
        setSuggestions([]);
        try {
          const response = await searchMasterMaterials(searchQuery);
          setSuggestions(response.data || []);
          if ((response.data || []).length === 0) {
            setError("No materials found matching your query.");
          }
        } catch (err) {
          console.error("Error fetching material suggestions:", err);
          const errorMessage =
            err.response?.data?.message || "Failed to fetch suggestions.";
          setError(errorMessage);
          toast.error(errorMessage);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSuggestions([]);
        setError("");
      }
    }, 500),
    []
  );

  const handleChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    debouncedSearch(newQuery);
  };

  const handleSuggestionClick = (material) => {
    if (!material.plantcode) {
      toast.error("Selected material is missing plant code. Cannot proceed.");
      return;
    }
    if (!material.plantlocation) {
      toast.error(
        "Selected material is missing plant location. Cannot proceed."
      );
      return;
    }
    navigate(
      `/material-form/${encodeURIComponent(material.material_code)}?plantCode=${
        material.plantcode
      }&plantlocation=${encodeURIComponent(material.plantlocation)}`,
      {
        state: {
          submissionId: material.submission_id,
        },
      }
    );
  };

  const pageSubtitle = () => {
    if (user.role === "thirdparties") {
      return "Find materials by Mask Code or description within your assigned plants.";
    }
    if (user.role === "cataloguer") {
      return "Find materials by code or description within your assigned plants.";
    }
    return "Find materials by code or description across all plants.";
  };

  return (
    <div className="container material-code-page">
      <header className="page-header">
        <h1>Material Lookup</h1>
        <p className="page-subtitle">{pageSubtitle()}</p>
      </header>

      <div className="search-bar-wrapper card-style">
        <div className="search-bar-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            className="search-input form-control"
            value={query}
            onChange={handleChange}
            placeholder={
              user.role === "thirdparties"
                ? "Enter Mask Code or Description..."
                : "Enter Material Code or Description..."
            }
            aria-label="Search materials"
          />
          {isLoading && <FaSpinner className="spinner-icon" />}
        </div>
      </div>

      {error && !isLoading && (
        <div className="search-message error-message alert alert-danger">
          <FaExclamationCircle /> {error}
        </div>
      )}

      {!isLoading && suggestions.length > 0 && (
        <ul className="suggestions-list material-code-suggestions card-style">
          {suggestions.map((material, index) => (
            <li
              key={`${material.material_code}-${material.plantcode}-${index}`}
              onClick={() => handleSuggestionClick(material)}
              title={`Select ${material.material_code} for Plant ${
                material.plantcode || "N/A"
              }`}
              role="button"
              tabIndex={0}
              onKeyPress={(e) =>
                e.key === "Enter" && handleSuggestionClick(material)
              }
            >
              <div className="suggestion-content-wrapper">
                <div className="suggestion-main-info">
                  <div className="suggestion-code">
                    <strong>{material.material_code}</strong>
                    {user.role === "admin" && material.mask_code && (
                      <span className="mask-code-lookup">
                        (Mask: {material.mask_code})
                      </span>
                    )}
                  </div>
                  <div className="suggestion-description">
                    {material.material_description}
                  </div>
                </div>

                <div className="suggestion-details">
                  {material.plantcode && (
                    <span className="detail-item plant-code-badge">
                      <FaBuilding /> Plant: {material.plantcode}
                    </span>
                  )}
                  {material.plantlocation && (
                    <span className="detail-item">
                      <FaMapMarkerAlt /> {material.plantlocation}
                    </span>
                  )}
                  {material.category && (
                    <span className="detail-item">
                      <FaTags /> {material.category}
                    </span>
                  )}
                </div>
              </div>
              <div className="suggestion-status">
                {material.submission_id !== null &&
                material.submission_id !== undefined ? (
                  material.is_completed ? (
                    <span className="status-badge completed">Completed</span>
                  ) : (
                    <span className="status-badge not-completed">
                      In Progress
                    </span>
                  )
                ) : (
                  <span className="status-badge no-submission">
                    No Submission
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MaterialCodePage;