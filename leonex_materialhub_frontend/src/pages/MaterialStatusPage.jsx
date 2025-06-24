import React, { useState, useEffect, useCallback } from "react";
import { getCompletedSubmissions } from "../services/api";
import { toast } from "react-toastify";
import {
  FaSearch,
  FaSpinner,
  FaEye,
  FaSortAmountDown,
  FaSortAmountUp,
  FaExclamationCircle, // Added for consistency in error display
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import _ from "lodash";
import "./_MaterialStatusPage.scss"; // Assuming SCSS file

const MaterialStatusPage = () => {
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_at"); // Default sort
  const [sortOrder, setSortOrder] = useState("DESC"); // Default order
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  const fetchSubmissions = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params = {
        search: searchTerm.trim(), // Trim search term before sending
        sortBy,
        sortOrder,
        page: currentPage,
        limit: itemsPerPage,
      };
      const response = await getCompletedSubmissions(params);
      setSubmissions(response.data.data || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalItems(response.data.totalItems || 0);
      setCurrentPage(response.data.currentPage || 1); // Ensure current page from response is used
      if ((response.data.data || []).length === 0 && searchTerm.trim() !== "") {
        setError("No completed submissions found matching your criteria.");
      }
    } catch (err) {
      console.error("Error fetching completed submissions:", err);
      const errorMessage =
        err.response?.data?.message || "Failed to fetch completed materials.";
      setError(errorMessage);
      toast.error(errorMessage);
      setSubmissions([]); // Clear submissions on error
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, sortBy, sortOrder, currentPage, itemsPerPage]); // itemsPerPage is constant, but good to list

  // Initial fetch and fetch on sort/page change
  useEffect(() => {
    fetchSubmissions();
  }, [sortBy, sortOrder, currentPage, fetchSubmissions]); // fetchSubmissions itself has searchTerm as dep

  // Debounced search term handling
  const debouncedFetch = useCallback(
    _.debounce((currentSearchTerm) => {
      // If search term changes, reset to page 1
      // Check if currentPage needs to be reset only if search term actually changed
      // This is implicitly handled if fetchSubmissions is called with new searchTerm & currentPage=1
      setCurrentPage(1);
      // fetchSubmissions will be called by the effect below or directly if preferred
      // For direct call:
      // fetchSubmissions(); // but ensure `searchTerm` state is already updated for `fetchSubmissions`
    }, 700),
    [] // No dependencies, as it's a stable debouncer function
  );

  const handleSearchChange = (e) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    debouncedFetch(newSearchTerm); // Pass the new term to the debounced function
  };

  // Effect to trigger fetch when searchTerm state is updated by debounced handler
  // This might be slightly redundant if debouncedFetch directly calls fetchSubmissions
  // after setting currentPage. Let's simplify: debouncedFetch will set page and then fetchSubmissions's
  // own useEffect hook (which depends on currentPage) will trigger the fetch.
  // Or, more directly:
  useEffect(() => {
    // This effect ensures that if searchTerm *actually changes state*
    // (after debounce logic completes and sets it),
    // and currentPage is reset, fetchSubmissions is called.
    // The previous debouncedFetch directly calling fetchSubmissions might be cleaner.
    // Let's adjust to this:
    const handler = setTimeout(() => {
      if (searchTerm !== undefined) {
        // To avoid initial fire if searchTerm starts undefined
        setCurrentPage(1); // Always reset to page 1 for a new search query
        // fetchSubmissions(); // This will be triggered by useEffect depending on currentPage and other params
      }
    }, 700); // This timeout is for the debounce effect on typing

    return () => clearTimeout(handler);
  }, [searchTerm]); // Only on searchTerm changes

  const handleSort = (newSortBy) => {
    setCurrentPage(1); // Reset to first page on sort change
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
    } else {
      setSortBy(newSortBy);
      setSortOrder("DESC");
    }
    // fetchSubmissions will be called by its useEffect dependency on sortBy/sortOrder/currentPage
  };

  const handleViewDetails = (submission) => {
    if (!submission.plant) {
      toast.error("Submission is missing plant code. Cannot view details.");
      console.error("Clicked submission missing plant code:", submission);
      return;
    }
    // Navigate to the MaterialDataFormPage in view mode for this submission
    // Pass plantCode as a query parameter
    navigate(
      `/material-form/${submission.material_code}?plantCode=${submission.plant}`,
      {
        state: { submissionId: submission.id, viewOnly: true },
      }
    );
  };

  const renderSortIcon = (columnName) => {
    if (sortBy === columnName) {
      return sortOrder === "ASC" ? <FaSortAmountUp /> : <FaSortAmountDown />;
    }
    return null;
  };

  return (
    <div className="container material-status-page">
      <header className="page-header">
        <h1>Completed Material Submissions</h1>
        <p className="page-subtitle">
          Overview of all materials marked as complete.
        </p>
      </header>

      <div className="controls-bar card-style">
        <div className="search-bar-status">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by Code, Description, Plant, Category..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input form-control" // Added form-control for consistency
          />
        </div>
        {/* More advanced filters could go here */}
      </div>

      {isLoading && (
        <div className="loading-indicator">
          <FaSpinner className="spinner-icon large-spinner" />{" "}
          <p>Loading submissions...</p>
        </div>
      )}
      {error &&
        !isLoading && ( // Show error only if not loading
          <div className="error-message alert alert-warning full-width-error">
            {" "}
            {/* Changed to alert-warning for no results */}
            <FaExclamationCircle /> {error}
          </div>
        )}

      {!isLoading && !error && submissions.length > 0 && (
        <>
          <div className="submissions-table-container card-style">
            <table className="submissions-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort("material_code")}>
                    Material Code {renderSortIcon("material_code")}
                  </th>
                  <th>Description Snapshot</th>
                  <th onClick={() => handleSort("plant")}>
                    {" "}
                    {/* Sort by plant code */}
                    Plant {renderSortIcon("plant")}
                  </th>
                  <th onClick={() => handleSort("category")}>
                    Category {renderSortIcon("category")}
                  </th>
                  <th onClick={() => handleSort("created_at")}>
                    Submitted {renderSortIcon("created_at")}
                  </th>
                  <th onClick={() => handleSort("submitted_by_username")}>
                    By {renderSortIcon("submitted_by_username")}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub.id}>
                    <td>{sub.material_code}</td>
                    <td>{sub.material_description_snapshot}</td>
                    <td>
                      {sub.plant_name || "N/A"} ({sub.plant}){" "}
                      {/* Display plant_name and plant code */}
                    </td>
                    <td>{sub.category}</td>
                    <td>{new Date(sub.created_at).toLocaleDateString()}</td>
                    <td>{sub.submitted_by_username}</td>
                    <td>
                      <button
                        className="btn-icon btn-view-details"
                        onClick={() => handleViewDetails(sub)}
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination-controls">
            <span>
              Page {currentPage} of {totalPages} (Total: {totalItems} items)
            </span>
            <div>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isLoading}
                className="btn btn-secondary btn-sm"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages || isLoading}
                className="btn btn-secondary btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
      {/* Message for genuinely no submissions at all, even without search */}
      {!isLoading &&
        !error &&
        submissions.length === 0 &&
        searchTerm.trim() === "" && (
          <div className="info-message card-style alert alert-info">
            No completed submissions found.
          </div>
        )}
    </div>
  );
};

export default MaterialStatusPage;
