import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  FaTimes, 
  FaChevronLeft, 
  FaChevronRight,
  FaExpandArrowsAlt,
  FaCompressArrowsAlt,
  FaSyncAlt // Icon for Rotation
} from "react-icons/fa";
import "./_ImageModal.scss";

const ImageModal = ({ images, currentIndex, onClose, onNext, onPrev, description }) => {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0); // State for rotation
  const [fitMode, setFitMode] = useState('contain'); 
  const [isPanning, setIsPanning] = useState(false);
  
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const lastPanPoint = useRef({ x: 0, y: 0 }); // Use ref for last pan point

  const resetTransforms = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    setIsPanning(false);
    setRotation(0);
  }, []);

  useEffect(() => {
    resetTransforms();
    setFitMode('contain'); 

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' && images.length > 1) onNext();
      if (e.key === 'ArrowLeft' && images.length > 1) onPrev();
      if (e.key === 'Escape') onClose();
      if (e.key === 'r' || e.key === 'R') handleRotate();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, resetTransforms, onNext, onPrev, onClose, images.length]);
  
  const clampPan = (nextPan) => {
    if (!imageRef.current || !containerRef.current) return nextPan;
    const containerRect = containerRef.current.getBoundingClientRect();
    const imageRect = imageRef.current.getBoundingClientRect();
    const xOverhang = Math.max(0, (imageRect.width - containerRect.width) / 2);
    const yOverhang = Math.max(0, (imageRect.height - containerRect.height) / 2);
    return {
      x: Math.max(-xOverhang, Math.min(xOverhang, nextPan.x)),
      y: Math.max(-yOverhang, Math.min(yOverhang, nextPan.y)),
    };
  };

  const handleInteractionStart = (e) => {
    if (scale <= 1) return;
    e.preventDefault();
    const point = e.touches ? e.touches[0] : e;
    lastPanPoint.current = { x: point.clientX, y: point.clientY };
    setIsPanning(true);
  };

  // --- MODIFIED: This function now correctly handles panning while rotated ---
  const handleInteractionMove = (e) => {
    if (!isPanning) return;
    e.preventDefault();
    const point = e.touches ? e.touches[0] : e;
    
    // Calculate raw screen-space delta
    const dx = point.clientX - lastPanPoint.current.x;
    const dy = point.clientY - lastPanPoint.current.y;

    // The pan state is a direct reflection of screen-space translation
    setPan(prevPan => {
      const newPan = {
        x: prevPan.x + dx,
        y: prevPan.y + dy,
      };
      // Clamp the new pan value to keep the image within the container
      return clampPan(newPan);
    });

    // Update the last point for the next move event
    lastPanPoint.current = { x: point.clientX, y: point.clientY };
  };

  const handleInteractionEnd = () => {
    setIsPanning(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.005;
    const newScale = Math.max(1, Math.min(scale + delta, 8));
    
    if (newScale === 1) {
      resetTransforms();
    } else {
      // Zoom towards the cursor position for a better experience
      const rect = containerRef.current.getBoundingClientRect();
      const imageX = (e.clientX - rect.left - pan.x) / scale;
      const imageY = (e.clientY - rect.top - pan.y) / scale;
      
      const newPanX = e.clientX - rect.left - imageX * newScale;
      const newPanY = e.clientY - rect.top - imageY * newScale;

      setScale(newScale);
      setPan(clampPan({ x: newPanX, y: newPanY }));
    }
  };
  
  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (scale > 1) {
      resetTransforms();
    } else {
      setScale(2);
    }
  };

  const handleFitToggle = (e) => {
    e.stopPropagation();
    resetTransforms();
    setFitMode(prev => prev === 'contain' ? 'cover' : 'contain');
  };

  const handleRotate = (e) => {
    if (e) e.stopPropagation();
    setRotation(prev => (prev + 90) % 360);
    // After rotating, re-clamp pan as boundaries change
    setPan(prevPan => clampPan(prevPan));
  };
  
  const handleButtonClick = (e, action) => {
    e.stopPropagation();
    action();
  };

  if (!images || images.length === 0 || currentIndex < 0) return null;

  const imageClass = `${(scale > 1) ? "is-pannable" : ""} ${isPanning ? "is-panning" : ""}`;

  return (
    <div className="image-modal-overlay" onClick={onClose}>
      <div className="modal-top-bar" onClick={(e) => e.stopPropagation()}>
        <div className="modal-counter">
          {currentIndex + 1} / {images.length}
        </div>
        <div className="modal-controls">
          <button className="modal-control-btn" onClick={handleRotate} title="Rotate (R)"><FaSyncAlt /></button>
          <button className="modal-control-btn" onClick={handleFitToggle} title={fitMode === 'contain' ? "Fill screen" : "Fit to screen"}>{fitMode === 'contain' ? <FaExpandArrowsAlt /> : <FaCompressArrowsAlt />}</button>
          <button className="modal-control-btn close" onClick={onClose} title="Close (Esc)"><FaTimes /></button>
        </div>
      </div>

      {images.length > 1 && (
        <>
          <button className="modal-nav-btn prev" onClick={(e) => handleButtonClick(e, onPrev)} title="Previous (Left Arrow)"><FaChevronLeft /></button>
          <button className="modal-nav-btn next" onClick={(e) => handleButtonClick(e, onNext)} title="Next (Right Arrow)"><FaChevronRight /></button>
        </>
      )}

      <div
        className="image-modal-content"
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleInteractionStart} onMouseMove={handleInteractionMove} onMouseUp={handleInteractionEnd}
        onMouseLeave={handleInteractionEnd} onTouchStart={handleInteractionStart} onTouchMove={handleInteractionMove}
        onTouchEnd={handleInteractionEnd} onWheel={handleWheel} onDoubleClick={handleDoubleClick}
      >
        <img
          ref={imageRef}
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1}`}
          className={imageClass}
          style={{
            objectFit: fitMode,
            // --- MODIFIED: The transform order is key for intuitive panning ---
            // Translate is applied last, in the screen's coordinate space.
            transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${scale})`,
          }}
          draggable="false"
        />
      </div>

      {description && (
        <div className="modal-description-bottom-bar" onClick={(e) => e.stopPropagation()}>
          <p>{description}</p>
        </div>
      )}
    </div>
  );
};

export default ImageModal;