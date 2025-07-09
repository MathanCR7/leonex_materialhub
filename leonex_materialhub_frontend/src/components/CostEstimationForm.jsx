// src/components/CostEstimationForm.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  submitCostEstimation,
  // <<< CHANGE: Import the new, more specific function
  getMyEstimationForSubmission,
} from "../services/api";
import { toast } from "react-toastify";
import { FaSpinner, FaSave } from "react-icons/fa";
import "./_CostEstimationForm.scss";

const CostEstimationForm = ({ submissionId }) => {
  const [formData, setFormData] = useState({
    good_material_price: "",
    package_defects_price: "",
    physical_defects_price: "",
    other_defects_price: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // <<< CHANGE: Updated useEffect to be more efficient and clear >>>
  useEffect(() => {
    const fetchExistingEstimation = async () => {
      if (!submissionId || !user) return;
      setIsLoading(true);
      try {
        // Use the new, specific API endpoint
        const response = await getMyEstimationForSubmission(submissionId);
        // The response.data is now the single estimation object
        if (response.data) {
          setFormData({
            good_material_price: response.data.good_material_price || "",
            package_defects_price: response.data.package_defects_price || "",
            physical_defects_price: response.data.physical_defects_price || "",
            other_defects_price: response.data.other_defects_price || "",
          });
        }
      } catch (error) {
        // A 404 error is expected if no estimation has been submitted yet.
        // We only show an error toast for other, unexpected errors.
        if (error.response?.status !== 404) {
          toast.error("Failed to fetch your existing estimation data.");
          console.error("Failed to fetch existing estimation", error);
        }
        // If it's a 404, we do nothing, leaving the form blank for a new entry.
      } finally {
        setIsLoading(false);
      }
    };

    fetchExistingEstimation();
  }, [submissionId, user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // This single function works for both creating and updating thanks to the backend logic.
      await submitCostEstimation(submissionId, formData);
      toast.success("Cost estimation saved successfully!");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to submit estimation."
      );
      console.error("Estimation submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="cost-estimation-form card-style">
        <h4>Your Cost Estimation</h4>
        <div className="loading-text">
          <FaSpinner className="spinner-icon" /> Loading...
        </div>
      </div>
    );
  }

  // The rest of the component's JSX remains exactly the same.
  return (
    <div className="cost-estimation-form card-style">
      <h4>Your Cost Estimation</h4>
      <p className="form-subtitle">
        Please provide the price per unit for each category.
      </p>
      <form onSubmit={handleSubmit}>
        <fieldset disabled={isSubmitting}>
          <div className="estimation-grid single-price">
            <div className="form-group">
              <label htmlFor="good_material_price">Good Material Price</label>
              <input
                type="number"
                id="good_material_price"
                name="good_material_price"
                value={formData.good_material_price}
                onChange={handleInputChange}
                placeholder="Price per unit"
                className="form-control"
                required
                min="0"
                step="0.01"
              />
            </div>
            {/* ... other input fields ... */}
            <div className="form-group">
              <label htmlFor="package_defects_price">
                Package Defect Material Price
              </label>
              <input
                type="number"
                id="package_defects_price"
                name="package_defects_price"
                value={formData.package_defects_price}
                onChange={handleInputChange}
                placeholder="Price per unit"
                className="form-control"
                required
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label htmlFor="physical_defects_price">
                Physical Defect Material Price
              </label>
              <input
                type="number"
                id="physical_defects_price"
                name="physical_defects_price"
                value={formData.physical_defects_price}
                onChange={handleInputChange}
                placeholder="Price per unit"
                className="form-control"
                required
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label htmlFor="other_defects_price">Other Defect Price</label>
              <input
                type="number"
                id="other_defects_price"
                name="other_defects_price"
                value={formData.other_defects_price}
                onChange={handleInputChange}
                placeholder="Price per unit"
                className="form-control"
                required
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <div className="form-actions-bottom">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <FaSpinner className="spinner-icon-btn" />
              ) : (
                <FaSave />
              )}
              {isSubmitting ? "Saving..." : "Save/Update Estimation"}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
};

export default CostEstimationForm;
