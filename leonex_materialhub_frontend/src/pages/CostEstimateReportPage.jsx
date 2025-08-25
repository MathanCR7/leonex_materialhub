import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import {
  getCostSummaryReport,
  getCostDetailReportForUser,
  getThirdPartyUsers,
  getUniquePlantsForReport,
} from "../services/api";
import {
  FaUserTie, FaFileInvoiceDollar, FaSpinner, FaFileExcel, FaAngleDown,
  FaAngleUp, FaSearch, FaCalendarAlt, FaUsers, FaTimes, FaMapMarkerAlt, FaFilter
} from "react-icons/fa";
import Pagination from "../components/Pagination";
import "./_CostEstimateReportPage.scss";

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const useOutsideAlerter = (ref, callback) => {
    useEffect(() => {
        function handleClickOutside(event) {
            if (ref.current && !ref.current.contains(event.target)) {
                callback();
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref, callback]);
}

const ActiveFilters = ({ filters, allVendors, onClearFilter }) => {
  const activeFilters = [];
  if (filters.materialCode) activeFilters.push({ key: 'materialCode', label: 'Material', value: filters.materialCode });
  if (filters.plantCodes.length > 0) {
    filters.plantCodes.forEach(plant => {
      activeFilters.push({ key: `plant_${plant}`, label: 'Plant', value: plant });
    });
  }
  if (filters.startDate && filters.endDate) activeFilters.push({ key: 'date', label: 'Date', value: `${filters.startDate} to ${filters.endDate}` });
  filters.userIds.forEach(id => {
    const vendor = allVendors.find(v => v.id === id);
    if (vendor) activeFilters.push({ key: `user_${id}`, label: 'Vendor', value: vendor.username });
  });
  if (activeFilters.length === 0) return null;
  return (
    <div className="active-filters-bar">
      <span>Active Filters:</span>
      <div className="pills-container">
        {activeFilters.map(filter => (
          <div key={filter.key} className="filter-pill">
            <strong>{filter.label}:</strong> {filter.value}
            <button onClick={() => onClearFilter(filter.key)}><FaTimes /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

const CostEstimateReportPage = () => {
  const [summaryData, setSummaryData] = useState([]);
  const [detailedData, setDetailedData] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [allVendors, setAllVendors] = useState([]);
  const [allPlants, setAllPlants] = useState([]);
  
  const [isPlantDropdownOpen, setIsPlantDropdownOpen] = useState(false);
  const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState(false);
  
  const plantDropdownRef = useRef(null);
  const vendorDropdownRef = useRef(null);
  useOutsideAlerter(plantDropdownRef, () => setIsPlantDropdownOpen(false));
  useOutsideAlerter(vendorDropdownRef, () => setIsVendorDropdownOpen(false));

  const [filters, setFilters] = useState({ materialCode: "", plantCodes: [], userIds: [], startDate: "", endDate: "" });
  const [dateRange, setDateRange] = useState([null, null]);
  
  const debouncedMaterialCode = useDebounce(filters.materialCode, 500);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    const [start, end] = dateRange;
    setFilters(prev => ({ ...prev, startDate: start ? start.toISOString().split('T')[0] : "", endDate: end ? end.toISOString().split('T')[0] : "" }));
  }, [dateRange]);

  useEffect(() => {
    getThirdPartyUsers().then(res => setAllVendors(res.data)).catch(() => toast.error("Failed to load vendor list."));
    getUniquePlantsForReport().then(res => setAllPlants(res.data)).catch(() => toast.error("Failed to load plant list."));
  }, []);

  const fetchReportData = useCallback(async (appliedFilters) => {
    setIsLoadingSummary(true);
    setSelectedUser(null);
    setDetailedData([]);
    try {
      const queryParams = {};
      if (appliedFilters.materialCode) queryParams.materialCode = appliedFilters.materialCode;
      if (appliedFilters.plantCodes.length > 0) queryParams.plantCodes = appliedFilters.plantCodes.join(',');
      if (appliedFilters.userIds.length > 0) queryParams.userIds = appliedFilters.userIds.join(',');
      if (appliedFilters.startDate) queryParams.startDate = appliedFilters.startDate;
      if (appliedFilters.endDate) queryParams.endDate = appliedFilters.endDate;
      const res = await getCostSummaryReport({ params: queryParams });
      setSummaryData(res.data);
    } catch (err) {
      toast.error("Failed to load summary report with filters.");
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);
  
  const fetchUserDetails = useCallback(async (userId, page = 1) => {
    setIsLoadingDetails(true);
    setDetailedData([]);
    try {
      const queryParams = { page, limit: 10 };
      if (debouncedMaterialCode) queryParams.materialCode = debouncedMaterialCode;
      if (filters.plantCodes.length > 0) queryParams.plantCodes = filters.plantCodes.join(',');
      if (filters.userIds.length > 0) queryParams.userIds = filters.userIds.join(',');
      if (filters.startDate) queryParams.startDate = filters.startDate;
      if (filters.endDate) queryParams.endDate = filters.endDate;
      const res = await getCostDetailReportForUser(userId, { params: queryParams });
      setDetailedData(res.data.data);
      setCurrentPage(res.data.currentPage);
      setTotalPages(res.data.totalPages);
      setTotalItems(res.data.totalItems);
    } catch (err) {
      toast.error(`Failed to load details for the selected vendor.`);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [debouncedMaterialCode, filters.plantCodes, filters.userIds, filters.startDate, filters.endDate]);
  
  // This useEffect fetches the main summary data whenever a filter changes.
  useEffect(() => {
    const appliedFilters = { ...filters, materialCode: debouncedMaterialCode };
    fetchReportData(appliedFilters);
  }, [debouncedMaterialCode, filters.plantCodes, filters.userIds, filters.startDate, filters.endDate, fetchReportData]);
  
  // DEFINITIVE FIX: This useEffect now correctly handles re-fetching details when filters change.
  useEffect(() => {
    if (selectedUser) {
      // It refetches from page 1 whenever the filters (via fetchUserDetails dependencies) change.
      // It also runs when currentPage changes for pagination.
      fetchUserDetails(selectedUser.user_id, currentPage);
    }
  }, [selectedUser, currentPage, fetchUserDetails]);


  const handleUserClick = (user) => {
    setCurrentPage(1); // Always reset to page 1 when clicking a user
    if (selectedUser && selectedUser.user_id === user.user_id) {
      setSelectedUser(null);
    } else {
      setSelectedUser(user);
    }
  };

  const handleClearFilter = (key) => {
    if (key === 'materialCode') setFilters(p => ({ ...p, materialCode: '' }));
    else if (key.startsWith('plant_')) {
        const plantCode = key.split('_')[1];
        setFilters(p => ({ ...p, plantCodes: p.plantCodes.filter(code => code !== plantCode)}));
    }
    else if (key === 'date') setDateRange([null, null]);
    else if (key.startsWith('user_')) {
      const userId = parseInt(key.split('_')[1], 10);
      setFilters(p => ({ ...p, userIds: p.userIds.filter(id => id !== userId) }));
    }
  };
  
  const handleVendorFilterChange = (e) => {
    const { value, checked } = e.target;
    const userId = parseInt(value, 10);
    setFilters(p => ({ ...p, userIds: checked ? [...p.userIds, userId] : p.userIds.filter(id => id !== userId) }));
  };

  const handlePlantFilterChange = (e) => {
      const { value, checked } = e.target;
      setFilters(p => ({ ...p, plantCodes: checked ? [...p.plantCodes, value] : p.plantCodes.filter(code => code !== value)}));
  };
  
  const formatCurrency = (value) => {
    if (value === null || isNaN(value)) return "₹0.00";
    return `₹${parseFloat(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const handleExport = () => {
    if (!detailedData.length || !selectedUser) {
      toast.warn("No detailed data to export."); return;
    }
    const dataToExport = detailedData.map((item) => ({
      "Submission ID": item.submission_id,
      "Material Code": item.material_code,
      "Mask Code": item.mask_code,
      "Plant": item.plant,
      "Good Material Count": item.good_material_count, "Good Material Price (Unit)": item.good_material_price, "Total Good Material Value": item.total_good_value,
      "Package Defect Count": item.package_defects_count, "Package Defect Price (Unit)": item.package_defects_price, "Total Package Defect Value": item.total_package_defect_value,
      "Physical Defect Count": item.physical_defects_count, "Physical Defect Price (Unit)": item.physical_defects_price, "Total Physical Defect Value": item.total_physical_defect_value,
      "Other Defect Count": item.other_defects_count, "Other Defect Price (Unit)": item.other_defects_price, "Total Other Defect Value": item.total_other_defect_value,
      "Grand Total": item.grand_total,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cost Details");
    XLSX.writeFile(workbook, `Cost_Report_${selectedUser.third_party_username}.xlsx`);
  };

  return (
    <div className="container cost-estimate-report-page">
      <header className="page-header">
        <h1>Cost Estimate Report</h1>
        <p className="page-subtitle">Summary of total estimated costs by third-party vendors, with advanced filtering.</p>
      </header>
      
      <div className="filters-container card-style">
        <h2 className="card-header"><FaFilter /> Filter Report</h2>
        <div className="filter-grid">
          <div className="filter-group">
            <label htmlFor="materialCode"><FaSearch/> Material Code</label>
            <input type="text" id="materialCode" placeholder="Enter exact Material Code" value={filters.materialCode} onChange={(e) => setFilters(p => ({...p, materialCode: e.target.value}))}/>
          </div>
          
          <div className="filter-group" ref={plantDropdownRef}>
            <label><FaMapMarkerAlt/> Plant Code</label>
            <div className="custom-dropdown">
                <button className="dropdown-toggle" onClick={() => setIsPlantDropdownOpen(!isPlantDropdownOpen)}>
                    {filters.plantCodes.length === 0 ? "Select Plants" : `${filters.plantCodes.length} plant(s) selected`}
                    <FaAngleDown className={`dropdown-arrow ${isPlantDropdownOpen ? 'open' : ''}`} />
                </button>
                {isPlantDropdownOpen && (
                    <div className="dropdown-menu">
                        {allPlants.map(plant => (
                            <div key={plant} className="dropdown-item">
                                <input type="checkbox" id={`plant-${plant}`} value={plant} checked={filters.plantCodes.includes(plant)} onChange={handlePlantFilterChange}/>
                                <label htmlFor={`plant-${plant}`}>{plant}</label>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>
          
          <div className="filter-group" ref={vendorDropdownRef}>
            <label><FaUsers/> Vendors</label>
            <div className="custom-dropdown">
                <button className="dropdown-toggle" onClick={() => setIsVendorDropdownOpen(!isVendorDropdownOpen)}>
                    {filters.userIds.length === 0 ? "Select Vendors" : `${filters.userIds.length} vendor(s) selected`}
                    <FaAngleDown className={`dropdown-arrow ${isVendorDropdownOpen ? 'open' : ''}`} />
                </button>
                {isVendorDropdownOpen && (
                    <div className="dropdown-menu">
                        {allVendors.map(vendor => (
                            <div key={vendor.id} className="dropdown-item">
                                <input type="checkbox" id={`vendor-${vendor.id}`} value={vendor.id} checked={filters.userIds.includes(vendor.id)} onChange={handleVendorFilterChange}/>
                                <label htmlFor={`vendor-${vendor.id}`}>{vendor.username}</label>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>

          <div className="filter-group">
            <label><FaCalendarAlt/> Submission Date Range</label>
            <DatePicker selectsRange startDate={dateRange[0]} endDate={dateRange[1]} onChange={(update) => setDateRange(update)} isClearable placeholderText="Select a date range" className="date-picker-input" />
          </div>
        </div>
        <ActiveFilters filters={{...filters, materialCode: debouncedMaterialCode }} allVendors={allVendors} onClearFilter={handleClearFilter} />
      </div>

      {isLoadingSummary ? ( <div className="loading-fullscreen"><FaSpinner className="spinner-icon large-spinner" /><p>Loading Summary Report...</p></div> ) : (
        <div className="report-container">
          <div className="summary-card card-style">
            <h2 className="card-header"><FaUserTie /> Vendor Summary</h2>
            <div className="table-responsive">
              <table className="summary-table">
                <thead><tr><th>Vendor Username</th><th>Total Calculated Value</th><th className="details-col-header">Details</th></tr></thead>
                <tbody>
                  {summaryData.length > 0 ? summaryData.map((user) => (
                    <tr key={user.user_id} onClick={() => handleUserClick(user)} className={selectedUser?.user_id === user.user_id ? "active" : ""}>
                      <td data-label="Vendor">{user.third_party_username}</td>
                      <td data-label="Total Value">{formatCurrency(user.total_calculated_value)}</td>
                      <td className="details-toggle">{selectedUser?.user_id === user.user_id ? <FaAngleUp /> : <FaAngleDown />}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="3" className="no-data-cell">No matching vendor summaries found for the selected filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {selectedUser && (
            <div className="details-card card-style">
              <header className="details-header">
                <h2 className="card-header"><FaFileInvoiceDollar /> Details for {selectedUser.third_party_username}</h2>
                <button onClick={handleExport} className="export-btn" disabled={isLoadingDetails || detailedData.length === 0}><FaFileExcel /> Export Details</button>
              </header>
              {isLoadingDetails ? ( <div className="loading-indicator"><FaSpinner className="spinner-icon" /> <span>Loading details...</span></div> ) : ( detailedData.length > 0 ? (
                <>
                  <div className="table-responsive">
                    <table className="details-table">
                      <thead>
                        <tr>
                          <th rowSpan="2" className="sticky-col-1">Sub ID</th><th rowSpan="2" className="sticky-col-2">Material</th>
                          <th colSpan="3">Good Material</th><th colSpan="3">Package Defects</th><th colSpan="3">Physical Defects</th>
                          <th colSpan="3">Other Defects</th><th rowSpan="2" className="grand-total-header">Grand Total</th>
                        </tr>
                        <tr>
                          <th>Qty</th><th>Price</th><th>Total</th><th>Qty</th><th>Price</th><th>Total</th><th>Qty</th><th>Price</th><th>Total</th><th>Qty</th><th>Price</th><th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailedData.map((item) => (
                          <tr key={item.submission_id}>
                            <td className="sticky-col-1">{item.submission_id}</td>
                            <td className="material-cell sticky-col-2">
                              <span>{item.mask_code || 'N/A'}</span>
                              <small>{item.material_code}</small>
                              <small>Plant: {item.plant}</small>
                            </td>
                            <td>{item.good_material_count}</td><td>{formatCurrency(item.good_material_price)}</td><td className="total-col">{formatCurrency(item.total_good_value)}</td>
                            <td>{item.package_defects_count}</td><td>{formatCurrency(item.package_defects_price)}</td><td className="total-col">{formatCurrency(item.total_package_defect_value)}</td>
                            <td>{item.physical_defects_count}</td><td>{formatCurrency(item.physical_defects_price)}</td><td className="total-col">{formatCurrency(item.total_physical_defect_value)}</td>
                            <td>{item.other_defects_count}</td><td>{formatCurrency(item.other_defects_price)}</td><td className="total-col">{formatCurrency(item.total_other_defect_value)}</td>
                            <td className="grand-total-cell">{formatCurrency(item.grand_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="pagination-controls">
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} isLoading={isLoadingDetails} />
                    <span className="pagination-summary">Page {currentPage} of {totalPages} (Total: {totalItems} items)</span>
                  </div>
                </>
              ) : (
                <div className="no-data-cell">No detailed records found for this vendor with the selected filters.</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CostEstimateReportPage;