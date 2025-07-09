// src/components/MaterialManagementPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  getManagedMaterials,
  downloadMaterialTemplate,
  importMaterials,
} from "../services/api";
import { toast } from "react-toastify";
import Papa from "papaparse";
import {
  FaSearch,
  FaSpinner,
  FaSortAmountDown,
  FaSortAmountUp,
  FaExclamationCircle,
  FaFileUpload,
  FaDownload,
  FaEye,
  FaTimes,
} from "react-icons/fa";
import _ from "lodash";
import Pagination from "../components/Pagination";
import "./_MaterialManagementPage.scss";

const MaterialManagementPage = () => {
  const [materials, setMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Pagination & Sorting State
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 15;

  // Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const fetchMaterials = useCallback(
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
        const response = await getManagedMaterials(params);
        setMaterials(response.data.data || []);
        setTotalPages(response.data.totalPages || 1);
        setTotalItems(response.data.totalItems || 0);
        setCurrentPage(response.data.currentPage || 1);
      } catch (err) {
        const msg = err.response?.data?.message || "Failed to fetch materials.";
        setError(msg);
        toast.error(msg);
        setMaterials([]);
      } finally {
        setIsLoading(false);
      }
    },
    [searchTerm, sortBy, sortOrder]
  );

  const debouncedFetch = useCallback(
    _.debounce(() => fetchMaterials(1), 500),
    [fetchMaterials]
  );

  useEffect(() => {
    debouncedFetch();
    return debouncedFetch.cancel;
  }, [searchTerm, debouncedFetch]);

  useEffect(() => {
    if (currentPage > 0) {
      // Fetch only if currentPage is valid
      fetchMaterials(currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortOrder, currentPage]);

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

  const handleDownloadTemplate = async () => {
    try {
      const response = await downloadMaterialTemplate();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "material_import_template.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Template downloaded.");
    } catch (error) {
      toast.error("Failed to download template.");
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        toast.error("Invalid file type. Please upload a CSV file.");
        return;
      }
      setSelectedFile(file);
      setPreviewData([]);
      setPreviewHeaders([]);
    }
  };

  const handlePreview = () => {
    if (!selectedFile) {
      toast.warn("Please select a file to preview.");
      return;
    }
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast.error("Error parsing CSV file. Please check the format.");
          console.error("CSV Parsing Errors:", results.errors);
          return;
        }
        setPreviewHeaders(results.meta.fields);
        setPreviewData(results.data);
      },
    });
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error("No file selected for import.");
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append("csvfile", selectedFile);

    try {
      const response = await importMaterials(formData);
      toast.success(response.data.message);
      setIsImportModalOpen(false);
      fetchMaterials(1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Import failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const renderSortIcon = (columnName) => {
    if (sortBy === columnName) {
      return sortOrder === "ASC" ? <FaSortAmountUp /> : <FaSortAmountDown />;
    }
    return null;
  };

  return (
    <div className="container material-management-page">
      <header className="page-header">
        <div className="header-title">
          <h1>Material Code Management</h1>
          <p className="page-subtitle">
            View, search, and import master material codes.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setIsImportModalOpen(true)}
        >
          <FaFileUpload /> <span>Import Materials</span>
        </button>
      </header>

      <div className="controls-bar card-style">
        <div className="search-bar">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by code, description, plant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {isLoading && (
        <div className="loading-indicator">
          <FaSpinner className="spinner-icon large-spinner" />
          <p>Loading Materials...</p>
        </div>
      )}
      {error && !isLoading && (
        <div className="error-message alert alert-danger">
          <FaExclamationCircle /> {error}
        </div>
      )}

      {!isLoading && !error && materials.length === 0 && (
        <div className="no-results-message card-style">
          <p>
            No materials found. Try adjusting your search or import new data.
          </p>
        </div>
      )}

      {!isLoading && !error && materials.length > 0 && (
        <>
          <div className="materials-table-container card-style">
            <table className="materials-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort("material_code")}>
                    Material Code {renderSortIcon("material_code")}
                  </th>
                  <th onClick={() => handleSort("mask_code")}>
                    Mask Code {renderSortIcon("mask_code")}
                  </th>
                  <th>Description</th>
                  <th onClick={() => handleSort("plantcode")}>
                    Plant {renderSortIcon("plantcode")}
                  </th>
                  <th onClick={() => handleSort("category")}>
                    Category {renderSortIcon("category")}
                  </th>
                  <th>SOH</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((mat) => (
                  <tr key={mat.id}>
                    <td data-label="Material Code">{mat.material_code}</td>
                    <td data-label="Mask Code">{mat.mask_code}</td>
                    <td data-label="Description">{mat.material_description}</td>
                    <td data-label="Plant">
                      {mat.plantlocation} ({mat.plantcode})
                    </td>
                    <td data-label="Category">{mat.category}</td>
                    <td data-label="SOH">{mat.stock_on_hand}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination-controls">
            <span className="pagination-summary">
              Showing{" "}
              <strong>
                {(currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, totalItems)}
              </strong>{" "}
              of <strong>{totalItems}</strong>
            </span>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              isLoading={isLoading}
            />
          </div>
        </>
      )}

      {isImportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content import-modal card-style">
            <div className="modal-header">
              <h2>Import Materials from CSV</h2>
              <button
                className="btn-close-modal"
                onClick={() => setIsImportModalOpen(false)}
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <div className="import-steps">
                <div className="step">
                  <h4>Step 1: Download Template</h4>
                  <p>Get the CSV template to ensure correct column format.</p>
                  <button
                    className="btn btn-secondary"
                    onClick={handleDownloadTemplate}
                  >
                    <FaDownload /> Download Template
                  </button>
                </div>
                <div className="step">
                  <h4>Step 2: Upload File</h4>
                  <p>
                    Select your completed CSV file. Required columns are noted
                    in the template.
                  </p>
                  <input
                    type="file"
                    accept=".csv, text/csv"
                    onChange={handleFileSelect}
                    className="form-control"
                  />
                </div>
                <div className="step">
                  <h4>Step 3: Preview & Import</h4>
                  <p>
                    Optionally preview, then click Import to process the file.
                  </p>
                  <button
                    className="btn btn-info"
                    onClick={handlePreview}
                    disabled={!selectedFile || isUploading}
                  >
                    <FaEye /> Preview Data
                  </button>
                </div>
              </div>

              {previewData.length > 0 && (
                <div className="preview-table-container">
                  <h4>CSV Preview (First {previewData.length} rows)</h4>
                  <table>
                    <thead>
                      <tr>
                        {previewHeaders.map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, idx) => (
                        <tr key={idx}>
                          {previewHeaders.map((h) => (
                            <td key={h}>{row[h]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsImportModalOpen(false)}
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleImport}
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? (
                  <FaSpinner className="spinner-icon-btn" />
                ) : (
                  <FaFileUpload />
                )}
                <span>{isUploading ? "Importing..." : "Upload & Insert"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialManagementPage;
