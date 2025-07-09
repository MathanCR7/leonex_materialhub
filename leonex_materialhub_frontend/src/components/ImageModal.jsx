// src/components/ImageModal.jsx
import React from "react";
import { FaTimes, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import "./_ImageModal.scss";

const ImageModal = ({ images, currentIndex, onClose, onNext, onPrev }) => {
  // Do not render if there are no images or the index is invalid
  if (!images || images.length === 0 || currentIndex < 0) {
    return null;
  }

  // Stop propagation on buttons to prevent the overlay's onClose from firing
  const handleButtonClick = (e, action) => {
    e.stopPropagation();
    action();
  };

  return (
    <div className="image-modal-overlay" onClick={onClose}>
      <button
        className="modal-close-btn"
        onClick={(e) => handleButtonClick(e, onClose)}
      >
        <FaTimes />
      </button>

      {/* Conditionally render navigation buttons only if there's more than one image */}
      {images.length > 1 && (
        <>
          <button
            className="modal-nav-btn prev"
            onClick={(e) => handleButtonClick(e, onPrev)}
          >
            <FaChevronLeft />
          </button>
          <button
            className="modal-nav-btn next"
            onClick={(e) => handleButtonClick(e, onNext)}
          >
            <FaChevronRight />
          </button>
        </>
      )}

      <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
        <img src={images[currentIndex]} alt={`Image ${currentIndex + 1}`} />
      </div>
    </div>
  );
};

export default ImageModal;
