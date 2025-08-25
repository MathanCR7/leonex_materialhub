import React, { useState, useEffect, useCallback } from "react";
import { getMyActions } from "../services/api";
import { toast } from "react-toastify";
import {
  FaSearch,
  FaSpinner,
  FaSortAmountDown,
  FaSortAmountUp,
  FaExclamationCircle,
  FaEdit,
  FaUndo,
  FaTimesCircle,
  FaCheckCircle, // Import the checkmark icon
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import _ from "lodash";
import Pagination from "../components/Pagination";
import "./_ProvidedEstimationsPage.scss"; // Reuse styles

const MyActionsPage = () => {
  const [actions, setActions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("updated_at");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  const fetchActions = useCallback(
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
        const response = await getMyActions(params);

        setActions(response.data.data || []);
        setTotalItems(response.data.totalItems);
        setTotalPages(response.data.totalPages);
        setCurrentPage(response.data.currentPage || 1);

        if ((response.data.data || []).length === 0 && !searchTerm.trim()) {
            setError("You have not submitted any rework requests or rejections.");
        } else if ((response.data.data || []).length === 0) {
            setError("No actions found matching your search.");
        }
      } catch (err) {
        const errorMessage =
          err.response?.data?.message || "Failed to fetch your actions.";
        setError(errorMessage);
        toast.error(errorMessage);
        setActions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [searchTerm, sortBy, sortOrder]
  );

  const debouncedFetch = useCallback(_.debounce(fetchActions, 500), [fetchActions]);

  useEffect(() => {
    debouncedFetch(1);
    return () => debouncedFetch.cancel();
  }, [searchTerm, debouncedFetch]);

  useEffect(() => {
    if (!searchTerm) {
        fetchActions(currentPage);
    }
  }, [sortBy, sortOrder, currentPage, fetchActions, searchTerm]);

  const handleEditAction = (action) => {
    // If rework is completed, let the user know they should now provide an estimation
    if (action.estimation_type === 'REWORK_REQUESTED' && action.rework_status === 'COMPLETED') {
        toast.info("This rework is complete. Please provide your final cost estimation.");
    }
    navigate(`/inspection/${action.submission_id}`);
  };

  const handleSort = (newSortBy) => {
    setSortOrder(sortBy === newSortBy && sortOrder === "DESC" ? "ASC" : "DESC");
    setSortBy(newSortBy);
    setCurrentPage(1);
  };

  const renderSortIcon = (columnName) => {
    const sortKeyMapping = { "Mask Code": "material_code", "Plant": "plant", "Last Updated": "updated_at" };
    const sortKey = sortKeyMapping[columnName];
    return sortBy === sortKey ? (sortOrder === "ASC" ? <FaSortAmountUp /> : <FaSortAmountDown />) : null;
  };

  // --- MODIFIED: This function now handles the rework_status field ---
  const getStatusChip = (type, reworkStatus) => {
    if (type === "REWORK_REQUESTED") {
        if (reworkStatus === 'COMPLETED') {
            return (
                <span className="status-chip completed">
                  <FaCheckCircle /> Rework Completed
                </span>
              );
        }
      return (
        <span className="status-chip rework">
          <FaUndo /> Rework Requested
        </span>
      );
    }
    if (type === "REJECTED") {
      return (
        <span className="status-chip rejected">
          <FaTimesCircle /> Rejected
        </span>
      );
    }
    return null;
  };

  return (
    <div className="container provided-estimations-page">
      <header className="page-header">
        <h1>My Reworks & Rejections</h1>
        <p className="page-subtitle">
          View and edit rework requests or rejections you have submitted.
        </p>
      </header>
      <div className="controls-bar card-style">
        <div className="search-bar-status">
          <FaSearch className="search-icon" />
          <input type="text" placeholder="Search by Mask Code, Description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input form-control" />
        </div>
      </div>
      {isLoading && (<div className="loading-indicator"><FaSpinner className="spinner-icon large-spinner" /><p>Loading...</p></div>)}
      {error && !isLoading && (<div className="error-message alert alert-warning full-width-error"><FaExclamationCircle /> {error}</div>)}
      
      {!isLoading && !error && actions.length > 0 && (
        <>
          <div className="submissions-table-container card-style">
            <table className="submissions-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort("material_code")}>Mask Code {renderSortIcon("Mask Code")}</th>
                  <th>Description</th>
                  <th onClick={() => handleSort("plant")}>Plant {renderSortIcon("Plant")}</th>
                  <th>Status</th>
                  <th onClick={() => handleSort("updated_at")}>Last Updated {renderSortIcon("Last Updated")}</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((act) => (
                  <tr key={act.id}>
                    <td>{act.mask_code}</td>
                    <td>{act.material_description_snapshot}</td>
                    <td>{act.plantlocation || "N/A"} ({act.plant})</td>
                    <td>{getStatusChip(act.estimation_type, act.rework_status)}</td>
                    <td>{new Date(act.updated_at).toLocaleString()}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEditAction(act)} title="View and Edit Action">
                        <FaEdit /> 
                        {act.estimation_type === 'REWORK_REQUESTED' && act.rework_status === 'COMPLETED' ? 'Provide Estimation' : 'View / Edit'}
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

export default MyActionsPage;