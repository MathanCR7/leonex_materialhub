//component/MaterialSearchBar.jsx
import React, { useState, useCallback } from "react"; // Removed useEffect as it was unused with new logic
import { FaSearch, FaSpinner } from "react-icons/fa";
import _ from "lodash";

// This component is now more of a presentational component if suggestions are passed from parent.
// If it needs to fetch its own data, the debouncedSearch and API call logic needs to be reinstated.
const MaterialSearchBar = ({
  onMaterialSelect,
  initialQuery = "",
  // onSearch, // Optional: Callback for parent to handle search if this component doesn't fetch
  // suggestionsFromParent = [], // Optional: If parent provides suggestions
  // isLoadingFromParent = false, // Optional: If parent controls loading state
  // errorFromParent = "" // Optional: If parent provides error
}) => {
  const [query, setQuery] = useState(initialQuery);
  // These states would be used if the component fetches its own data:
  // const [suggestions, setSuggestions] = useState(suggestionsFromParent);
  // const [isLoading, setIsLoading] = useState(isLoadingFromParent);
  // const [error, setError] = useState(errorFromParent);

  // Example: If MaterialSearchBar itself was responsible for fetching:
  // const debouncedSearch = useCallback(
  //   _.debounce(async (searchQuery) => {
  //     if (onSearch) { // If parent handles search
  //        onSearch(searchQuery);
  //        return;
  //     }
  //     if (searchQuery.trim().length > 1) {
  //       setIsLoading(true); setError(""); setSuggestions([]);
  //       try {
  //         // const response = await yourSearchApiFunction(searchQuery);
  //         // setSuggestions(response.data || []);
  //       } catch (err) {
  //         setError("Failed to fetch suggestions.");
  //       } finally {
  //         setIsLoading(false);
  //       }
  //     } else {
  //       setSuggestions([]); setError("");
  //     }
  //   }, 300),
  //   [onSearch] // Add onSearch to dependency array if used
  // );

  const handleChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    // if (debouncedSearch) debouncedSearch(newQuery); // Call if component fetches
    // Or, notify parent:
    // if (onQueryChange) onQueryChange(newQuery);
  };

  const handleSuggestionClick = (material) => {
    setQuery(material.material_code);
    // setSuggestions([]); // Clear local suggestions if component manages them
    // setError("");
    onMaterialSelect(material);
  };

  // Determine what to display based on props or internal state
  // const currentSuggestions = suggestionsFromParent.length > 0 ? suggestionsFromParent : suggestions;
  // const currentIsLoading = isLoadingFromParent || isLoading;
  // const currentError = errorFromParent || error;

  // This simplified version assumes MaterialCodePage handles all search logic
  // and this component is not currently used or is for a different purpose.
  // For its original intent with self-contained search, uncomment logic above.
  return (
    <div className="search-bar-wrapper standalone-search-bar">
      <div className="search-bar-container">
        <FaSearch className="search-icon" />
        <input
          type="text"
          className="search-input"
          value={query}
          onChange={handleChange}
          placeholder="Search Material Code..."
          aria-label="Search material code"
        />
        {/*isLoading && <FaSpinner className="spinner-icon" /> */}{" "}
        {/* Show spinner if component is loading */}
      </div>
      {/*error && <p className="search-message error-message">{error}</p> */}{" "}
      {/* Show error if component has error */}
      {/*
      {suggestions.length > 0 && ( // Or currentSuggestions
        <ul className="suggestions-list">
          {suggestions.map((material) => (
            <li
              key={material.material_code}
              onClick={() => handleSuggestionClick(material)}
            >
              {material.material_code} - {material.material_description}
            </li>
          ))}
        </ul>
      )}
      */}
    </div>
  );
};

export default MaterialSearchBar;
