import React, { useRef, useState, useEffect } from "react";
import { FaCamera, FaImage, FaTimesCircle, FaVideo } from "react-icons/fa";
import "./_ImageUploadField.scss"; // Ensure this path is correct

const ImageUploadField = ({
  label,
  name,
  onChange,
  accept = "image/*",
  currentFile, // Can be a File object, a URL string, or null
  disabled = false,
  captureMode = "user", // "user" or "environment" for images
}) => {
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    let objectUrl = null;
    if (currentFile instanceof File) {
      objectUrl = URL.createObjectURL(currentFile);
      setPreview(objectUrl);
    } else if (typeof currentFile === "string" && currentFile.trim() !== "") {
      setPreview(currentFile); // Assume it's a direct URL (e.g., from server)
    } else {
      setPreview(null);
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [currentFile]);

  const handleFileChange = (event) => {
    if (disabled) return;
    const file = event.target.files[0];
    if (file) {
      onChange(name, file);
    }
    // Reset the input value to allow re-uploading the same file
    if (event.target) {
      event.target.value = null;
    }
  };

  const handleRemoveFile = () => {
    if (disabled) return;
    onChange(name, null);
  };

  const isVideo = accept.includes("video");

  return (
    <div
      className={`form-group image-upload-field ${disabled ? "disabled" : ""}`}
    >
      <label>{label}</label>
      <div className="upload-controls-wrapper">
        {!preview && (
          <div className="upload-area">
            {/* --- CHANGE: Buttons only render if NOT disabled --- */}
            {!disabled ? (
              <>
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
                <img src={preview} alt="Preview" />
              )}
            </div>
            {/* --- CHANGE: Remove button only renders if NOT disabled --- */}
            {!disabled && (
              <button
                type="button"
                onClick={handleRemoveFile}
                className="btn-remove-file"
                title="Remove file"
              >
                <FaTimesCircle />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploadField;
