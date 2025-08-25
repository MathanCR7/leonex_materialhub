import React, { useState, useEffect, useCallback } from "react";
import { getMyReworks } from "../services/api";
import { toast } from "react-toastify";
import { FaSearch, FaSpinner, FaEdit, FaUndo, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import _ from "lodash";
import Pagination from "../components/Pagination";
import "./_ProvidedEstimationsPage.scss"; // Reuse styles

const MyReworksPage = () => {
  const [reworks, setReworks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  const fetchReworks = useCallback(async (pageToFetch) => {
    setIsLoading(true);
    setError("");
    try {
      const params = { search: searchTerm.trim(), page: pageToFetch, limit: itemsPerPage };
      const response = await getMyReworks(params);
      setReworks(response.data.data || []);
      setTotalItems(response.data.totalItems);
      setTotalPages(response.data.totalPages);
      setCurrentPage(response.data.currentPage || 1);
      if ((response.data.data || []).length === 0) {
        setError(searchTerm ? "No reworks found for your search." : "You have not requested any reworks.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to fetch your reworks.";
      setError(msg);
      toast.error(msg);
      setReworks([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]);

  const debouncedFetch = useCallback(_.debounce(fetchReworks, 500), [fetchReworks]);
  useEffect(() => { debouncedFetch(1); return () => debouncedFetch.cancel(); }, [searchTerm, debouncedFetch]);
  useEffect(() => { if (!searchTerm) { fetchReworks(currentPage); } }, [currentPage, fetchReworks, searchTerm]);

  const handleEditAction = (rework) => {
    if (rework.rework_status === 'COMPLETED') {
      toast.info("This rework is complete. Please provide your final cost estimation.");
    }
    navigate(`/inspection/${rework.submission_id}`);
  };

  const getStatusChip = (status) => {
    if (status === 'COMPLETED') {
      return <span className="status-chip completed"><FaCheckCircle /> Rework Completed</span>;
    }
    return <span className="status-chip rework"><FaUndo /> Rework Requested</span>;
  };

  return (
    <div className="container provided-estimations-page">
      <header className="page-header">
        <h1>My Rework Requests</h1>
        <p className="page-subtitle">View the status of submissions you have sent back for rework.</p>
      </header>
      <div className="controls-bar card-style">
        <div className="search-bar-status">
          <FaSearch className="search-icon" />
          {/* MODIFICATION: Updated placeholder text */}
          <input type="text" placeholder="Search by Material Code, Description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input form-control" />
        </div>
      </div>
      {isLoading && (<div className="loading-indicator"><FaSpinner className="spinner-icon large-spinner" /><p>Loading...</p></div>)}
      {error && !isLoading && (<div className="error-message alert alert-warning full-width-error"><FaExclamationCircle /> {error}</div>)}
      {!isLoading && !error && reworks.length > 0 && (
        <>
          <div className="submissions-table-container card-style">
            <table className="submissions-table">
              {/* === MODIFICATION IS HERE === */}
              <thead>
                <tr>
                  <th>Material Code</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reworks.map((item) => (
                  <tr key={item.id}>
                    <td>{item.mask_code}</td>
                    <td>{item.material_description_snapshot}</td>
                    {/* Plant column is removed */}
                    <td>{getStatusChip(item.rework_status)}</td>
                    <td>{new Date(item.updated_at).toLocaleString()}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEditAction(item)}>
                        <FaEdit /> 
                        {item.rework_status === 'COMPLETED' ? 'Provide Estimation' : 'View / Edit'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* === END MODIFICATION === */}
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

export default MyReworksPage;