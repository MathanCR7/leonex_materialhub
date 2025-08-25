// src/pages/ReworksPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { getAssignedReworks } from "../services/api";
import { toast } from "react-toastify";
import { FaSpinner, FaExclamationCircle, FaEdit } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import _ from "lodash";
import Pagination from "../components/Pagination";
import "./_MaterialStatusPage.scss"; // Reuse styles

const ReworksPage = () => {
  const [reworks, setReworks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // States for pagination can be added later if needed

  const fetchReworks = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      // NOTE: This uses a simplified fetch without pagination/search for now.
      // You can expand this to be like MaterialStatusPage if needed.
      const response = await getAssignedReworks();
      setReworks(response.data.data || []);
      if ((response.data.data || []).length === 0) {
        setError("No submissions are currently assigned for rework.");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Failed to fetch reworks.";
      setError(errorMessage);
      toast.error(errorMessage);
      setReworks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReworks();
  }, [fetchReworks]);

  const handleEditRework = (submission) => {
    // Navigate to the form where the cataloguer can edit the submission.
    // This URL structure matches your existing MaterialDataFormPage.
    navigate(
      `/material-form/${submission.material_code}?plantCode=${submission.plant}`
    );
  };

  return (
    <div className="container material-status-page">
      <header className="page-header">
        <h1>Assigned Reworks</h1>
        <p className="page-subtitle">
          These submissions require your attention and correction. Please edit
          and re-submit.
        </p>
      </header>

      {isLoading && (
        <div className="loading-indicator">
          <FaSpinner className="spinner-icon large-spinner" />
          <p>Loading reworks...</p>
        </div>
      )}

      {!isLoading && reworks.length > 0 && (
        <div className="submissions-table-container card-style">
          <table className="submissions-table">
            <thead>
              <tr>
                <th>Material Code</th>
                <th>Description</th>
                <th>Plant</th>
                <th>Rework Reason</th>
                <th>Updated By</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reworks.map((sub) => (
                <tr key={sub.id}>
                  <td>{sub.material_code}</td>
                  <td>{sub.material_description_snapshot}</td>
                  <td>
                    {sub.plantlocation || "N/A"} ({sub.plant})
                  </td>
                  <td
                    style={{
                      color: "red",
                      fontWeight: "bold",
                      whiteSpace: "normal",
                    }}
                  >
                    {sub.rework_reason}
                  </td>
                  <td>{sub.submitted_by_username || "N/A"}</td>
                  <td>{new Date(sub.updated_at).toLocaleString()}</td>
                  <td>
                    <button
                      className="btn-icon btn-edit"
                      onClick={() => handleEditRework(sub)}
                      title="Edit Submission"
                    >
                      <FaEdit />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && !isLoading && (
        <div className="info-message alert alert-info full-width-error">
          <FaExclamationCircle /> {error}
        </div>
      )}
    </div>
  );
};

export default ReworksPage;

