import React, { useState, useEffect, useCallback } from "react";
import { getMyProvidedEstimations } from "../services/api";
import { toast } from "react-toastify";
import {
  FaSearch,
  FaSpinner,
  FaSortAmountDown,
  FaSortAmountUp,
  FaExclamationCircle,
  FaEdit,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import _ from "lodash";
import Pagination from "../components/Pagination";
import "./_ProvidedEstimationsPage.scss";

const ProvidedEstimationsPage = () => {
  const [estimations, setEstimations] = useState([]);
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

  const fetchEstimations = useCallback(
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
        const response = await getMyProvidedEstimations(params);

        setEstimations(response.data.data || []);
        setTotalItems(response.data.totalItems);
        setTotalPages(response.data.totalPages);
        setCurrentPage(response.data.currentPage || 1);

        if ((response.data.data || []).length === 0 && !searchTerm.trim()) {
          setError("You have not provided any cost estimations yet.");
        } else if ((response.data.data || []).length === 0) {
          setError("No provided estimations found matching your search.");
        }
      } catch (err) {
        const errorMessage =
          err.response?.data?.message || "Failed to fetch your estimations.";
        setError(errorMessage);
        toast.error(errorMessage);
        setEstimations([]);
      } finally {
        setIsLoading(false);
      }
    },
    [searchTerm, sortBy, sortOrder]
  );

  const debouncedFetch = useCallback(_.debounce(fetchEstimations, 500), [
    fetchEstimations,
  ]);

  useEffect(() => {
    debouncedFetch(1);
    return () => debouncedFetch.cancel();
  }, [searchTerm, debouncedFetch]);

  useEffect(() => {
    if (!searchTerm) {
        fetchEstimations(currentPage);
    }
  }, [sortBy, sortOrder, currentPage, fetchEstimations, searchTerm]);

  const handleEditEstimation = (estimation) => {
    navigate(`/inspection/${estimation.submission_id}`);
  };

  const handleSort = (newSortBy) => {
    setSortOrder(sortBy === newSortBy && sortOrder === "DESC" ? "ASC" : "DESC");
    setSortBy(newSortBy);
    setCurrentPage(1);
  };

  const renderSortIcon = (columnName) => {
    const sortKeyMapping = {
      // MODIFICATION: Changed "Mask Code" to "Material Code"
      "Material Code": "material_code",
      "Last Updated On": "updated_at",
    };
    const sortKey = sortKeyMapping[columnName];

    return sortBy === sortKey ? (
      sortOrder === "ASC" ? (
        <FaSortAmountUp />
      ) : (
        <FaSortAmountDown />
      )
    ) : null;
  };

  return (
    <div className="container provided-estimations-page">
      <header className="page-header">
        <h1>My Completed Estimations</h1>
        <p className="page-subtitle">
          View and edit your previously submitted cost estimations.
        </p>
      </header>

      <div className="controls-bar card-style">
        <div className="search-bar-status">
          <FaSearch className="search-icon" />
          {/* MODIFICATION: Updated placeholder text */}
          <input
            type="text"
            placeholder="Search by Material Code, Description..."
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
        <div className="error-message alert alert-warning full-width-error">
          <FaExclamationCircle /> {error}
        </div>
      )}

      {!isLoading && !error && estimations.length > 0 && (
        <>
          <div className="submissions-table-container card-style">
            <table className="submissions-table">
              {/* === MODIFICATION IS HERE === */}
              <thead>
                <tr>
                  <th onClick={() => handleSort("material_code")}>
                    Material Code {renderSortIcon("Material Code")}
                  </th>
                  <th>Description</th>
                  <th onClick={() => handleSort("updated_at")}>
                    Last Updated On {renderSortIcon("Last Updated On")}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {estimations.map((est) => (
                  <tr key={est.id}>
                    <td>{est.mask_code}</td>
                    <td>{est.material_description_snapshot}</td>
                    {/* Plant column is removed */}
                    <td>{new Date(est.updated_at).toLocaleString()}</td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleEditEstimation(est)}
                        title="View and Edit Estimation"
                      >
                        <FaEdit /> View / Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* === END MODIFICATION === */}
            </table>
          </div>
          <div className="pagination-controls">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
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

export default ProvidedEstimationsPage;