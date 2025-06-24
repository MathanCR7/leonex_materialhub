import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { FaPrint } from "react-icons/fa";
// Make sure to create/import SCSS for this component if needed
// import "./_MaterialDetails.scss";

const MaterialDetails = ({ material }) => {
  const componentRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Material-${material?.material_code || "Details"}`,
  });

  if (!material) {
    return (
      <div className="card-style select-prompt">
        <p>
          Search and select a material code to see details, or view a completed
          submission.
        </p>
      </div>
    );
  }

  // Corrected keys to match backend data structure after prependMediaBaseUrl
  const images = [
    material.image_specification_path,
    material.image_packing_condition_path,
    material.image_item_spec_mentioned_path,
    material.image_product_top_view_path,
    material.image_3d_view_path,
    material.image_side_view_thickness_path,
    material.image_stock_condition_packing_path,
  ]
    .filter(Boolean) // Remove any null or undefined paths
    .map((src, index) => ({
      src,
      alt: `Image ${index + 1} for ${material.material_code}`,
    }));

  const videoSrc = material.video_item_inspection_path;

  return (
    <div className="material-details-container card-style">
      <div ref={componentRef} className="printable-content">
        <h2>Material Details: {material.material_code}</h2>
        <div className="detail-item">
          <strong>Material Code:</strong> {material.material_code}
        </div>
        <div className="detail-item">
          <strong>Description Snapshot:</strong>{" "}
          {material.material_description_snapshot}
        </div>
        <div className="detail-item">
          <strong>UOM:</strong> {material.uom}
        </div>
        <div className="detail-item">
          <strong>Plant:</strong> {material.plant_name} ({material.plant})
        </div>
        <div className="detail-item">
          <strong>Category:</strong> {material.category}
        </div>
        <div className="detail-item">
          <strong>SOH Quantity:</strong> {material.soh_quantity}
        </div>
        <div className="detail-item">
          <strong>Submitted By:</strong> {material.submitted_by_username}
        </div>
        <div className="detail-item">
          <strong>Submission Date:</strong>{" "}
          {material.created_at
            ? new Date(material.created_at).toLocaleDateString()
            : "N/A"}
        </div>
        <div className="detail-item">
          <strong>Last Updated:</strong>{" "}
          {material.updated_at
            ? new Date(material.updated_at).toLocaleDateString()
            : "N/A"}
        </div>
        <div className="detail-item">
          <strong>Status:</strong>{" "}
          {material.is_completed ? "Completed" : "Not Completed"}
        </div>

        {images.length > 0 && (
          <div className="media-gallery">
            <h3>Images</h3>
            <div className="image-grid">
              {" "}
              {/* Add styling for image-grid */}
              {images.map((img, index) => (
                <div key={index} className="image-item">
                  {" "}
                  {/* Add styling for image-item */}
                  <img
                    src={img.src}
                    alt={img.alt}
                    style={{
                      maxWidth: "200px",
                      maxHeight: "200px",
                      margin: "5px",
                      border: "1px solid #ddd",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {videoSrc && (
          <div className="media-gallery">
            <h3>Video</h3>
            <div className="video-player">
              {" "}
              {/* Add styling for video-player */}
              <video
                controls
                src={videoSrc}
                style={{ maxWidth: "100%", maxHeight: "300px" }}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}
      </div>
      <button
        onClick={handlePrint}
        className="btn btn-secondary"
        style={{ marginTop: "20px" }}
      >
        <FaPrint /> Export to PDF / Print
      </button>
    </div>
  );
};

export default MaterialDetails;
