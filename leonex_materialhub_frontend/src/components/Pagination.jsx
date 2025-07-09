import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import "./_Pagination.scss";

const DOTS = "...";

const usePaginationRange = ({ totalPages, siblings = 1, currentPage }) => {
  const paginationRange = useMemo(() => {
    const totalPageNumbersToShow = siblings * 2 + 5; // 1(first) + 1(last) + 1(current) + siblings on each side

    // Case 1: Total pages is less than the numbers we want to show.
    if (totalPages <= totalPageNumbersToShow) {
      return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblings, 1);
    const rightSiblingIndex = Math.min(currentPage + siblings, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    // Case 2: No left dots, but right dots.
    if (!shouldShowLeftDots && shouldShowRightDots) {
      let leftItemCount = 3 + 2 * siblings;
      let leftRange = Array.from(
        { length: leftItemCount },
        (_, idx) => idx + 1
      );
      return [...leftRange, DOTS, lastPageIndex];
    }

    // Case 3: No right dots, but left dots.
    if (shouldShowLeftDots && !shouldShowRightDots) {
      let rightItemCount = 3 + 2 * siblings;
      let rightRange = Array.from(
        { length: rightItemCount },
        (_, idx) => totalPages - rightItemCount + 1 + idx
      );
      return [firstPageIndex, DOTS, ...rightRange];
    }

    // Case 4: Both left and right dots.
    if (shouldShowLeftDots && shouldShowRightDots) {
      let middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, idx) => leftSiblingIndex + idx
      );
      return [firstPageIndex, DOTS, ...middleRange, DOTS, lastPageIndex];
    }
  }, [totalPages, siblings, currentPage]);

  return paginationRange || [];
};

const Pagination = ({ onPageChange, totalPages, currentPage, isLoading }) => {
  const paginationRange = usePaginationRange({
    currentPage,
    totalPages,
    siblings: 1,
  });

  if (currentPage === 0 || paginationRange.length < 2) {
    return null;
  }

  const onNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const onPrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  return (
    <nav className="pagination-container" aria-label="Page navigation">
      <button
        className="pagination-btn prev-btn"
        onClick={onPrevious}
        disabled={currentPage === 1 || isLoading}
        aria-label="Go to previous page"
      >
        <FaChevronLeft />
        <span className="pagination-btn-text">Previous</span>
      </button>

      <ul className="pagination-list">
        {paginationRange.map((pageNumber, index) => {
          if (pageNumber === DOTS) {
            return (
              <li key={`${DOTS}-${index}`} className="pagination-item dots">
                …
              </li>
            );
          }

          return (
            <li
              key={pageNumber}
              className={`pagination-item ${
                pageNumber === currentPage ? "active" : ""
              }`}
              onClick={() => onPageChange(pageNumber)}
              aria-current={pageNumber === currentPage ? "page" : undefined}
            >
              {pageNumber}
            </li>
          );
        })}
      </ul>

      <button
        className="pagination-btn next-btn"
        onClick={onNext}
        disabled={currentPage === totalPages || isLoading}
        aria-label="Go to next page"
      >
        <span className="pagination-btn-text">Next</span>
        <FaChevronRight />
      </button>
    </nav>
  );
};

Pagination.propTypes = {
  onPageChange: PropTypes.func.isRequired,
  totalPages: PropTypes.number.isRequired,
  currentPage: PropTypes.number.isRequired,
  isLoading: PropTypes.bool,
};

export default Pagination;
