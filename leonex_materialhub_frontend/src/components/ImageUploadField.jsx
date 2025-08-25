import React, { useRef, useState, useEffect } from "react";
import {
  FaCamera,
  FaImage,
  FaTimesCircle,
  FaVideo,
  FaSyncAlt, // For rotation
  FaExclamationTriangle, // For errors
} from "react-icons/fa";
import "./_ImageUploadField.scss";

const ImageUploadField = ({
  label,
  name,
  onChange,
  accept = "image/*",
  currentFile, // Can be a File object, a URL string, or null
  disabled = false,
  captureMode = "user",
  // REMOVED: maxSize prop is no longer used
}) => {
  const [preview, setPreview] = useState(null);
  const [fileInfo, setFileInfo] = useState({ name: "", size: "" });
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState(0); // For image preview rotation

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const errorTimeoutRef = useRef(null);

  const isVideo = accept.includes("video");

  // Effect to manage the preview URL from the currentFile prop
  useEffect(() => {
    let objectUrl = null;
    if (currentFile instanceof File) {
      objectUrl = URL.createObjectURL(currentFile);
      setPreview(objectUrl);
      const sizeInKB = currentFile.size / 1024;
      const displaySize =
        sizeInKB > 1024
          ? `${(sizeInKB / 1024).toFixed(2)} MB`
          : `${sizeInKB.toFixed(2)} KB`;
      setFileInfo({
        name: currentFile.name,
        size: displaySize,
      });
      setError(null); // Clear any previous errors on new file
    } else if (typeof currentFile === "string" && currentFile.trim() !== "") {
      setPreview(currentFile); // Assume it's a direct URL
      setFileInfo({ name: "Existing file", size: "" });
    } else {
      setPreview(null);
      setFileInfo({ name: "", size: "" });
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [currentFile]);

  // Effect to clear error messages after a delay
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  const displayError = (message) => {
    setError(message);
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    errorTimeoutRef.current = setTimeout(() => {
      setError(null);
    }, 5000);
  };

  const validateAndSetFile = (file) => {
    if (!file) return;

    // Validation: File Type
    const acceptedTypes = accept.split(",").map((type) => type.trim());
    const isTypeValid = acceptedTypes.some((type) => {
      if (type.endsWith("/*")) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isTypeValid) {
      displayError(`Invalid file type. Please select: ${accept}`);
      return;
    }

    // REMOVED: File size validation has been removed.

    // If valid, update the state via the parent
    onChange(name, file);
    setRotation(0); // Reset rotation for new image
  };

  const handleFileChange = (event) => {
    if (disabled) return;
    const file = event.target.files[0];
    validateAndSetFile(file);
    // Reset the input value to allow re-uploading the same file
    if (event.target) {
      event.target.value = null;
    }
  };

  const handleRemoveFile = () => {
    if (disabled) return;
    onChange(name, null);
    setRotation(0); // Reset rotation on removal
  };

  // --- Drag and Drop handlers ---
  const handleDragOver = (e) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    validateAndSetFile(file);
  };

  // --- Rotation handler ---
  const handleRotate = () => {
    if (disabled) return;
    // The rotation itself does not modify the file, just the CSS preview
    setRotation((prevRotation) => (prevRotation + 90) % 360);
  };

  return (
    <div
      className={`form-group image-upload-field ${disabled ? "disabled" : ""}`}
    >
      <label>{label}</label>
      <div className="upload-controls-wrapper">
        {!preview && (
          <div
            className={`upload-area ${isDragging ? "is-dragging" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {!disabled ? (
              <>
                <div className="upload-instructions">
                  <p>Drag & Drop a file here or</p>
                </div>
                <div className="upload-buttons">
                  <button
                    type="button"
                    className="btn-upload btn-select-file"
                    onClick={() => fileInputRef.current?.click()}
                    title={`Select ${isVideo ? "video" : "image"} from files`}
                  >
                    {isVideo ? <FaVideo /> : <FaImage />} Select File
                  </button>
                  <input
                    type="file"
                    id={`${name}_file_input`}
                    accept={accept}
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    className="btn-upload btn-use-camera"
                    onClick={() => cameraInputRef.current?.click()}
                    title={`Capture ${isVideo ? "video" : "image"} using camera`}
                  >
                    <FaCamera /> Use Camera
                  </button>
                  <input
                    type="file"
                    id={`${name}_camera_input`}
                    accept={accept}
                    capture={captureMode}
                    onChange={handleFileChange}
                    ref={cameraInputRef}
                    style={{ display: "none" }}
                  />
                </div>
              </>
            ) : (
              <div className="no-file-placeholder">No file uploaded.</div>
            )}
          </div>
        )}

        {preview && (
          <div className="preview-container">
            <div className="preview-media">
              {isVideo ? (
                <video src={preview} controls />
              ) : (
                <img
                  src={preview}
                  alt="Preview"
                  style={{ transform: `rotate(${rotation}deg)` }}
                />
              )}
            </div>
            <div className="preview-details">
              <div className="file-icon">
                {isVideo ? <FaVideo /> : <FaImage />}
              </div>
              <div className="file-text">
                <span className="file-name" title={fileInfo.name}>
                  {fileInfo.name}
                </span>
                <span className="file-size">{fileInfo.size}</span>
              </div>
            </div>
            {!disabled && (
              <div className="preview-actions">
                {!isVideo && (
                  <button
                    type="button"
                    onClick={handleRotate}
                    className="btn-action btn-rotate"
                    title="Rotate preview"
                  >
                    <FaSyncAlt />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="btn-action btn-remove-file"
                  title="Remove file"
                >
                  <FaTimesCircle />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {error && (
        <div className="error-message">
          <FaExclamationTriangle /> {error}
        </div>
      )}
    </div>
  );
};

export default ImageUploadField;