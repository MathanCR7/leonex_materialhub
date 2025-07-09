import React from "react";
import { FaTimes } from "react-icons/fa";
import "./_VideoModal.scss";

const VideoModal = ({ videoUrl, onClose }) => {
  if (!videoUrl) return null;

  const handleOverlayClick = (e) => {
    // Close the modal only if the overlay itself is clicked, not its children
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="video-modal-overlay" onClick={handleOverlayClick}>
      <button className="modal-close-btn" onClick={onClose}>
        <FaTimes />
      </button>
      <div className="video-modal-content">
        <video controls autoPlay onEnded={onClose}>
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
};

export default VideoModal;
