// src/pages/MaterialStatusPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getCompletedSubmissions } from "../services/api";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import {
  FaSearch, FaSpinner, FaEye, FaSortAmountDown, FaSortAmountUp,
  FaChevronDown, FaFilter, FaFileExcel,
} from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom"; // Import useLocation
import { useAuth } from "../contexts/AuthContext";
import _ from "lodash";
import Pagination from "../components/Pagination";
import "./_MaterialStatusPage.scss";

// Helper Component: StatusBadge (Unchanged)
const StatusBadge = ({ status }) => {
  if (!status) return <span className="status-badge status-pending">Pending</span>;
  const statusClass = `status-${status.toLowerCase().replace(/_/g, "")}`;
  const statusText = status.replace(/_/g, " ");
  return <span className={`status-badge ${statusClass}`}>{statusText}</span>;
};

// Helper Component: StatusFilterDropdown (Unchanged)
const StatusFilterDropdown = ({ options, selected, onChange, onClear }) => {
    const [isOpen, setIsOpen] = useState(false);
    const handleCheckboxChange = (option) => {
        const newSelected = selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option];
        onChange(newSelected);
    };
    const selectedCount = selected.length;
    const displayLabel = selectedCount > 0 ? `${selectedCount} Selected` : "All Statuses";
    return (
        <div className="status-filter-container">
            <button className={`filter-button ${isOpen ? 'is-open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
                <span className="filter-label"><FaFilter /> Status: <strong>{displayLabel}</strong></span>
                <FaChevronDown className="chevron-icon" />
            </button>
            {isOpen && (
                <div className="filter-dropdown">
                    <ul>{options.map((option) => (<li key={option}><label><input type="checkbox" checked={selected.includes(option)} onChange={() => handleCheckboxChange(option)} /><StatusBadge status={option} /></label></li>))}</ul>
                    <div className="filter-actions"><button className="btn-link" onClick={onClear}>Clear Filter</button><button className="btn-link" onClick={() => setIsOpen(false)}>Close</button></div>
                </div>
            )}
        </div>
    );
};

const MaterialStatusPage = () => {
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation(); // Get location object to read navigation state
  const { user } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("updated_at");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- MODIFIED: Initialize filter from navigation state or session storage ---
  const [statusFilter, setStatusFilter] = useState(() => {
    const locationStateFilter = location.state?.defaultFilter;
    // If a filter is passed via navigation state, use it and ignore session storage
    if (locationStateFilter && Array.isArray(locationStateFilter)) {
      return locationStateFilter;
    }
    // Otherwise, fall back to the previously saved filter in session storage
    const savedFilter = sessionStorage.getItem('materialStatusFilter');
    return savedFilter ? JSON.parse(savedFilter) : [];
  });
  
  const uniqueStatuses = useMemo(() => {
    const statuses = allSubmissions.map(s => s.approval_status || 'PENDING');
    return [...new Set(statuses)].sort();
  }, [allSubmissions]);


  const fetchSubmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { search: searchTerm.trim(), sortBy, sortOrder, limit: 10000 };
      const response = await getCompletedSubmissions(params);
      setAllSubmissions(response.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch completed materials.");
      setAllSubmissions([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, sortBy, sortOrder]);
  
  const debouncedFetch = useCallback(_.debounce(fetchSubmissions, 500), [fetchSubmissions]);

  useEffect(() => {
    debouncedFetch();
    return debouncedFetch.cancel;
  }, [searchTerm, sortBy, sortOrder, debouncedFetch]);

  useEffect(() => {
    // Save the current filter to session storage so it persists on refresh
    sessionStorage.setItem('materialStatusFilter', JSON.stringify(statusFilter));
    
    let submissionsToFilter = [...allSubmissions];
    if (statusFilter.length > 0) {
      submissionsToFilter = submissionsToFilter.filter(sub => 
        statusFilter.includes(sub.approval_status || 'PENDING')
      );
    }
    setFilteredSubmissions(submissionsToFilter);
    setCurrentPage(1); // Reset to first page whenever filters change
  }, [statusFilter, allSubmissions]);

  const handleExport = () => {
    if (filteredSubmissions.length === 0) {
      toast.warn("There is no data to export.");
      return;
    }
    const dataToExport = filteredSubmissions.map(sub => ({
      "Material Code": sub.material_code,
      ...(user.role === 'admin' && { "Mask Code": sub.mask_code || "N/A" }),
      "Description": sub.material_description_snapshot,
      "Plant": `${sub.plantlocation || "N/A"} (${sub.plant})`,
      "Updated By": sub.submitted_by_username,
      "Last Updated": new Date(sub.updated_at).toLocaleString(),
      "Status": sub.approval_status || 'PENDING',
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Material Status");
    const colWidths = Object.keys(dataToExport[0]).map(key => ({ wch: Math.max(20, key.length) }));
    worksheet["!cols"] = colWidths;
    XLSX.writeFile(workbook, "Material_Status_Report.xlsx");
  };

  const handleFilterChange = (newFilter) => {
    // When the user manually changes the filter, clear the navigation state
    // to prevent it from reapplying on the next visit.
    if (location.state?.defaultFilter) {
      navigate(location.pathname, { replace: true, state: {} });
    }
    setStatusFilter(newFilter);
  };
  const handleClearFilter = () => {
    if (location.state?.defaultFilter) {
      navigate(location.pathname, { replace: true, state: {} });
    }
    setStatusFilter([]);
  };

  const handlePageChange = (page) => setCurrentPage(page);
  const handleViewDetails = (submission) => navigate(`/inspection/${submission.id}`);

  const renderSortIcon = (columnName) => {
    if (sortBy === columnName) {
      return sortOrder === "ASC" ? <FaSortAmountUp /> : <FaSortAmountDown />;
    }
    return null;
  };

  const totalItems = filteredSubmissions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedSubmissions = filteredSubmissions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  
  return (
    <div className="container material-status-page">
      <header className="page-header">
        <h1>Completed Material Submissions</h1>
        <p className="page-subtitle">{user.role === "cataloguer" ? "Showing completed submissions for your assigned plants." : "Overview of all materials marked as complete."}</p>
      </header>

      <div className="controls-bar card-style">
        <div className="search-bar-status"><FaSearch className="search-icon" /><input type="text" placeholder="Search by Code, Description, Plant..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input form-control"/></div>
        <StatusFilterDropdown options={uniqueStatuses} selected={statusFilter} onChange={handleFilterChange} onClear={handleClearFilter}/>
        <button className="btn-export" onClick={handleExport} disabled={isLoading || filteredSubmissions.length === 0}><FaFileExcel /> Export</button>
      </div>

      {isLoading && (<div className="loading-spinner card-style"><FaSpinner className="spinner-icon" /> Loading...</div>)}
      {!isLoading && totalItems === 0 && (<div className="info-message card-style alert alert-info">{searchTerm || statusFilter.length > 0 ? "No completed submissions found matching your criteria." : "No completed submissions found."}</div>)}

      {!isLoading && paginatedSubmissions.length > 0 && (
        <>
          <div className="submissions-table-container card-style">
            <table className="submissions-table">
              <thead>
                <tr>
                  <th onClick={() => setSortBy("material_code")}>Material Code {renderSortIcon("material_code")}</th>
                  {user.role === "admin" && <th onClick={() => setSortBy("mask_code")}>Mask Code {renderSortIcon("mask_code")}</th>}
                  <th>Description Snapshot</th>
                  <th onClick={() => setSortBy("plant")}>Plant {renderSortIcon("plant")}</th>
                  <th onClick={() => setSortBy("submitted_by_username")}>Updated By {renderSortIcon("submitted_by_username")}</th>
                  <th onClick={() => setSortBy("updated_at")}>Last Updated {renderSortIcon("updated_at")}</th>
                  <th onClick={() => setSortBy("approval_status")}>Approval Status {renderSortIcon("approval_status")}</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSubmissions.map((sub) => (
                  <tr key={sub.id}>
                    <td>{sub.material_code}</td>
                    {user.role === "admin" && <td>{sub.mask_code || "N/A"}</td>}
                    <td>{sub.material_description_snapshot}</td>
                    <td>{sub.plantlocation || "N/A"} ({sub.plant})</td>
                    <td>{sub.submitted_by_username}</td>
                    <td>{new Date(sub.updated_at).toLocaleString()}</td>
                    <td><StatusBadge status={sub.approval_status} /></td>
                    <td><button className="btn-icon btn-view-details" onClick={() => handleViewDetails(sub)} title="View Details"><FaEye /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination-controls">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} isLoading={isLoading}/>
            <span className="pagination-summary">Page {currentPage} of {totalPages} (Total: {totalItems} items)</span>
          </div>
        </>
      )}
    </div>
  );
};

export default MaterialStatusPage;