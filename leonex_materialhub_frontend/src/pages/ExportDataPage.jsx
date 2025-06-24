import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  FaFilePdf,
  FaFileWord,
  FaSearch,
  FaSpinner,
  // FaFilter, // Not used as filter button removed
  // FaDownload, // Not used directly
  FaCalendarAlt,
  FaFileExport,
} from "react-icons/fa";
import {
  getCompletedSubmissions,
  getSubmissionDetailsById, // Ensure this service function is correctly implemented in api.js
} from "../services/api";
import {
  generatePdfForSubmission,
  downloadPdf,
  generateWordForSubmission,
  downloadWord,
} from "../services/exportService";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./_ExportDataPage.scss";

const ExportDataPage = () => {
  const [exportType, setExportType] = useState("bulk");
  const [bulkFilter, setBulkFilter] = useState("last10");
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [searchTerm, setSearchTerm] = useState("");

  const [submissionsToExport, setSubmissionsToExport] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [singleMaterialCode, setSingleMaterialCode] = useState("");
  const [singlePlantCode, setSinglePlantCode] = useState("");
  const [singleSubmissionResult, setSingleSubmissionResult] = useState(null);

  const fetchBulkSubmissions = async () => {
    setIsLoading(true);
    setSubmissionsToExport([]);
    try {
      let params = { limit: 100, sortBy: "created_at", sortOrder: "DESC" }; // Fetch more for client-side date filter
      if (bulkFilter === "last10") params.limit = 10;
      // Note: Date range filtering on client-side is okay for small datasets.
      // For larger datasets, implement server-side date filtering.
      const response = await getCompletedSubmissions(params);
      let data = response.data.data || [];

      if (bulkFilter === "lastWeek") {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        oneWeekAgo.setHours(0, 0, 0, 0);
        data = data.filter((sub) => new Date(sub.created_at) >= oneWeekAgo);
      } else if (bulkFilter === "dateRange" && startDate && endDate) {
        const adjustedStartDate = new Date(startDate);
        adjustedStartDate.setHours(0, 0, 0, 0);
        const adjustedEndDate = new Date(endDate);
        adjustedEndDate.setHours(23, 59, 59, 999);
        data = data.filter((sub) => {
          const subDate = new Date(sub.created_at);
          return subDate >= adjustedStartDate && subDate <= adjustedEndDate;
        });
      }
      setSubmissionsToExport(data);
      if (data.length === 0 && exportType === "bulk") {
        toast.info("No completed submissions found for the selected filter.");
      }
    } catch (error) {
      toast.error("Failed to fetch submissions for bulk export.");
      console.error("Bulk fetch error:", error);
    }
    setIsLoading(false);
  };

  const handleFetchSingleSubmission = async (e) => {
    e.preventDefault();
    if (!singleMaterialCode.trim() || !singlePlantCode.trim()) {
      toast.warn("Please enter both Material Code and Plant Code.");
      return;
    }
    setIsLoading(true);
    setSingleSubmissionResult(null);
    try {
      // API call to get latest submission by material code and plant code
      // Adjusting to use getSubmissionDetailsById after finding the ID
      // This part assumes you have an endpoint like `getLatestSubmissionByMaterialAndPlant` or similar
      // For now, let's use search and then get full details for the matched ID.
      // This is less efficient than a direct lookup.
      const searchResponse = await getCompletedSubmissions({
        search: singleMaterialCode,
        limit: 50, // Limit search results
      });

      const foundSubmissionSummary = (searchResponse.data.data || []).find(
        (s) =>
          s.material_code === singleMaterialCode.trim() &&
          s.plant === singlePlantCode.trim() &&
          s.is_completed
      );

      if (foundSubmissionSummary && foundSubmissionSummary.id) {
        const fullDetailsResponse = await getSubmissionDetailsById(
          foundSubmissionSummary.id
        );
        if (fullDetailsResponse && fullDetailsResponse.data) {
          setSingleSubmissionResult(fullDetailsResponse.data);
          toast.success("Submission found.");
        } else {
          throw new Error("Failed to fetch full details for the submission.");
        }
      } else {
        setSingleSubmissionResult(null);
        toast.error(
          `No completed submission found for Material ${singleMaterialCode} at Plant ${singlePlantCode}.`
        );
      }
    } catch (error) {
      toast.error(error.message || "Failed to fetch submission.");
      console.error("Single fetch error:", error);
      setSingleSubmissionResult(null);
    }
    setIsLoading(false);
  };

  const handleExport = async (submissionInput, format) => {
    if (!submissionInput || !submissionInput.id) {
      toast.error("No valid submission data to export.");
      return;
    }
    setIsGenerating(true);
    toast.info(
      `Generating ${format.toUpperCase()} for ${
        submissionInput.material_code
      }_${submissionInput.plant}...`
    );

    let submissionToProcess = submissionInput;
    // Ensure we have full details, especially if `submissionInput` is a summary from the list
    if (
      !submissionToProcess.hasOwnProperty("image_specification_path") ||
      !submissionToProcess.material_description_snapshot
    ) {
      // Check a few key detail fields
      try {
        const fullDetailsResponse = await getSubmissionDetailsById(
          submissionInput.id
        );
        if (!fullDetailsResponse.data)
          throw new Error("Full details not found.");
        submissionToProcess = fullDetailsResponse.data;
      } catch (e) {
        console.error("Error fetching full details for export:", e);
        toast.error(
          "Could not fetch full details for export. Please try again."
        );
        setIsGenerating(false);
        return;
      }
    }

    try {
      const filename = `${submissionToProcess.material_code}_${
        submissionToProcess.plant || "NOPLANT"
      }_${new Date().toISOString().split("T")[0]}`;
      if (format === "pdf") {
        const pdfDoc = await generatePdfForSubmission(submissionToProcess);
        downloadPdf(pdfDoc, filename);
      } else if (format === "word") {
        const wordDoc = await generateWordForSubmission(submissionToProcess);
        await downloadWord(wordDoc, filename);
      }
      toast.success(`${format.toUpperCase()} generated successfully!`);
    } catch (error) {
      toast.error(
        `Failed to generate ${format.toUpperCase()}. See console for details.`
      );
      console.error(`Error generating ${format}:`, error);
    }
    setIsGenerating(false);
  };

  const handleBulkExportAll = async (format) => {
    const submissionsForActualExport = filteredSubmissionsToExport; // Use the client-side filtered list
    if (submissionsForActualExport.length === 0) {
      toast.warn("No submissions displayed to export.");
      return;
    }
    setIsGenerating(true);
    toast.info(
      `Starting bulk ${format.toUpperCase()} export for ${
        submissionsForActualExport.length
      } item(s)... This may take a while.`
    );

    let successCount = 0;
    for (let i = 0; i < submissionsForActualExport.length; i++) {
      const subSummary = submissionsForActualExport[i];
      try {
        toast.info(
          `Processing ${i + 1}/${submissionsForActualExport.length}: ${
            subSummary.material_code
          }_${subSummary.plant}`
        );
        // Fetch full details for each item before generating
        const fullSubDetailsResponse = await getSubmissionDetailsById(
          subSummary.id
        );
        if (!fullSubDetailsResponse.data) {
          throw new Error(
            `Could not fetch full details for ${subSummary.material_code}`
          );
        }
        const subToExport = fullSubDetailsResponse.data;

        const filename = `${subToExport.material_code}_${subToExport.plant}_${
          new Date().toISOString().split("T")[0]
        }`;
        if (format === "pdf") {
          const pdfDoc = await generatePdfForSubmission(subToExport);
          downloadPdf(pdfDoc, filename);
        } else if (format === "word") {
          const wordDoc = await generateWordForSubmission(subToExport);
          await downloadWord(wordDoc, filename);
        }
        successCount++;
        // Brief pause to allow browser to handle downloads and UI updates, especially for multiple files
        if (i < submissionsForActualExport.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      } catch (e) {
        toast.error(
          `Failed to export ${subSummary.material_code}_${subSummary.plant}. ${e.message}. See console.`
        );
        console.error(
          "Error in bulk export item: ",
          subSummary.material_code,
          e
        );
        const continueExport = window.confirm(
          `Error exporting ${subSummary.material_code}. Continue with next items?`
        );
        if (!continueExport) break;
      }
    }
    if (successCount > 0) {
      toast.success(
        `Bulk ${format.toUpperCase()} export process completed for ${successCount} item(s).`
      );
    } else if (submissionsForActualExport.length > 0) {
      toast.warn(
        `Bulk ${format.toUpperCase()} export process completed, but no items were successfully exported.`
      );
    }
    setIsGenerating(false);
  };

  const filteredSubmissionsToExport = submissionsToExport.filter(
    (sub) =>
      sub.material_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sub.plant_name &&
        sub.plant_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sub.plant &&
        sub.plant.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sub.category &&
        sub.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    if (exportType === "bulk") {
      fetchBulkSubmissions();
    } else {
      setSubmissionsToExport([]);
      setSingleSubmissionResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportType, bulkFilter, startDate, endDate]); // Removed fetchBulkSubmissions from dependencies

  return (
    <div className="container export-data-page">
      <header className="page-header">
        <h1>
          <FaFileExport /> Export Data
        </h1>
        <p className="page-subtitle">
          Download material data reports in PDF or Word format.
        </p>
      </header>

      {(isLoading || isGenerating) && (
        <div className="loading-overlay">
          <FaSpinner className="spinner-icon large-spinner" />
          <p>
            {isGenerating
              ? "Generating document(s)... This may take a moment."
              : "Loading data..."}
          </p>
        </div>
      )}

      <div className="export-controls card-style">
        <h2>Export Type</h2>
        <div className="radio-group-row">
          <label className="radio-label">
            <input
              type="radio"
              name="exportType"
              value="bulk"
              checked={exportType === "bulk"}
              onChange={(e) => setExportType(e.target.value)}
            />
            Bulk Export
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="exportType"
              value="single"
              checked={exportType === "single"}
              onChange={(e) => setExportType(e.target.value)}
            />
            Single Export
          </label>
        </div>
      </div>

      {exportType === "bulk" && (
        <div className="bulk-export-section card-style">
          <h2>Bulk Export Options</h2>
          <div className="filter-controls">
            <select
              value={bulkFilter}
              onChange={(e) => setBulkFilter(e.target.value)}
              className="form-control"
            >
              <option value="last10">Last 10 Submissions</option>
              <option value="lastWeek">Last Week's Submissions</option>
              <option value="dateRange">Custom Date Range</option>
            </select>
            {bulkFilter === "dateRange" && (
              <div className="date-range-picker">
                <DatePicker
                  selectsRange={true}
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(update) => setDateRange(update)}
                  isClearable={true}
                  placeholderText="Select date range"
                  className="form-control"
                  dateFormat="yyyy/MM/dd"
                />
                <FaCalendarAlt />
              </div>
            )}
          </div>

          {submissionsToExport.length > 0 && (
            <>
              <div className="search-results-filter">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Filter displayed results (Material, Plant, Category...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-control"
                />
              </div>
              <div className="bulk-actions">
                <button
                  onClick={() => handleBulkExportAll("pdf")}
                  className="btn btn-danger"
                  disabled={
                    isGenerating || filteredSubmissionsToExport.length === 0
                  }
                >
                  <FaFilePdf /> Export Displayed as PDF (
                  {filteredSubmissionsToExport.length})
                </button>
                <button
                  onClick={() => handleBulkExportAll("word")}
                  className="btn btn-info"
                  disabled={
                    isGenerating || filteredSubmissionsToExport.length === 0
                  }
                >
                  <FaFileWord /> Export Displayed as Word (
                  {filteredSubmissionsToExport.length})
                </button>
              </div>
              <p className="results-summary">
                Displaying {filteredSubmissionsToExport.length} of{" "}
                {submissionsToExport.length} fetched submissions based on
                current criteria.
              </p>
            </>
          )}

          <div className="submissions-preview-table">
            {!isLoading && filteredSubmissionsToExport.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Material Code</th>
                    <th>Plant</th>
                    <th>Category</th>
                    <th>Submitted At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissionsToExport.map((sub) => (
                    <tr key={sub.id}>
                      <td>{sub.material_code}</td>
                      <td>
                        {sub.plant_name || "N/A"} ({sub.plant})
                      </td>
                      <td>{sub.category || "N/A"}</td>
                      <td>{new Date(sub.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          onClick={() => handleExport(sub, "pdf")}
                          className="btn btn-icon btn-sm"
                          title="Export PDF"
                          disabled={isGenerating}
                        >
                          <FaFilePdf />
                        </button>
                        <button
                          onClick={() => handleExport(sub, "word")}
                          className="btn btn-icon btn-sm"
                          title="Export Word"
                          disabled={isGenerating}
                        >
                          <FaFileWord />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              !isLoading && (
                <p className="no-data-message">
                  No submissions to display based on current filters. Try
                  adjusting filter criteria or wait for data to load.
                </p>
              )
            )}
          </div>
        </div>
      )}

      {exportType === "single" && (
        <div className="single-export-section card-style">
          <h2>Single Submission Export</h2>
          <form
            onSubmit={handleFetchSingleSubmission}
            className="single-export-form"
          >
            <div className="form-group">
              <label htmlFor="singleMaterialCode">Material Code</label>
              <input
                type="text"
                id="singleMaterialCode"
                className="form-control"
                value={singleMaterialCode}
                onChange={(e) =>
                  setSingleMaterialCode(e.target.value.toUpperCase())
                }
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="singlePlantCode">Plant Code</label>
              <input
                type="text"
                id="singlePlantCode"
                className="form-control"
                value={singlePlantCode}
                onChange={(e) =>
                  setSinglePlantCode(e.target.value.toUpperCase())
                }
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || isGenerating}
            >
              <FaSearch /> Fetch Submission
            </button>
          </form>

          {!isLoading && singleSubmissionResult && (
            <div className="single-submission-details">
              <h3>
                Details for {singleSubmissionResult.material_code} at Plant{" "}
                {singleSubmissionResult.plant_name ||
                  singleSubmissionResult.plant}
              </h3>
              <p>
                <strong>Description:</strong>{" "}
                {singleSubmissionResult.material_description_snapshot || "N/A"}
              </p>
              <p>
                <strong>Category:</strong>{" "}
                {singleSubmissionResult.category || "N/A"}
              </p>
              <p>
                <strong>Submitted:</strong>{" "}
                {new Date(singleSubmissionResult.created_at).toLocaleString()}{" "}
                by {singleSubmissionResult.submitted_by_username}
              </p>
              <div className="export-actions">
                <button
                  onClick={() => handleExport(singleSubmissionResult, "pdf")}
                  className="btn btn-danger"
                  disabled={isGenerating}
                >
                  <FaFilePdf /> Export as PDF
                </button>
                <button
                  onClick={() => handleExport(singleSubmissionResult, "word")}
                  className="btn btn-info"
                  disabled={isGenerating}
                >
                  <FaFileWord /> Export as Word
                </button>
              </div>
            </div>
          )}
          {!isLoading &&
            exportType === "single" &&
            !singleSubmissionResult &&
            singleMaterialCode &&
            singlePlantCode && (
              <p className="no-data-message">
                No submission found for the provided codes, or still searching.
                If you clicked "Fetch", please wait for the result.
              </p>
            )}
          {!isLoading &&
            exportType === "single" &&
            !singleSubmissionResult &&
            (!singleMaterialCode || !singlePlantCode) && (
              <p className="no-data-message">
                Enter Material and Plant Code then click "Fetch Submission".
              </p>
            )}
        </div>
      )}
    </div>
  );
};

export default ExportDataPage;
