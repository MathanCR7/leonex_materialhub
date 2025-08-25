import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  getStockReport,
  getUniquePlantsForReport, // This function should call the new backend endpoint
  getUniqueSubmittersForReport,
} from "../services/api";
import {
  FaFilter, FaSpinner, FaSearch, FaCalendarAlt, FaUserEdit, FaTimes,
  FaMapMarkerAlt, FaAngleDown, FaEye, FaCheckCircle, FaHourglassHalf,
  FaExclamationTriangle, FaUndo, FaBoxes, FaBoxOpen, FaClipboardCheck,
  FaExclamationCircle, FaTools, FaMinusCircle, FaClipboardList, FaTasks
} from "react-icons/fa";
import "./_StockReportPage.scss";

// Timezone-safe date formatting helper function (no changes)
const formatDateForQuery = (date) => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Reusable hooks (no changes)
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
};

// Status icon component (no changes)
const StatusIcon = ({ status }) => {
    switch (status) {
        case 'APPROVED':
            return <span className="status-badge status-approved"><FaCheckCircle /> Approved</span>;
        case 'REWORK_REQUESTED':
            return <span className="status-badge status-rework-req"><FaExclamationTriangle /> Rework Requested</span>;
        case 'REWORK_COMPLETED':
            return <span className="status-badge status-rework-comp"><FaUndo /> Rework Completed</span>;
        case 'PENDING':
        default:
            return <span className="status-badge status-pending"><FaHourglassHalf /> Pending</span>;
    }
};

