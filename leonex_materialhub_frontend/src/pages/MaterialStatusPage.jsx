import React, { useState, useEffect, useCallback } from "react";
import { getCompletedSubmissions } from "../services/api";
import { toast } from "react-toastify";
import {
  FaSearch,
  FaSpinner,
  FaEye,
  FaSortAmountDown,
  FaSortAmountUp,
  FaExclamationCircle,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import _ from "lodash";
import Pagination from "../components/Pagination";
import "./_MaterialStatusPage.scss";

const MaterialStatusPage = () => {
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("updated_at"); // Default sort by last update
  const [sortOrder, setSortOrder] = useState("DESC");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  const fetchSubmissions = useCallback(
    async (pageToFetch) => {
      setIsLoading(true);
      setError("");
      try {
        const params = {
          search: searchTerm.trim(),
          sortBy,
          sortOrder,
          page: pageToFetch,
          limit: itemsPerPage,
        };
        const response = await getCompletedSubmissions(params);
        setSubmissions(response.data.data || []);
        setTotalPages(response.data.totalPages || 1);
        setTotalItems(response.data.totalItems || 0);
        setCurrentPage(response.data.currentPage || 1);
        if (
          (response.data.data || []).length === 0 &&
          searchTerm.trim() !== ""
        ) {
          setError("No completed submissions found matching your criteria.");
        }
      } catch (err) {
        console.error("Error fetching completed submissions:", err);
        const errorMessage =
          err.response?.data?.message || "Failed to fetch completed materials.";
        setError(errorMessage);
        toast.error(errorMessage);
        setSubmissions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [searchTerm, sortBy, sortOrder]
  );

  const debouncedFetch = useCallback(
    _.debounce((page) => fetchSubmissions(page), 500),
    [fetchSubmissions]
  );

  useEffect(() => {
    debouncedFetch(1); // Reset to page 1 on search
    return debouncedFetch.cancel;
  }, [searchTerm, debouncedFetch]);

  useEffect(() => {
    fetchSubmissions(currentPage);
  }, [sortBy, sortOrder, currentPage, fetchSubmissions]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSort = (newSortBy) => {
    const newOrder =
      sortBy === newSortBy && sortOrder === "DESC" ? "ASC" : "DESC";
    setSortBy(newSortBy);
    setSortOrder(newOrder);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleViewDetails = (submission) => {
    // New navigation to the dedicated inspection page
    navigate(`/inspection/${submission.id}`);
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
          {user.role === "cataloguer"
            ? "Showing completed submissions for your assigned plants."
            : "Overview of all materials marked as complete."}
        </p>
      </header>

      <div className="controls-bar card-style">
        <div className="search-bar-status">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by Code, Description, Plant..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input form-control"
          />
        </div>
      </div>

      {isLoading && (
        <div className="loading-indicator">
          <FaSpinner className="spinner-icon large-spinner" />
          <p>Loading submissions...</p>
        </div>
      )}
      {error && !isLoading && (
        <div className="error-message alert alert-warning full-width-error">
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
                  {user.role === "admin" && (
                    <th onClick={() => handleSort("mask_code")}>
                      Mask Code {renderSortIcon("mask_code")}
                    </th>
                  )}
                  <th>Description Snapshot</th>
                  <th onClick={() => handleSort("plant")}>
                    Plant {renderSortIcon("plant")}
                  </th>
                  <th onClick={() => handleSort("submitted_by_username")}>
                    Updated By {renderSortIcon("submitted_by_username")}
                  </th>
                  <th onClick={() => handleSort("updated_at")}>
                    Last Updated {renderSortIcon("updated_at")}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub.id}>
                    <td>{sub.material_code}</td>
                    {user.role === "admin" && <td>{sub.mask_code || "N/A"}</td>}
                    <td>{sub.material_description_snapshot}</td>
                    <td>
                      {sub.plantlocation || "N/A"} ({sub.plant})
                    </td>
                    <td>{sub.submitted_by_username}</td>
                    <td>{new Date(sub.updated_at).toLocaleString()}</td>
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
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              isLoading={isLoading}
            />
            <span className="pagination-summary">
              Page {currentPage} of {totalPages} (Total: {totalItems} items)
            </span>
          </div>
        </>
      )}
      {!isLoading && !error && submissions.length === 0 && (
        <div className="info-message card-style alert alert-info">
          No completed submissions found.
        </div>
      )}
    </div>
  );
};

export default MaterialStatusPage;
