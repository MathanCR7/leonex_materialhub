// src/pages/CostEstimateReportPage.jsx
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import {
  getCostSummaryReport,
  getCostDetailReportForUser,
} from "../services/api";
import {
  FaUserTie,
  FaFileInvoiceDollar,
  FaSpinner,
  FaFileExcel,
  FaAngleDown,
  FaAngleUp,
} from "react-icons/fa";
import "./_CostEstimateReportPage.scss";

const CostEstimateReportPage = () => {
  const [summaryData, setSummaryData] = useState([]);
  const [detailedData, setDetailedData] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await getCostSummaryReport();
        setSummaryData(res.data);
      } catch (err) {
        toast.error("Failed to load summary report.");
        console.error(err);
      } finally {
        setIsLoadingSummary(false);
      }
    };
    fetchSummary();
  }, []);

  const handleUserClick = async (user) => {
    if (selectedUser && selectedUser.user_id === user.user_id) {
      // If clicking the same user, collapse the details
      setSelectedUser(null);
      setDetailedData([]);
      return;
    }

    setSelectedUser(user);
    setIsLoadingDetails(true);
    setDetailedData([]);
    try {
      const res = await getCostDetailReportForUser(user.user_id);
      setDetailedData(res.data);
    } catch (err) {
      toast.error(`Failed to load details for ${user.third_party_username}.`);
      console.error(err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const formatCurrency = (value) => {
    if (value === null || isNaN(value)) return "₹0.00";
    return `₹${parseFloat(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleExport = () => {
    if (!detailedData.length || !selectedUser) {
      toast.warn("No detailed data to export.");
      return;
    }

    const dataToExport = detailedData.map((item) => ({
      "Submission ID": item.submission_id,
      "Material Code (Masked)": item.mask_code,
      Plant: item.plant,
      "Good Material Count": item.good_material_count,
      "Good Material Price (Unit)": item.good_material_price,
      "Total Good Material Value": item.total_good_value,
      "Package Defect Count": item.package_defects_count,
      "Package Defect Price (Unit)": item.package_defects_price,
      "Total Package Defect Value": item.total_package_defect_value,
      "Physical Defect Count": item.physical_defects_count,
      "Physical Defect Price (Unit)": item.physical_defects_price,
      "Total Physical Defect Value": item.total_physical_defect_value,
      "Other Defect Count": item.other_defects_count,
      "Other Defect Price (Unit)": item.other_defects_price,
      "Total Other Defect Value": item.total_other_defect_value,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cost Details");
    XLSX.writeFile(
      workbook,
      `Cost_Report_${selectedUser.third_party_username}.xlsx`
    );
  };

  return (
    <div className="container cost-estimate-report-page">
      <header className="page-header">
        <h1>Cost Estimate Report</h1>
        <p className="page-subtitle">
          Summary of total estimated costs by third-party vendors.
        </p>
      </header>

      {isLoadingSummary ? (
        <div className="loading-fullscreen">
          <FaSpinner className="spinner-icon large-spinner" />
          <p>Loading Summary Report...</p>
        </div>
      ) : (
        <div className="report-container">
          <div className="summary-card card-style">
            <h2>
              <FaUserTie /> Vendor Summary
            </h2>
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Vendor Username</th>
                  <th>Total Calculated Value</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {summaryData.map((user) => (
                  <tr
                    key={user.user_id}
                    onClick={() => handleUserClick(user)}
                    className={
                      selectedUser?.user_id === user.user_id ? "active" : ""
                    }
                  >
                    <td>{user.third_party_username}</td>
                    <td>{formatCurrency(user.total_calculated_value)}</td>
                    <td className="details-toggle">
                      {selectedUser?.user_id === user.user_id ? (
                        <FaAngleUp />
                      ) : (
                        <FaAngleDown />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedUser && (
            <div className="details-card card-style">
              <header className="details-header">
                <h2>
                  <FaFileInvoiceDollar /> Details for{" "}
                  {selectedUser.third_party_username}
                </h2>
                <button
                  onClick={handleExport}
                  className="button button-primary"
                  disabled={isLoadingDetails}
                >
                  <FaFileExcel /> Export to Excel
                </button>
              </header>

              {isLoadingDetails ? (
                <div className="loading-text">
                  <FaSpinner className="spinner-icon" /> Loading details...
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="details-table">
                    <thead>
                      <tr>
                        <th rowSpan="2">Sub ID</th>
                        <th rowSpan="2">Material</th>
                        <th colSpan="3">Good Material</th>
                        <th colSpan="3">Package Defects</th>
                        <th colSpan="3">Physical Defects</th>
                        <th colSpan="3">Other Defects</th>
                      </tr>
                      <tr>
                        <th>Count</th>
                        <th>Price/Unit</th>
                        <th>Total Value</th>
                        <th>Count</th>
                        <th>Price/Unit</th>
                        <th>Total Value</th>
                        <th>Count</th>
                        <th>Price/Unit</th>
                        <th>Total Value</th>
                        <th>Count</th>
                        <th>Price/Unit</th>
                        <th>Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailedData.map((item) => (
                        <tr key={item.submission_id}>
                          <td>{item.submission_id}</td>
                          <td>
                            {item.mask_code}
                            <br />
                            <small>({item.plant})</small>
                          </td>
                          <td>{item.good_material_count}</td>
                          <td>{formatCurrency(item.good_material_price)}</td>
                          <td className="total-col">
                            {formatCurrency(item.total_good_value)}
                          </td>
                          <td>{item.package_defects_count}</td>
                          <td>{formatCurrency(item.package_defects_price)}</td>
                          <td className="total-col">
                            {formatCurrency(item.total_package_defect_value)}
                          </td>
                          <td>{item.physical_defects_count}</td>
                          <td>{formatCurrency(item.physical_defects_price)}</td>
                          <td className="total-col">
                            {formatCurrency(item.total_physical_defect_value)}
                          </td>
                          <td>{item.other_defects_count}</td>
                          <td>{formatCurrency(item.other_defects_price)}</td>
                          <td className="total-col">
                            {formatCurrency(item.total_other_defect_value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CostEstimateReportPage;
