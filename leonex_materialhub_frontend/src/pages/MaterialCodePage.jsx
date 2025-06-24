// pages/MaterialCodePage.jsx
import React, { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { searchMasterMaterials } from "../services/api";
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

  useEffect(() => {
    if (location.state?.error) {
      toast.error(location.state.error);
      navigate(location.pathname, { replace: true, state: {} }); // Clear error from state
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
            setError("No materials found matching your query."); // Set error for no results
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
        setError(""); // Clear error if query is too short
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
      console.error("Clicked material missing plantcode:", material);
      return;
    }
    // Navigate with materialCode in path and plantCode as query param
    navigate(
      `/material-form/${material.material_code}?plantCode=${material.plantcode}`,
      {
        state: {
          submissionId: material.submission_id, // Pass submissionId if exists for this material-plant
          // Optional: pass description or other details to pre-fill while form loads fully
          // materialDescription: material.material_description,
        },
      }
    );
  };

  // Effect to clear suggestions/error if query becomes too short
  useEffect(() => {
    if (query.trim().length <= 1) {
      if (suggestions.length > 0) setSuggestions([]);
      if (error) setError(""); // Clear error if query is too short
    }
  }, [query, suggestions.length, error]);

  return (
    <div className="container material-code-page">
      <header className="page-header">
        <h1>Material Code Lookup</h1>
        <p className="page-subtitle">
          Find materials by code or description. Results will show materials per
          plant.
        </p>
      </header>

      <div className="search-bar-wrapper card-style">
        <div className="search-bar-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            className="search-input form-control"
            value={query}
            onChange={handleChange}
            placeholder="Enter Material Code or Description (min. 2 chars)..."
            aria-label="Search materials"
          />
          {isLoading && <FaSpinner className="spinner-icon" />}
        </div>
      </div>

      {error &&
        !isLoading && ( // Show error only if not loading
          <div className="search-message error-message alert alert-danger">
            <FaExclamationCircle /> {error}
          </div>
        )}

      {!isLoading && suggestions.length > 0 && (
        <ul className="suggestions-list material-code-suggestions card-style">
          {suggestions.map((material) => (
            <li
              // Using plantcode in the key is essential for uniqueness
              key={`${material.material_code}-${material.plantcode}`}
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
                  </div>
                  <div className="suggestion-description">
                    {material.material_description}
                  </div>
                </div>
                <div className="suggestion-details">
                  {material.plantcode && (
                    <span className="detail-item plant-code-badge">
                      {" "}
                      {/* Added class for styling */}
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
                  material.is_completed === 1 || // Handle both boolean and integer from DB
                  material.is_completed === true ? (
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

      {/* This specific message for "no results after valid search" is now handled by setError above */}
      {/* {!isLoading &&
        !error && // Ensure no other error is present
        query.trim().length > 1 &&
        suggestions.length === 0 && (
          <div className="search-message info-message alert alert-info card-style">
            No materials found matching your query.
          </div>
        )} */}
    </div>
  );
};

export default MaterialCodePage;
