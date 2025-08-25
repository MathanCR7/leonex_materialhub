import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import {
  getSubmissionDetailsById,
  updateSubmissionStatus, // For AdminActions
  submitCostEstimation,       // For ThirdPartyDecisionPanel
  getMyEstimationForSubmission, // For ThirdPartyDecisionPanel
} from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import {
  FaSpinner,
  FaExclamationCircle,
  FaArrowLeft,
  FaVideo,
  FaArrowRight,
  FaCheck,
  FaTimes,
  FaUndo,
  FaSave,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import logoImage from "../assets/leonex_logo_base64";
import ImageModal from "../components/ImageModal";
import VideoModal from "../components/VideoModal";
import CostEstimationForm from "../components/CostEstimationForm";
import "./_MaterialInspectionPage.scss";

// --- NEW SUB-COMPONENT: Third Party Decision Panel ---
const ThirdPartyDecisionPanel = ({ submission }) => {
  const [activeTab, setActiveTab] = useState('ESTIMATION'); // 'ESTIMATION', 'REWORK', 'REJECTION'
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for all possible form inputs
  const [estimationData, setEstimationData] = useState({
    good_material_price: "",
    package_defects_price: "",
    physical_defects_price: "",
    other_defects_price: "",
  });
  const [reworkReason, setReworkReason] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch the user's existing decision when the component loads
  useEffect(() => {
    const fetchExistingDecision = async () => {
      setIsLoading(true);
      try {
        const { data } = await getMyEstimationForSubmission(submission.id);
        if (data) {
          // Set the active tab based on the saved decision type
          if (data.estimation_type === 'REWORK_REQUESTED') {
            setActiveTab('REWORK');
          } else if (data.estimation_type === 'REJECTED') {
            setActiveTab('REJECTION');
          } else {
            setActiveTab('ESTIMATION');
          }
          
          // Populate the form fields with the saved data
          setEstimationData({
            good_material_price: data.good_material_price || "",
            package_defects_price: data.package_defects_price || "",
            physical_defects_price: data.physical_defects_price || "",
            other_defects_price: data.other_defects_price || "",
          });
          setReworkReason(data.rework_reason || "");
          setRejectionReason(data.rejection_reason || "");
        }
      } catch (error) {
        if (error.response?.status !== 404) {
          toast.error("Failed to load your previous decision.");
        }
        // A 404 error is normal if no decision has been made yet. We just show the default empty form.
      } finally {
        setIsLoading(false);
      }
    };
    fetchExistingDecision();
  }, [submission.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    let payload = {
      estimation_type: activeTab === 'REWORK' ? 'REWORK_REQUESTED' : activeTab === 'REJECTION' ? 'REJECTED' : 'ESTIMATION'
    };

    // Build the payload based on the active tab
    if (activeTab === 'ESTIMATION') {
      if (Object.values(estimationData).some(price => price === '' || parseFloat(price) < 0)) {
        toast.warn("Please fill all price fields with valid numbers (0 or greater).");
        setIsSubmitting(false);
        return;
      }
      payload = { ...payload, ...estimationData };
    } else if (activeTab === 'REWORK') {
      if (!reworkReason.trim()) {
        toast.warn("Please provide a reason for the rework request.");
        setIsSubmitting(false);
        return;
      }
      payload.rework_reason = reworkReason;
    } else if (activeTab === 'REJECTION') {
       if (!rejectionReason.trim()) {
        toast.warn("Please provide a reason for the rejection.");
        setIsSubmitting(false);
        return;
      }
      payload.rejection_reason = rejectionReason;
    }
    
    try {
      await submitCostEstimation(submission.id, payload);
      toast.success("Your decision has been saved successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit your decision.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="third-party-panel card-style">
        <div className="loading-text">
          <FaSpinner className="spinner-icon" /> Loading Your Decision...
        </div>
      </div>
    );
  }

  return (
    <div className="third-party-panel-wrapper">
      <div className="third-party-panel card-style">
        <div className="panel-tabs">
          <button onClick={() => setActiveTab('ESTIMATION')} className={`tab-btn estimation ${activeTab === 'ESTIMATION' ? 'active' : ''}`}>
            <FaCheckCircle /> Cost Estimation
          </button>
          <button onClick={() => setActiveTab('REWORK')} className={`tab-btn rework ${activeTab === 'REWORK' ? 'active' : ''}`}>
            <FaUndo /> Request Rework
          </button>
          <button onClick={() => setActiveTab('REJECTION')} className={`tab-btn rejection ${activeTab === 'REJECTION' ? 'active' : ''}`}>
            <FaTimesCircle /> Reject Submission
          </button>
        </div>

        <form onSubmit={handleSubmit} className="panel-content">
          <fieldset disabled={isSubmitting}>
            {activeTab === 'ESTIMATION' && (
              <CostEstimationForm
                counts={{
                  good_material: submission.good_material_count,
                  package_defects: submission.package_defects_count,
                  physical_defects: submission.physical_defects_count,
                  other_defects: submission.other_defects_count,
                }}
                formData={estimationData}
                setFormData={setEstimationData}
              />
            )}
            {activeTab === 'REWORK' && (
              <div className="reason-input-section">
                <h4>Reason for Rework Request</h4>
                <p>Please clearly explain what needs to be corrected by the cataloguer.</p>
                <textarea
                  className="form-control"
                  rows="5"
                  placeholder="e.g., The '3D View' image is blurry. Please re-upload a clear picture."
                  value={reworkReason}
                  onChange={(e) => setReworkReason(e.target.value)}
                  required
                />
              </div>
            )}
            {activeTab === 'REJECTION' && (
              <div className="reason-input-section">
                <h4>Reason for Rejection</h4>
                <p>Please provide a final, non-negotiable reason for rejecting this submission.</p>
                <textarea
                  className="form-control"
                  rows="5"
                  placeholder="e.g., Material is obsolete and has no market value."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="form-actions-bottom">
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? <FaSpinner className="spinner-icon-btn" /> : <FaSave />}
                {isSubmitting ? "Saving..." : "Save My Decision"}
              </button>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
};


// --- Admin Actions Panel (Unchanged from your provided code) ---
const AdminActions = ({ submission, onStatusUpdate }) => {
  const [reworkReason, setReworkReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");


  const handleSubmit = async (status) => {
    if (status === "REWORK_REQUESTED" && !reworkReason.trim()) {
      setError("Please provide a reason for the rework request.");
      toast.warn("A reason is required for rework requests.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await updateSubmissionStatus(submission.id, { status, reason: reworkReason });
      toast.success(`Submission has been ${status === 'APPROVED' ? 'approved' : 'sent for rework'}.`);
      onStatusUpdate();
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to update status.";
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="details-card admin-actions-card">
      <h2>Admin Actions</h2>
      <div className="rework-section">
        <label htmlFor="reworkReason">Reason for Rework (if required)</label>
        <textarea id="reworkReason" className="form-control" rows="3" value={reworkReason} onChange={(e) => setReworkReason(e.target.value)} placeholder="e.g., Please provide a clearer image of the product specification." />
      </div>
      {error && <p className="text-danger mt-2">{error}</p>}
      <div className="action-buttons">
        <button className="btn btn-danger" onClick={() => handleSubmit("REWORK_REQUESTED")} disabled={isSubmitting} title="Send this submission back to the cataloguer for corrections.">
          {isSubmitting ? <FaSpinner className="spinner-icon" /> : <FaTimes />} Request Rework
        </button>
        <button className="btn btn-success" onClick={() => handleSubmit("APPROVED")} disabled={isSubmitting} title="Approve this submission as final.">
          {isSubmitting ? <FaSpinner className="spinner-icon" /> : <FaCheck />} Approve
        </button>
      </div>
    </section>
  );
};

// Helper components (Unchanged from your provided code)
const DetailItem = ({ label, value }) => (
  <div className="detail-item"><dt>{label}</dt><dd>{value || "N/A"}</dd></div>
);
const ImageGallery = ({ title, imagePaths, onImageClick }) => {
  if (!imagePaths || imagePaths.length === 0) return null;
  return (
    <div className="image-gallery-section">
      {title && <h3>{title}</h3>}
      <div className="image-grid">
        {imagePaths.map((path, index) => (
          <div key={index} className="image-container" onClick={() => onImageClick(imagePaths, index)}>
            <img src={path} alt={`${title || "Image"} ${index + 1}`} loading="lazy" />
            <div className="image-overlay">Click to Enlarge</div>
          </div>
        ))}
      </div>
    </div>
  );
};


// --- MAIN PAGE COMPONENT ---
const MaterialInspectionPage = () => {
  const { submissionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [submission, setSubmission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalVideoUrl, setModalVideoUrl] = useState(null);
  const [activeImageGallery, setActiveImageGallery] = useState([]);
  const [activeImageIndex, setActiveImageIndex] = useState(-1);
  const [submissionIds, setSubmissionIds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const hasNextSubmission = currentIndex !== -1 && currentIndex < submissionIds.length - 1;

  useEffect(() => {
    if (location.state?.submissionIds && location.state?.currentIndex != null) {
      setSubmissionIds(location.state.submissionIds);
      setCurrentIndex(location.state.currentIndex);
    }
  }, [location.state]);

  const fetchDetails = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await getSubmissionDetailsById(submissionId);
      setSubmission(response.data);
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to fetch submission details.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    handleCloseImageModal();
    if (!submissionId) {
      setError("No submission ID provided.");
      setIsLoading(false);
      return;
    }
    fetchDetails();
  }, [submissionId, fetchDetails]);

  const handleImageClick = (gallery, index) => {
    setActiveImageGallery(gallery);
    setActiveImageIndex(index);
  };
  const handleCloseImageModal = () => {
    setActiveImageGallery([]);
    setActiveImageIndex(-1);
  };
  const handleNextImage = () => setActiveImageIndex((prev) => (prev + 1) % activeImageGallery.length);
  const handlePrevImage = () => setActiveImageIndex((prev) => (prev - 1 + activeImageGallery.length) % activeImageGallery.length);
  const handleVideoClick = (videoUrl) => setModalVideoUrl(videoUrl);
  const handleCloseVideoModal = () => setModalVideoUrl(null);
  const getBackLink = () => user?.role === "thirdparties" ? "/submissions-for-estimation" : "/material-status";
  const handleNextSubmission = () => {
    if (hasNextSubmission) {
      const nextIndex = currentIndex + 1;
      const nextId = submissionIds[nextIndex];
      navigate(`/inspection/${nextId}`, { state: { submissionIds, currentIndex: nextIndex }, replace: true });
    }
  };
  const goodMediaImages = submission ? [
    { key: "image_specification_path" }, { key: "image_packing_condition_path" },
    { key: "image_item_spec_mentioned_path" }, { key: "image_product_top_view_path" },
    { key: "image_3d_view_path" }, { key: "image_side_view_thickness_path" },
    { key: "image_stock_condition_packing_path" },
  ].map((field) => submission[field.key]).filter(Boolean) : [];

  if (isLoading) {
    return <div className="loading-fullscreen"><FaSpinner className="spinner-icon large-spinner" /><p>Loading Inspection Details...</p></div>;
  }
  if (error) {
    return <div className="error-message alert alert-danger full-width-error"><FaExclamationCircle /> {error}<Link to={getBackLink()} className="btn btn-secondary mt-3"><FaArrowLeft /> Back to List</Link></div>;
  }
  if (!submission) {
    return <div className="info-message alert alert-info full-width-error">No submission data found.</div>;
  }

  return (
    <>
      <div className="inspection-page">
        <header className="inspection-header">
          <div className="header-left">
            <Link to={getBackLink()} className="back-link" title="Back to List"><FaArrowLeft /></Link>
            <div className="header-title">
              <h1>Material Inspection</h1>
              <span className="material-code-highlight">{submission.material_code}</span>
            </div>
          </div>
          <img src={logoImage} alt="Leonex Logo" className="header-logo" />
        </header>

        {submission.approval_status === 'REWORK_REQUESTED' && (<div className="alert alert-danger rework-notice"><FaUndo /> <strong>Rework Requested:</strong> {submission.rework_reason}</div>)}
        {submission.approval_status === 'REWORK_COMPLETED' && (<div className="alert alert-warning rework-notice"><FaUndo /> <strong>Rework Completed:</strong> This submission has been re-submitted and is awaiting final approval.</div>)}

        <div className="inspection-content">
          <div className="details-column">
            <section className="details-card">
              <h2>General Information</h2>
              <dl>
                <DetailItem label="Material Description" value={submission.material_description_snapshot} />
                 {user?.role !== "thirdparties" && (
                  <>
                    <DetailItem label="Plant" value={`${submission.plantlocation} (${submission.plant})`} />
                    <DetailItem label="Bin Location" value={submission.bin_location} />
                    <DetailItem label="Category" value={submission.category} />
                  </>
                )}
                <DetailItem label="Unit of Measure" value={submission.uom} />
                <DetailItem label="Stock on Hand" value={submission.soh_quantity} />
              </dl>
            </section>
            <section className="details-card">
              <h2>Stock & Defect Summary</h2>
              <dl>
                <DetailItem label="Good Material" value={submission.good_material_count} />
                <DetailItem label="Package Defects" value={submission.package_defects_count} />
                <DetailItem label="Physical Defects" value={submission.physical_defects_count} />
                <DetailItem label="Other Defects" value={submission.other_defects_count} />
                <DetailItem label="Missing Material" value={submission.missing_material_count} />
              </dl>
            </section>
            {user?.role === "admin" && (<AdminActions submission={submission} onStatusUpdate={fetchDetails} />)}
          </div>
          <div className="media-column">
            <section className="details-card">
              <h2>Media Attachments</h2>
              <ImageGallery title="Material Images" imagePaths={goodMediaImages} onImageClick={handleImageClick} />
              <div className="image-gallery-section">
                <h3>Item Inspection Video</h3>
                {submission.video_item_inspection_path ? (<button onClick={() => handleVideoClick(submission.video_item_inspection_path)} className="video-link-button"><FaVideo /> Watch Video</button>) : (<p className="no-media-message">No video provided.</p>)}
              </div>
            </section>
           <section className="details-card">
  <h2>Defect Details</h2>
  <div className="defect-section">
    <h4>Package Defects</h4>
    <p>
      <strong>Reasons:</strong>{' '}
      <span className={submission.package_defects_reasons ? 'has-reason' : ''}>
        {submission.package_defects_reasons || "N/A"}
      </span>
    </p>
    <ImageGallery imagePaths={submission.package_defects_images_paths} onImageClick={handleImageClick} />
  </div>
  <div className="defect-section">
    <h4>Physical Defects</h4>
    <p>
      <strong>Reasons:</strong>{' '}
      <span className={submission.physical_defects_reasons ? 'has-reason' : ''}>
        {submission.physical_defects_reasons || "N/A"}
      </span>
    </p>
    <ImageGallery imagePaths={submission.physical_defects_images_paths} onImageClick={handleImageClick} />
  </div>
  <div className="defect-section">
    <h4>Other Defects</h4>
    <p>
      <strong>Reasons:</strong>{' '}
      <span className={submission.other_defects_reasons ? 'has-reason' : ''}>
        {submission.other_defects_reasons || "N/A"}
      </span>
    </p>
    <ImageGallery imagePaths={submission.other_defects_images_paths} onImageClick={handleImageClick} />
  </div>
  <div className="defect-section">
    <h4>Missing Material</h4>
    <p>
      <strong>Status/Reasons:</strong>{' '}
      <span className={submission.missing_defects_status ? 'has-reason' : ''}>
        {submission.missing_defects_status || "N/A"}
      </span>
    </p>
  </div>
</section>
          </div>
        </div>

        {/* MODIFICATION: The old CostEstimationForm is replaced by the new Decision Panel */}
        {user?.role === "thirdparties" && submission && (
          <ThirdPartyDecisionPanel submission={submission} />
        )}

        {user?.role === "thirdparties" && hasNextSubmission && (
          <div className="next-submission-action"><button className="btn btn-secondary" onClick={handleNextSubmission}>Next Submission <FaArrowRight /></button></div>
        )}
      </div>

      <ImageModal images={activeImageGallery} currentIndex={activeImageIndex} onClose={handleCloseImageModal} onNext={handleNextImage} onPrev={handlePrevImage} description={submission?.material_description_snapshot} />
      <VideoModal videoUrl={modalVideoUrl} onClose={handleCloseVideoModal} />
    </>
  );
};

export default MaterialInspectionPage;