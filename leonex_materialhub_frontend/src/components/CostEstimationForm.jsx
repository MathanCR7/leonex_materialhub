import React, { useState, useEffect } from "react";
import "./_CostEstimationForm.scss";

const CostEstimationForm = ({ counts, formData, setFormData }) => {
  const [totals, setTotals] = useState({
    good_material: 0,
    package_defects: 0,
    physical_defects: 0,
    other_defects: 0,
    grand_total: 0,
  });

  // --- MODIFIED useEffect ---
  // This hook now also automatically sets the price to "0" for any category with 0 units.
  useEffect(() => {
    if (!counts || !formData) {
      return;
    }

    // Auto-update form data for zero-count items
    const updatedFormData = { ...formData };
    let didUpdate = false;

    if (counts.good_material === 0 && formData.good_material_price !== "0") {
      updatedFormData.good_material_price = "0";
      didUpdate = true;
    }
    if (counts.package_defects === 0 && formData.package_defects_price !== "0") {
      updatedFormData.package_defects_price = "0";
      didUpdate = true;
    }
    if (counts.physical_defects === 0 && formData.physical_defects_price !== "0") {
      updatedFormData.physical_defects_price = "0";
      didUpdate = true;
    }
    if (counts.other_defects === 0 && formData.other_defects_price !== "0") {
      updatedFormData.other_defects_price = "0";
      didUpdate = true;
    }

    if (didUpdate) {
      setFormData(updatedFormData);
    }

    // Calculation logic remains the same but will use the new "0" values.
    const calculateTotals = () => {
      const getNum = (val) => {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
      };

      const dataToCalculate = didUpdate ? updatedFormData : formData;

      const good = getNum(counts.good_material) * getNum(dataToCalculate.good_material_price);
      const package_def = getNum(counts.package_defects) * getNum(dataToCalculate.package_defects_price);
      const physical_def = getNum(counts.physical_defects) * getNum(dataToCalculate.physical_defects_price);
      const other_def = getNum(counts.other_defects) * getNum(dataToCalculate.other_defects_price);
      
      const grand_total = good + package_def + physical_def + other_def;

      setTotals({
        good_material: good,
        package_defects: package_def,
        physical_defects: physical_def,
        other_defects: other_def,
        grand_total,
      });
    };
    
    calculateTotals();
  }, [formData, counts, setFormData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const formatNumber = (num) => {
    const numericValue = parseFloat(num);
    if (isNaN(numericValue)) return '0.00';
    return numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  if (!counts) {
    return <div className="loading-text">Loading counts...</div>;
  }
  
  const getDisplayPrice = (price) => {
      const parsed = parseFloat(price);
      return isNaN(parsed) ? '0.00' : formatNumber(parsed);
  };

  return (
    <div className="cost-estimation-form">
      <div className="estimation-grid">
        {/* Good Material */}
        <div className="form-group">
          <label htmlFor="good_material_price">Good Material Price ({counts.good_material || 0} units)</label>
          <div className="input-with-calc">
            <input
              type="number"
              id="good_material_price"
              name="good_material_price"
              value={formData.good_material_price}
              onChange={handleInputChange}
              placeholder="Price per unit"
              className="form-control"
              required={true}
              min="0"
              step="0.01"
              // --- NEW: Disable input if count is 0 ---
              disabled={counts.good_material === 0}
            />
            {/* Condition reverted to > 0 as it's not needed for 0-count items */}
            {counts.good_material > 0 && formData.good_material_price && (
              <div className="dynamic-calculation">
                {counts.good_material} &times; {getDisplayPrice(formData.good_material_price)} = <strong>{formatNumber(totals.good_material)}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Package Defects */}
        <div className="form-group">
          <label htmlFor="package_defects_price">Package Defect Price ({counts.package_defects || 0} units)</label>
          <div className="input-with-calc">
            <input
              type="number"
              id="package_defects_price"
              name="package_defects_price"
              value={formData.package_defects_price}
              onChange={handleInputChange}
              placeholder="Price per unit"
              className="form-control"
              required={true}
              min="0"
              step="0.01"
              disabled={counts.package_defects === 0}
            />
            {counts.package_defects > 0 && formData.package_defects_price && (
              <div className="dynamic-calculation">
                {counts.package_defects} &times; {getDisplayPrice(formData.package_defects_price)} = <strong>{formatNumber(totals.package_defects)}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Physical Defects */}
        <div className="form-group">
          <label htmlFor="physical_defects_price">Physical Defect Price ({counts.physical_defects || 0} units)</label>
           <div className="input-with-calc">
            <input
              type="number"
              id="physical_defects_price"
              name="physical_defects_price"
              value={formData.physical_defects_price}
              onChange={handleInputChange}
              placeholder="Price per unit"
              className="form-control"
              required={true}
              min="0"
              step="0.01"
              disabled={counts.physical_defects === 0}
            />
            {counts.physical_defects > 0 && formData.physical_defects_price && (
              <div className="dynamic-calculation">
                {counts.physical_defects} &times; {getDisplayPrice(formData.physical_defects_price)} = <strong>{formatNumber(totals.physical_defects)}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Other Defects */}
        <div className="form-group">
          <label htmlFor="other_defects_price">Other Defect Price ({counts.other_defects || 0} units)</label>
          <div className="input-with-calc">
            <input
              type="number"
              id="other_defects_price"
              name="other_defects_price"
              value={formData.other_defects_price}
              onChange={handleInputChange}
              placeholder="Price per unit"
              className="form-control"
              required={true}
              min="0"
              step="0.01"
              disabled={counts.other_defects === 0}
            />
            {counts.other_defects > 0 && formData.other_defects_price && (
              <div className="dynamic-calculation">
                {counts.other_defects} &times; {getDisplayPrice(formData.other_defects_price)} = <strong>{formatNumber(totals.other_defects)}</strong>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="grand-total-section">
        <h4>Total Estimated Value</h4>
        <p className="total-amount">
          {formatNumber(totals.grand_total)}
        </p>
      </div>
    </div>
  );
};

export default CostEstimationForm;