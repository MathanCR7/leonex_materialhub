import React, { useState, useEffect, useCallback } from "react";
import { getAdminAllReworks, getThirdPartyUsers } from "../services/api";
import { toast } from "react-toastify";
import {
  FaUndo,
  FaCheckCircle,
  FaSpinner,
  FaExclamationCircle,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Pagination from "../components/Pagination";
import "./_AdminReportsPage.scss";

const AdminReworksPage = () => {
  const [reworks, setReworks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [thirdPartyUsers, setThirdPartyUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  const fetchReworks = useCallback(
    async (pageToFetch) => {
      setIsLoading(true);
      setError("");
      try {
        const params = {
          page: pageToFetch,
          limit: itemsPerPage,
          userId: selectedUserId,
        };
        const response = await getAdminAllReworks(params);
        setReworks(response.data.data || []);
        setTotalPages(response.data.totalPages);
        setTotalItems(response.data.totalItems);
        setCurrentPage(response.data.currentPage || 1);
        if ((response.data.data || []).length === 0) {
          setError("No rework requests found matching the criteria.");
        }
      } catch (err) {
        toast.error(
          err.response?.data?.message || "Failed to fetch rework requests."
        );
        setError("Failed to fetch rework requests.");
      } finally {
        setIsLoading(false);
      }
    },
    [selectedUserId]
  );

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getThirdPartyUsers();
        setThirdPartyUsers(response.data);
      } catch (error) {
        toast.error("Failed to fetch third-party users.");
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchReworks(1); // Fetch page 1 when filter changes
  }, [selectedUserId, fetchReworks]);

  useEffect(() => {
    if (selectedUserId !== undefined) {
      fetchReworks(currentPage);
    }
  }, [currentPage, fetchReworks, selectedUserId]);

  const getStatusChip = (status) => {
    if (status === "COMPLETED")
      return (
        <span className="status-chip completed">
          <FaCheckCircle /> Completed
        </span>
      );
    return (
      <span className="status-chip rework">
        <FaUndo /> Pending
      </span>
    );
  };

  return (
    // UPDATED: Removed 'provided-estimations-page' class
    <div className="container admin-report-page">
      <header className="page-header">
        <h1>Third-Party Rework Requests</h1>
        <p className="page-subtitle">
          View and manage rework requests initiated by third-party users.
        </p>
      </header>

      <div className="filter-bar">
        <div className="filter-group">
          <label htmlFor="userFilter">Filter by User:</label>
          <select
            id="userFilter"
            className="form-control"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">All Third-Party Users</option>
            {thirdPartyUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.username}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="loading-indicator">
          <FaSpinner className="spinner-icon large-spinner" />
          <p>Loading...</p>
        </div>
      )}
      {error && !isLoading && (
        <div className="error-message alert alert-info">
          <FaExclamationCircle /> {error}
        </div>
      )}

      {!isLoading && !error && reworks.length > 0 && (
        <>
          <div className="submissions-table-container">
            <table className="submissions-table">
              <thead>
                <tr>
                  <th>Mask Code</th>
                  <th>Third-Party User</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {reworks.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/inspection/${item.submission_id}`)}
                    title="Click to view submission details"
                  >
                    <td data-label="Mask Code">{item.mask_code}</td>
                    <td data-label="Third-Party User">
                      {item.third_party_username}
                    </td>
                    <td data-label="Description">
                      {item.material_description_snapshot}
                    </td>
                    <td data-label="Status">{getStatusChip(item.rework_status)}</td>
                    <td data-label="Date">
                      {new Date(item.updated_at).toLocaleString()}
                    </td>
                    <td data-label="Reason" className="reason-cell">
                      {item.rework_reason}
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

export default AdminReworksPage;