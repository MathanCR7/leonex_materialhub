// src/pages/SubmissionsForEstimationPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { getCompletedSubmissions } from "../services/api";
import { toast } from "react-toastify";
import {
  FaSearch,
  FaSpinner,
  FaSortAmountDown,
  FaSortAmountUp,
  FaExclamationCircle,
  FaEye,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import _ from "lodash";
import Pagination from "../components/Pagination";
import "./_MaterialStatusPage.scss"; // Re-using styles for consistency

const SubmissionsForEstimationPage = () => {
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
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
          estimationStatus: "pending", // <<< CHANGE: Send status to backend
        };
        const response = await getCompletedSubmissions(params);

        // <<< CHANGE: No more client-side filtering needed
        setSubmissions(response.data.data || []);
        setTotalItems(response.data.totalItems);
        setTotalPages(response.data.totalPages);
        setCurrentPage(response.data.currentPage || 1);

        if ((response.data.data || []).length === 0) {
          setError(
            "No submissions are currently pending your estimation. Check the 'My Provided Estimations' page for your completed work."
          );
        }
      } catch (err) {
        const errorMessage =
          err.response?.data?.message || "Failed to fetch submissions.";
        setError(errorMessage);
        toast.error(errorMessage);
        setSubmissions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [searchTerm, sortBy, sortOrder]
  );

  const debouncedFetch = useCallback(_.debounce(fetchSubmissions, 500), [
    fetchSubmissions,
  ]);

  useEffect(() => {
    debouncedFetch(1);
    return () => debouncedFetch.cancel();
  }, [searchTerm, debouncedFetch]);

  useEffect(() => {
    fetchSubmissions(currentPage);
  }, [sortBy, sortOrder, currentPage, fetchSubmissions]);

  const handleProvideEstimation = (submission, index) => {
    const submissionIds = submissions.map((s) => s.id);
    navigate(`/inspection/${submission.id}`, {
      state: { submissionIds, currentIndex: index },
    });
  };

  const handleSort = (newSortBy) => {
    setSortOrder(sortBy === newSortBy && sortOrder === "DESC" ? "ASC" : "DESC");
    setSortBy(newSortBy);
    setCurrentPage(1);
  };

  const renderSortIcon = (columnName) => {
    const sortKey =
      columnName === "Mask Code" ? "material_code" : columnName.toLowerCase();
    if (sortBy === sortKey) {
      return sortOrder === "ASC" ? <FaSortAmountUp /> : <FaSortAmountDown />;
    }
    return null;
  };

  return (
    <div className="container material-status-page">
      <header className="page-header">
        <h1>Provide Estimations</h1>
        <p className="page-subtitle">
          View submissions awaiting your cost estimation.
        </p>
      </header>
      <div className="controls-bar card-style">
        <div className="search-bar-status">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by Mask Code, Description, Plant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input form-control"
          />
        </div>
      </div>
      {isLoading && (
        <div className="loading-indicator">
          <FaSpinner className="spinner-icon large-spinner" />
          <p>Loading...</p>
        </div>
      )}
      {error && !isLoading && (
        <div className="error-message alert alert-info full-width-error">
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
                    Mask Code {renderSortIcon("Mask Code")}
                  </th>
                  <th>Description</th>
                  <th onClick={() => handleSort("plant")}>
                    Plant {renderSortIcon("plant")}
                  </th>
                  <th onClick={() => handleSort("created_at")}>
                    Completed On {renderSortIcon("created_at")}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub, index) => (
                  <tr key={sub.id}>
                    <td>{sub.material_code}</td>
                    <td>{sub.material_description_snapshot}</td>
                    <td>
                      {sub.plantlocation || "N/A"} ({sub.plant})
                    </td>
                    <td>{new Date(sub.created_at).toLocaleString()}</td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleProvideEstimation(sub, index)}
                        title="Inspect and Provide Cost Estimation"
                      >
                        <FaEye /> Inspect & Estimate
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
              onPageChange={setCurrentPage}
              isLoading={isLoading}
            />
            <span className="pagination-summary">
              Page {currentPage} of {totalPages} (Total: {totalItems} items)
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default SubmissionsForEstimationPage;