const StockReportPage = () => {
  const [reportData, setReportData] = useState([]);
  const [topLevelCounts, setTopLevelCounts] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allPlants, setAllPlants] = useState([]);
  const [allSubmitters, setAllSubmitters] = useState([]);
  
  const [isPlantDropdownOpen, setIsPlantDropdownOpen] = useState(false);
  const [isSubmitterDropdownOpen, setIsSubmitterDropdownOpen] = useState(false);
  const [expandedPlants, setExpandedPlants] = useState({});

  const plantDropdownRef = useRef(null);
  const submitterDropdownRef = useRef(null);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const dateFilterRef = useRef(null);

  useOutsideAlerter(plantDropdownRef, () => setIsPlantDropdownOpen(false));
  useOutsideAlerter(submitterDropdownRef, () => setIsSubmitterDropdownOpen(false));
  useOutsideAlerter(dateFilterRef, () => setIsDatePopoverOpen(false));

  const [filters, setFilters] = useState({ materialCode: "", plantCodes: [], usernames: [], startDate: "", endDate: "" });
  
  const [dateRange, setDateRange] = useState([null, null]);
  const [datePreset, setDatePreset] = useState("all_time");
  
  const debouncedMaterialCode = useDebounce(filters.materialCode, 500);

  // --- MODIFIED: Restored the getUniquePlantsForReport call ---
  useEffect(() => {
    getUniquePlantsForReport().then(res => setAllPlants(res.data)).catch(() => toast.error("Failed to load plant list."));
    getUniqueSubmittersForReport().then(res => setAllSubmitters(res.data)).catch(() => toast.error("Failed to load submitter list."));
  }, []);

  const fetchReportData = useCallback(async (appliedFilters) => {
    setIsLoading(true);
    try {
      const queryParams = {};
      if (appliedFilters.materialCode) queryParams.materialCode = appliedFilters.materialCode;
      if (appliedFilters.plantCodes.length > 0) queryParams.plantCodes = appliedFilters.plantCodes.join(',');
      if (appliedFilters.usernames.length > 0) queryParams.usernames = appliedFilters.usernames.join(',');
      if (appliedFilters.startDate) queryParams.startDate = appliedFilters.startDate;
      if (appliedFilters.endDate) queryParams.endDate = appliedFilters.endDate;

      const res = await getStockReport(queryParams);
      setReportData(res.data.reportData);
      setTopLevelCounts(res.data.topLevelCounts);
      setExpandedPlants({});

    } catch (err) {
      toast.error("Failed to load stock report.");
      setTopLevelCounts({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const [start, end] = dateRange;
    const formattedStartDate = formatDateForQuery(start);
    const formattedEndDate = formatDateForQuery(end);
    setFilters(prev => ({ ...prev, startDate: formattedStartDate, endDate: formattedEndDate }));
  }, [dateRange]);

  useEffect(() => {
    const appliedFilters = { ...filters, materialCode: debouncedMaterialCode };
    fetchReportData(appliedFilters);
  }, [debouncedMaterialCode, filters.plantCodes, filters.usernames, filters.startDate, filters.endDate, fetchReportData]);

  const handleFilterChange = (type, value) => {
    setFilters(p => {
      if (Array.isArray(p[type])) {
        const newArr = p[type].includes(value) ? p[type].filter(item => item !== value) : [...p[type], value];
        return { ...p, [type]: newArr };
      }
      return { ...p, [type]: value };
    });
  };

  const handleDatePresetClick = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let start = null;
    let end = null;

    switch (preset) {
        case 'today':
            start = new Date(today);
            end = new Date(today);
            break;
        case 'yesterday':
            start = new Date(today);
            start.setDate(start.getDate() - 1);
            end = new Date(start);
            break;
        case 'last7':
            end = new Date(today);
            start = new Date(today);
            start.setDate(start.getDate() - 6);
            break;
        case 'thisMonth':
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today);
            break;
        case 'lastMonth':
            start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            end = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
        case 'all_time':
        default:
             break;
    }
    setDateRange([start, end]);
    setIsDatePopoverOpen(false);
  };
  
  const handleDateChange = (dates) => {
      const [start, end] = dates;
      setDateRange([start, end]);
      setDatePreset(start && end ? "custom" : "all_time");
  };

  const formatDateRangeForDisplay = () => {
    const [start, end] = dateRange;
    if (datePreset !== 'custom' && datePreset !== 'all_time') {
      return {
        'today': 'Today', 'yesterday': 'Yesterday', 'last7': 'Last 7 Days',
        'thisMonth': 'This Month', 'lastMonth': 'Last Month'
      }[datePreset];
    }
    if (start && end) {
      const options = { month: 'short', day: 'numeric', year: 'numeric' };
      if (start.toDateString() === end.toDateString()) {
        return start.toLocaleDateString(undefined, options);
      }
      return `${start.toLocaleDateString(undefined, options)} - ${end.toLocaleDateString(undefined, options)}`;
    }
    return "All Time";
  };

  const togglePlantExpansion = (plantCode) => {
    setExpandedPlants(prev => ({...prev, [plantCode]: !prev[plantCode]}));
  };

  const datePresets = [
    { key: 'today', label: 'Today' }, { key: 'yesterday', label: 'Yesterday' },
    { key: 'last7', label: 'Last 7 Days' }, { key: 'thisMonth', label: 'This Month' },
    { key: 'lastMonth', label: 'Last Month' }, { key: 'all_time', label: 'All Time' },
  ];

  return (
    <div className="container stock-report-page">
      <header className="page-header">
        <h1>Stock Report</h1>
        <p className="page-subtitle">An overview of material stock quantities and statuses across all plants.</p>
      </header>
      
      <div className="filters-container card-style">
        <h2 className="card-header"><FaFilter /> Filter Report</h2>
        <div className="filter-grid">
          <div className="filter-group">
            <label htmlFor="materialCode"><FaSearch/> Material Code</label>
            <input type="text" id="materialCode" placeholder="Search by Material or Mask Code" value={filters.materialCode} onChange={(e) => handleFilterChange('materialCode', e.target.value)}/>
          </div>
          <div className="filter-group" ref={plantDropdownRef}>
            <label><FaMapMarkerAlt/> Plant</label>
            <div className="custom-dropdown">
                <button className="dropdown-toggle" onClick={() => setIsPlantDropdownOpen(!isPlantDropdownOpen)}>
                    <span>{filters.plantCodes.length === 0 ? "Select Plants" : `${filters.plantCodes.length} plant(s) selected`}</span>
                    <FaAngleDown className={`dropdown-arrow ${isPlantDropdownOpen ? 'open' : ''}`} />
                </button>
                {isPlantDropdownOpen && ( <div className="dropdown-menu">{allPlants.map(plant => (<div key={plant} className="dropdown-item"><input type="checkbox" id={`plant-${plant}`} value={plant} checked={filters.plantCodes.includes(plant)} onChange={() => handleFilterChange('plantCodes', plant)}/><label htmlFor={`plant-${plant}`}>{plant}</label></div>))}</div>)}
            </div>
          </div>
          <div className="filter-group" ref={submitterDropdownRef}>
            <label><FaUserEdit/> Submitted By</label>
            <div className="custom-dropdown">
                <button className="dropdown-toggle" onClick={() => setIsSubmitterDropdownOpen(!isSubmitterDropdownOpen)}>
                    <span>{filters.usernames.length === 0 ? "Select Users" : `${filters.usernames.length} user(s) selected`}</span>
                    <FaAngleDown className={`dropdown-arrow ${isSubmitterDropdownOpen ? 'open' : ''}`} />
                </button>
                {isSubmitterDropdownOpen && (<div className="dropdown-menu">{allSubmitters.map(user => (<div key={user} className="dropdown-item"><input type="checkbox" id={`user-${user}`} value={user} checked={filters.usernames.includes(user)} onChange={() => handleFilterChange('usernames', user)}/><label htmlFor={`user-${user}`}>{user}</label></div>))}</div>)}
            </div>
          </div>
          
          <div className="filter-group" ref={dateFilterRef}>
            <label><FaCalendarAlt/> Submission Date</label>
            <div className="date-filter-popover-container">
                <button className="date-range-toggle" onClick={() => setIsDatePopoverOpen(!isDatePopoverOpen)}>
                    <span>{formatDateRangeForDisplay()}</span>
                    <FaAngleDown className={`dropdown-arrow ${isDatePopoverOpen ? 'open' : ''}`} />
                </button>
                {isDatePopoverOpen && (
                    <div className="date-popover">
                        <div className="date-presets">
                          {datePresets.map(p => (
                            <button key={p.key} className={`preset-btn ${datePreset === p.key ? 'active' : ''}`} onClick={() => handleDatePresetClick(p.key)}>
                              {p.label}
                            </button>
                          ))}
                        </div>
                        <div className="date-picker-wrapper">
                            <DatePicker selected={dateRange[0]} onChange={handleDateChange} startDate={dateRange[0]} endDate={dateRange[1]} selectsRange inline/>
                        </div>
                    </div>
                )}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? ( <div className="loading-fullscreen"><FaSpinner className="spinner-icon large-spinner" /><p>Loading Report Data...</p></div> ) : (
        <>
        {topLevelCounts && (
          <div className="top-counts-container">
            <div className="count-card completed-materials"><FaTasks /><div><span>Completed Materials</span><strong>{(topLevelCounts.totalMaterials || 0).toLocaleString('en-IN')}</strong></div></div>
            <div className="count-card provided-soh"><FaClipboardList /><div><span>Total Provided SOH</span><strong>{(topLevelCounts.totalProvidedSoh || 0).toLocaleString('en-IN')}</strong></div></div>
            <div className="count-card updated-soh"><FaBoxes /><div><span>Total Updated SOH</span><strong>{(topLevelCounts.totalSoh || 0).toLocaleString('en-IN')}</strong></div></div>
            <div className="count-card good"><FaClipboardCheck /><div><span>Total Good</span><strong>{(topLevelCounts.totalGood || 0).toLocaleString('en-IN')}</strong></div></div>
            <div className="count-card package-defect"><FaBoxOpen /><div><span>Package Defects</span><strong>{(topLevelCounts.totalPackageDefects || 0).toLocaleString('en-IN')}</strong></div></div>
            <div className="count-card physical-defect"><FaTools /><div><span>Physical Defects</span><strong>{(topLevelCounts.totalPhysicalDefects || 0).toLocaleString('en-IN')}</strong></div></div>
            <div className="count-card missing"><FaMinusCircle /><div><span>Missing</span><strong>{(topLevelCounts.totalMissing || 0).toLocaleString('en-IN')}</strong></div></div>
          </div>
        )}

        <div className="report-data-container">
          {reportData.length > 0 ? reportData.map(plantData => (
            <div key={plantData.plant} className={`plant-card ${expandedPlants[plantData.plant] ? 'expanded' : ''}`}>
              <header className="plant-card-header" onClick={() => togglePlantExpansion(plantData.plant)}>
                <div className="plant-info">
                  <h3>{plantData.plantlocation} <span className="plant-code">({plantData.plant})</span></h3>
                  <span className="material-count-badge">{plantData.material_count} Materials</span>
                </div>
                <div className="plant-summary-counts">
                  <div className="summary-item provided-soh"><strong>{(plantData.total_provided_soh || 0).toLocaleString('en-IN')}</strong><span>Provided SOH</span></div>
                  <div className="summary-item updated-soh"><strong>{(plantData.total_soh || 0).toLocaleString('en-IN')}</strong><span>Updated SOH</span></div>
                  <div className="summary-item good"><strong>{(plantData.total_good || 0).toLocaleString('en-IN')}</strong><span>Good</span></div>
                  <div className="summary-item package-defects"><strong>{(plantData.total_package_defects || 0).toLocaleString('en-IN')}</strong><span>Pkg. Defects</span></div>
                  <div className="summary-item physical-defects"><strong>{(plantData.total_physical_defects || 0).toLocaleString('en-IN')}</strong><span>Phys. Defects</span></div>
                  <div className="summary-item missing"><strong>{(plantData.total_missing || 0).toLocaleString('en-IN')}</strong><span>Missing</span></div>
                </div>
                <button className="expand-toggle"><FaAngleDown className="toggle-icon" /></button>
              </header>

              <div className="plant-details-wrapper">
                <div className="plant-details-table-container">
                  <table className="details-table">
                    <thead>
                      <tr>
                        <th>Material Code</th><th>Description</th><th>Provided SOH</th><th>Updated SOH</th><th>Good</th>
                        <th>Pkg. Defects</th><th>Phys. Defects</th><th>Missing</th>
                        <th>Status</th><th>Submitted By</th><th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plantData.materials.map(material => (
                        <tr key={material.id}>
                          <td data-label="Material Code">{material.material_code}</td>
                          <td data-label="Description" className="description-cell">{material.material_description_snapshot}</td>
                          <td data-label="Provided SOH">{material.provided_soh}</td>
                          <td data-label="Updated SOH">{material.soh_quantity}</td>
                          <td data-label="Good">{material.good_material_count}</td>
                          <td data-label="Pkg. Defects">{material.package_defects_count}</td>
                          <td data-label="Phys. Defects">{material.physical_defects_count}</td>
                          <td data-label="Missing">{material.missing_material_count}</td>
                          <td data-label="Status"><StatusIcon status={material.approval_status} /></td>
                          <td data-label="Submitted By">{material.submitted_by_username}</td>
                          <td data-label="Action"><Link to={`/inspection/${material.id}`} className="action-btn-view" title="View Inspection"><FaEye /></Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )) : (
            <div className="no-data-card">
              <FaExclamationCircle />
              <h3>No Data Found</h3>
              <p>No submission data matches your current filter criteria. Try adjusting your filters.</p>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
};

export default StockReportPage;