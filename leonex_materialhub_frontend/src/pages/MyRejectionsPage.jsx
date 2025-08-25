import React, { useState, useEffect, useCallback } from "react";
import { getMyRejections } from "../services/api";
import { toast } from "react-toastify";
import { FaSearch, FaSpinner, FaEdit, FaTimesCircle, FaExclamationCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import _ from "lodash";
import Pagination from "../components/Pagination";
import "./_ProvidedEstimationsPage.scss"; // Reuse styles

const MyRejectionsPage = () => {
  const [rejections, setRejections] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  const fetchRejections = useCallback(async (pageToFetch) => {
    setIsLoading(true);
    setError("");
    try {
      const params = { search: searchTerm.trim(), page: pageToFetch, limit: itemsPerPage };
      const response = await getMyRejections(params);
      setRejections(response.data.data || []);
      setTotalItems(response.data.totalItems);
      setTotalPages(response.data.totalPages);
      setCurrentPage(response.data.currentPage || 1);
      if ((response.data.data || []).length === 0) {
        setError(searchTerm ? "No rejections found for your search." : "You have not rejected any submissions.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to fetch your rejections.";
      setError(msg);
      toast.error(msg);
      setRejections([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]);

  const debouncedFetch = useCallback(_.debounce(fetchRejections, 500), [fetchRejections]);
  useEffect(() => { debouncedFetch(1); return () => debouncedFetch.cancel(); }, [searchTerm, debouncedFetch]);
  useEffect(() => { if (!searchTerm) { fetchRejections(currentPage); } }, [currentPage, fetchRejections, searchTerm]);

  const handleEditAction = (rejection) => {
    navigate(`/inspection/${rejection.submission_id}`);
  };

  return (
    <div className="container provided-estimations-page">
      <header className="page-header">
        <h1>My Rejections</h1>
        <p className="page-subtitle">View the submissions you have rejected.</p>
      </header>
      <div className="controls-bar card-style">
        <div className="search-bar-status">
          <FaSearch className="search-icon" />
          <input type="text" placeholder="Search by Material Code, Description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input form-control" />
        </div>
      </div>
      {isLoading && (<div className="loading-indicator"><FaSpinner className="spinner-icon large-spinner" /><p>Loading...</p></div>)}
      {error && !isLoading && (<div className="error-message alert alert-warning full-width-error"><FaExclamationCircle /> {error}</div>)}
      {!isLoading && !error && rejections.length > 0 && (
        <>
          <div className="submissions-table-container card-style">
            <table className="submissions-table">
              {/* === MODIFICATION IS HERE === */}
              <thead>
                <tr>
                  <th>Material Code</th> 
                  <th>Description</th>
                  <th>Reason for Rejection</th>
                  <th>Rejected On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              {/* === END MODIFICATION === */}
              <tbody>
                {rejections.map((item) => (
                  <tr key={item.id}>
                    <td>{item.mask_code}</td>
                    <td>{item.material_description_snapshot}</td>
                    <td className="reason-cell">{item.rejection_reason}</td>
                    <td>{new Date(item.updated_at).toLocaleString()}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEditAction(item)}>
                        <FaEdit /> View / Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination-controls">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            <span className="pagination-summary">Page {currentPage} of {totalPages} (Total: {totalItems} items)</span>
          </div>
        </>
      )}
    </div>
  );
};

export default MyRejectionsPage;