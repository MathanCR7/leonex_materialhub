import React, { useState, useEffect } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { getSubmissionDetailsById } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import {
  FaSpinner,
  FaExclamationCircle,
  FaArrowLeft,
  FaVideo,
  FaArrowRight,
} from "react-icons/fa";
import logoImage from "../assets/leonex_logo_base64";
import ImageModal from "../components/ImageModal";
import VideoModal from "../components/VideoModal";
import CostEstimationForm from "../components/CostEstimationForm";
import "./_MaterialInspectionPage.scss";

// Helper component for displaying detail fields
const DetailItem = ({ label, value }) => (
  <div className="detail-item">
    <dt>{label}</dt>
    <dd>{value || "N/A"}</dd>
  </div>
);

// Helper component for displaying image galleries
// MODIFICATION: onImageClick now passes the entire gallery and the clicked image's index
const ImageGallery = ({ title, imagePaths, onImageClick }) => {
  if (!imagePaths || imagePaths.length === 0) {
    return null;
  }
  return (
    <div className="image-gallery-section">
      {title && <h3>{title}</h3>}
      <div className="image-grid">
        {imagePaths.map((path, index) => (
          <div
            key={index}
            className="image-container"
            onClick={() => onImageClick(imagePaths, index)} // Pass the whole gallery and index
          >
            <img
              src={path}
              alt={`${title || "Image"} ${index + 1}`}
              loading="lazy"
            />
            <div className="image-overlay">Click to Enlarge</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MaterialInspectionPage = () => {
  const { submissionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [submission, setSubmission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalVideoUrl, setModalVideoUrl] = useState(null);

  // MODIFICATION: State for image modal now handles a gallery and an index
  const [activeImageGallery, setActiveImageGallery] = useState([]);
  const [activeImageIndex, setActiveImageIndex] = useState(-1);

  // State for "Next" submission button logic
  const [submissionIds, setSubmissionIds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const hasNextSubmission =
    currentIndex !== -1 && currentIndex < submissionIds.length - 1;

  useEffect(() => {
    if (location.state?.submissionIds && location.state?.currentIndex != null) {
      setSubmissionIds(location.state.submissionIds);
      setCurrentIndex(location.state.currentIndex);
    }
  }, [location.state]);

  useEffect(() => {
    // Reset image modal when navigating to a new submission
    handleCloseImageModal();

    if (!submissionId) {
      setError("No submission ID provided.");
      setIsLoading(false);
      return;
    }

    const fetchDetails = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await getSubmissionDetailsById(submissionId);
        setSubmission(response.data);
      } catch (err) {
        const errorMessage =
          err.response?.data?.message || "Failed to fetch submission details.";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [submissionId]);

  // MODIFICATION: New handlers for opening and navigating the image modal
  const handleImageClick = (gallery, index) => {
    setActiveImageGallery(gallery);
    setActiveImageIndex(index);
  };

  const handleCloseImageModal = () => {
    setActiveImageGallery([]);
    setActiveImageIndex(-1);
  };

  const handleNextImage = () => {
    setActiveImageIndex(
      (prevIndex) => (prevIndex + 1) % activeImageGallery.length
    );
  };

  const handlePrevImage = () => {
    setActiveImageIndex(
      (prevIndex) =>
        (prevIndex - 1 + activeImageGallery.length) % activeImageGallery.length
    );
  };

  // Handlers for Video Modal (unchanged)
  const handleVideoClick = (videoUrl) => setModalVideoUrl(videoUrl);
  const handleCloseVideoModal = () => setModalVideoUrl(null);

  const getBackLink = () => {
    if (user?.role === "thirdparties") {
      return "/submissions-for-estimation";
    }
    return "/material-status";
  };

  // Handler for the "Next Submission" button (unchanged)
  const handleNextSubmission = () => {
    if (hasNextSubmission) {
      const nextIndex = currentIndex + 1;
      const nextId = submissionIds[nextIndex];
      navigate(`/inspection/${nextId}`, {
        state: { submissionIds, currentIndex: nextIndex },
        replace: true,
      });
    }
  };

  const goodMediaImages = submission
    ? [
        { key: "image_specification_path" },
        { key: "image_packing_condition_path" },
        { key: "image_item_spec_mentioned_path" },
        { key: "image_product_top_view_path" },
        { key: "image_3d_view_path" },
        { key: "image_side_view_thickness_path" },
        { key: "image_stock_condition_packing_path" },
      ]
        .map((field) => submission[field.key])
        .filter(Boolean)
    : [];

  if (isLoading) {
    return (
      <div className="loading-fullscreen">
        <FaSpinner className="spinner-icon large-spinner" />
        <p>Loading Inspection Details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message alert alert-danger full-width-error">
        <FaExclamationCircle /> {error}
        <Link to={getBackLink()} className="btn btn-secondary mt-3">
          <FaArrowLeft /> Back to List
        </Link>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="info-message alert alert-info full-width-error">
        No submission data found.
      </div>
    );
  }

  return (
    <>
      <div className="inspection-page">
        <header className="inspection-header">
          <div className="header-left">
            <Link to={getBackLink()} className="back-link" title="Back to List">
              <FaArrowLeft />
            </Link>
            <div className="header-title">
              <h1>Material Inspection</h1>
              <span className="material-code-highlight">
                {submission.material_code}
              </span>
            </div>
          </div>
          <img src={logoImage} alt="Leonex Logo" className="header-logo" />
        </header>

        <div className="inspection-content">
          <div className="details-column">
            <section className="details-card">
              <h2>General Information</h2>
              <dl>
                <DetailItem
                  label="Material Description"
                  value={submission.material_description_snapshot}
                />
                <DetailItem
                  label="Plant"
                  value={`${submission.plantlocation} (${submission.plant})`}
                />
                <DetailItem
                  label="Bin Location"
                  value={submission.bin_location}
                />
                <DetailItem label="Category" value={submission.category} />
                <DetailItem label="Unit of Measure" value={submission.uom} />
                <DetailItem
                  label="Stock on Hand"
                  value={submission.soh_quantity}
                />
              </dl>
            </section>
            <section className="details-card">
              <h2>Stock & Defect Summary</h2>
              <dl>
                <DetailItem
                  label="Good Material"
                  value={submission.good_material_count}
                />
                <DetailItem
                  label="Package Defects"
                  value={submission.package_defects_count}
                />
                <DetailItem
                  label="Physical Defects"
                  value={submission.physical_defects_count}
                />
                <DetailItem
                  label="Other Defects"
                  value={submission.other_defects_count}
                />
                <DetailItem
                  label="Missing Material"
                  value={submission.missing_material_count}
                />
              </dl>
            </section>
          </div>

          <div className="media-column">
            <section className="details-card">
              <h2>Media Attachments</h2>
              <ImageGallery
                title="Material Images"
                imagePaths={goodMediaImages}
                onImageClick={handleImageClick}
              />
              <div className="image-gallery-section">
                <h3>Item Inspection Video</h3>
                {submission.video_item_inspection_path ? (
                  <button
                    onClick={() =>
                      handleVideoClick(submission.video_item_inspection_path)
                    }
                    className="video-link-button"
                  >
                    <FaVideo /> Watch Video
                  </button>
                ) : (
                  <p className="no-media-message">No video provided.</p>
                )}
              </div>
            </section>
            <section className="details-card">
              <h2>Defect Details</h2>
              <div className="defect-section">
                <h4>Package Defects</h4>
                <p>
                  <strong>Reasons:</strong>{" "}
                  {submission.package_defects_reasons || "N/A"}
                </p>
                <ImageGallery
                  imagePaths={submission.package_defects_images_paths}
                  onImageClick={handleImageClick}
                />
              </div>
              <div className="defect-section">
                <h4>Physical Defects</h4>
                <p>
                  <strong>Reasons:</strong>{" "}
                  {submission.physical_defects_reasons || "N/A"}
                </p>
                <ImageGallery
                  imagePaths={submission.physical_defects_images_paths}
                  onImageClick={handleImageClick}
                />
              </div>
              <div className="defect-section">
                <h4>Other Defects</h4>
                <p>
                  <strong>Reasons:</strong>{" "}
                  {submission.other_defects_reasons || "N/A"}
                </p>
                <ImageGallery
                  imagePaths={submission.other_defects_images_paths}
                  onImageClick={handleImageClick}
                />
              </div>
              <div className="defect-section">
                <h4>Missing Material</h4>
                <p>
                  <strong>Status/Reasons:</strong>{" "}
                  {submission.missing_defects_status || "N/A"}
                </p>
              </div>
            </section>
          </div>
        </div>

        {user?.role === "thirdparties" && submission && (
          <div className="estimation-form-wrapper">
            <CostEstimationForm submissionId={submission.id} />
          </div>
        )}

        {user?.role === "thirdparties" && hasNextSubmission && (
          <div className="next-submission-action">
            <button
              className="btn btn-secondary"
              onClick={handleNextSubmission}
            >
              Next Submission <FaArrowRight />
            </button>
          </div>
        )}
      </div>

      {/* MODIFICATION: Pass new props to ImageModal for gallery navigation */}
      <ImageModal
        images={activeImageGallery}
        currentIndex={activeImageIndex}
        onClose={handleCloseImageModal}
        onNext={handleNextImage}
        onPrev={handlePrevImage}
      />
      <VideoModal videoUrl={modalVideoUrl} onClose={handleCloseVideoModal} />
    </>
  );
};

export default MaterialInspectionPage;
