// pages/MaterialDataFormPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  useParams,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  getMaterialMasterDetails,
  getUniqueMaterialValues,
  submitMaterialData,
  getLatestMaterialSubmission,
  updateMaterialData,
} from "../services/api";
import ImageUploadField from "../components/ImageUploadField";
import { toast } from "react-toastify";
import {
  FaSpinner,
  FaPaperPlane,
  FaInfoCircle,
  FaExclamationCircle,
  FaEdit,
  FaSave,
  FaTimes,
  FaTrash,
  FaCamera,
  FaFileUpload,
  FaBuilding,
} from "react-icons/fa";
import "./_MaterialDataFormPage.scss"; // Ensure this path is correct

const goodMediaFieldsConfig = [
  {
    name: "image_specification",
    label: "1. Specification of the item",
    dbKey: "image_specification_path",
    accept: "image/*",
    captureMode: "environment",
  },
  {
    name: "image_packing_condition",
    label: "2. Packing Condition",
    dbKey: "image_packing_condition_path",
    accept: "image/*",
    captureMode: "environment",
  },
  {
    name: "image_item_spec_mentioned",
    label: "3. Item Spec Mentioned",
    dbKey: "image_item_spec_mentioned_path",
    accept: "image/*",
    captureMode: "environment",
  },
  {
    name: "image_product_top_view",
    label: "4. Product Top View",
    dbKey: "image_product_top_view_path",
    accept: "image/*",
    captureMode: "environment",
  },
  {
    name: "image_3d_view",
    label: "5. 3D View",
    dbKey: "image_3d_view_path",
    accept: "image/*",
    captureMode: "environment",
  },
  {
    name: "image_side_view_thickness",
    label: "6. Side View/Thickness",
    dbKey: "image_side_view_thickness_path",
    accept: "image/*",
    captureMode: "environment",
  },
  {
    name: "image_stock_condition_packing",
    label: "7. Stock/Condition/Packing",
    dbKey: "image_stock_condition_packing_path",
    accept: "image/*",
    captureMode: "environment",
  },
  {
    name: "video_item_inspection",
    label: "8. Item Inspection Video",
    dbKey: "video_item_inspection_path",
    accept: "video/*",
    captureMode: "environment", // Or "user" if front camera preferred for video
  },
];

const defectCategoriesConfig = [
  {
    name: "package_defects",
    label: "Package Defects",
    reasonField: "package_defects_reasons",
    imagesField: "package_defect_images",
    dbImagesKey: "package_defects_images_paths",
    countField: "package_defects_count",
  },
  {
    name: "physical_defects",
    label: "Physical Defects",
    reasonField: "physical_defects_reasons",
    imagesField: "physical_defect_images",
    dbImagesKey: "physical_defects_images_paths",
    countField: "physical_defects_count",
  },
  {
    name: "other_defects",
    label: "Other Defects",
    reasonField: "other_defects_reasons",
    imagesField: "other_defect_images",
    dbImagesKey: "other_defects_images_paths",
    countField: "other_defects_count",
  },
];

const initialFormDataBase = {
  uom: "",
  category: "",
  soh_quantity: "0",
  is_completed: false,
  good_material_count: "0",
  package_defects_count: "0",
  physical_defects_count: "0",
  other_defects_count: "0",
  package_defects_reasons: "",
  physical_defects_reasons: "",
  other_defects_reasons: "",
  missing_defects_status: "",
};

const initialFilesState = goodMediaFieldsConfig.reduce(
  (acc, field) => ({ ...acc, [field.name]: null }),
  {}
);
const initialDefectFilesState = defectCategoriesConfig.reduce(
  (acc, cat) => ({ ...acc, [cat.imagesField]: [] }),
  {}
);

// Helper component for robust defect image preview and object URL cleanup
const DefectImagePreviewItem = ({ fileOrUrl, altText }) => {
  const [previewSrc, setPreviewSrc] = useState("");

  useEffect(() => {
    let objectUrl = null;
    if (fileOrUrl instanceof File) {
      objectUrl = URL.createObjectURL(fileOrUrl);
      setPreviewSrc(objectUrl);
    } else if (typeof fileOrUrl === "string") {
      setPreviewSrc(fileOrUrl); // Is a string URL
    } else {
      setPreviewSrc(""); // Handle null or undefined fileOrUrl
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fileOrUrl]);

  if (!previewSrc) return null;

  return (
    <img
      src={previewSrc}
      alt={altText}
      style={{
        maxWidth: "100px",
        maxHeight: "100px",
        objectFit: "contain",
        margin: "5px",
      }}
    />
  );
};

const MaterialDataFormPage = () => {
  const { materialCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const plantCodeFromUrl = searchParams.get("plantCode");

  const { user, loading: authLoading } = useAuth();

  const [currentSubmissionId, setCurrentSubmissionId] = useState(
    location.state?.submissionId || null
  );
  const [materialMasterData, setMaterialMasterData] = useState(null);
  const [formData, setFormData] = useState(initialFormDataBase);

  const [goodMediaFiles, setGoodMediaFiles] = useState(initialFilesState);
  const [defectFiles, setDefectFiles] = useState(initialDefectFilesState);

  const [initialGoodMediaPaths, setInitialGoodMediaPaths] =
    useState(initialFilesState);
  const [initialDefectMediaPaths, setInitialDefectMediaPaths] = useState(
    defectCategoriesConfig.reduce(
      (acc, cat) => ({ ...acc, [cat.dbImagesKey]: [] }),
      {}
    )
  );

  const [uniqueUOMs, setUniqueUOMs] = useState([]);
  const [uniqueCategories, setUniqueCategories] = useState([]);

  const [isEditMode, setIsEditMode] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [formError, setFormError] = useState("");

  const isViewOnlyMode = location.state?.viewOnly === true;

  const resetFormToMasterDefaults = useCallback(
    (masterDataForPlant) => {
      setFormData({
        ...initialFormDataBase,
        uom: masterDataForPlant?.uom || "",
        category: masterDataForPlant?.category || "",
        soh_quantity: String(masterDataForPlant?.soh_quantity || "0"),
      });
      setGoodMediaFiles(initialFilesState);
      setDefectFiles(initialDefectFilesState);
      setInitialGoodMediaPaths(initialFilesState);
      setInitialDefectMediaPaths(
        defectCategoriesConfig.reduce(
          (acc, cat) => ({ ...acc, [cat.dbImagesKey]: [] }),
          {}
        )
      );
      setCurrentSubmissionId(null);
      setIsEditMode(isViewOnlyMode ? false : true);
      setFormError("");
    },
    [isViewOnlyMode]
  );

  const populateFormWithExistingSubmission = useCallback(
    (submissionData, masterDataForPlant) => {
      setFormData({
        uom: submissionData.uom || masterDataForPlant?.uom || "",
        category: submissionData.category || masterDataForPlant?.category || "",
        soh_quantity:
          submissionData.soh_quantity !== null &&
          submissionData.soh_quantity !== undefined
            ? String(submissionData.soh_quantity)
            : String(masterDataForPlant?.soh_quantity || "0"),
        is_completed: submissionData.is_completed || false,
        good_material_count: String(submissionData.good_material_count || "0"),
        package_defects_count: String(
          submissionData.package_defects_count || "0"
        ),
        physical_defects_count: String(
          submissionData.physical_defects_count || "0"
        ),
        other_defects_count: String(submissionData.other_defects_count || "0"),
        package_defects_reasons: submissionData.package_defects_reasons || "",
        physical_defects_reasons: submissionData.physical_defects_reasons || "",
        other_defects_reasons: submissionData.other_defects_reasons || "",
        missing_defects_status: submissionData.missing_defects_status || "",
      });

      const loadedGoodMedia = {};
      const newInitialGoodPaths = {};
      goodMediaFieldsConfig.forEach((field) => {
        const pathFromServer = submissionData[field.dbKey] || null;
        loadedGoodMedia[field.name] = pathFromServer; // Store URL string or null
        newInitialGoodPaths[field.name] = pathFromServer;
      });
      setGoodMediaFiles(loadedGoodMedia);
      setInitialGoodMediaPaths(newInitialGoodPaths);

      const loadedDefectMedia = {};
      const newInitialDefectPathsBundle = {};
      defectCategoriesConfig.forEach((cat) => {
        const pathsFromServer = Array.isArray(submissionData[cat.dbImagesKey])
          ? submissionData[cat.dbImagesKey]
          : [];
        loadedDefectMedia[cat.imagesField] = [...pathsFromServer]; // Store array of URL strings
        newInitialDefectPathsBundle[cat.dbImagesKey] = [...pathsFromServer];
      });
      setDefectFiles(loadedDefectMedia);
      setInitialDefectMediaPaths(newInitialDefectPathsBundle);

      setCurrentSubmissionId(submissionData.id);
      setIsEditMode(isViewOnlyMode ? false : !submissionData.is_completed);
      setFormError("");
    },
    [isViewOnlyMode]
  );

  useEffect(() => {
    if (!plantCodeFromUrl) {
      toast.error("Plant code is missing in the URL. Cannot load form data.");
      navigate("/material-codes", {
        replace: true,
        state: { error: "Plant code missing for form." },
      });
      setIsLoadingData(false);
      return;
    }

    if (authLoading) {
      setIsLoadingData(true);
      return;
    }
    if (!user && !authLoading) {
      navigate("/login", { replace: true });
      setIsLoadingData(false);
      return;
    }

    setIsLoadingData(true);
    setFormError("");
    const controller = new AbortController();

    async function fetchDataForMaterialAndPlant() {
      try {
        const masterRes = await getMaterialMasterDetails(
          materialCode,
          plantCodeFromUrl,
          { signal: controller.signal }
        );
        const fetchedMasterData = masterRes.data;
        setMaterialMasterData(fetchedMasterData);

        const [uomsRes, catsRes] = await Promise.all([
          getUniqueMaterialValues("uom", { signal: controller.signal }),
          getUniqueMaterialValues("category", { signal: controller.signal }),
        ]);
        setUniqueUOMs(uomsRes.data);
        setUniqueCategories(catsRes.data);

        try {
          const submissionRes = await getLatestMaterialSubmission(
            materialCode,
            plantCodeFromUrl,
            { signal: controller.signal }
          );
          populateFormWithExistingSubmission(
            submissionRes.data,
            fetchedMasterData
          );
        } catch (subErr) {
          if (subErr.name === "CanceledError" || controller.signal.aborted)
            return;
          if (subErr.response?.status === 404) {
            resetFormToMasterDefaults(fetchedMasterData);
          } else {
            toast.error(
              subErr.response?.data?.message ||
                `Failed to check submission for Plant ${plantCodeFromUrl}.`
            );
            resetFormToMasterDefaults(fetchedMasterData); // Reset even on other errors
          }
        }
      } catch (err) {
        if (err.name === "CanceledError" || controller.signal.aborted) return;
        console.error("Error fetching initial page data:", err);
        const errorMsg =
          err.response?.data?.message || "Failed to load page data.";
        toast.error(errorMsg);
        setFormError(errorMsg);
        if (
          err.response?.status === 404 &&
          err.config.url.includes(`/materials/master/${materialCode}/details`)
        ) {
          navigate("/material-codes", {
            state: {
              error: `Material ${materialCode} not found for Plant ${plantCodeFromUrl}.`,
            },
            replace: true,
          });
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingData(false);
      }
    }

    if (materialCode && plantCodeFromUrl && user) {
      fetchDataForMaterialAndPlant();
    } else if (!user && !authLoading) {
      setIsLoadingData(false);
    }

    return () => controller.abort();
  }, [
    materialCode,
    plantCodeFromUrl,
    navigate,
    user,
    authLoading,
    resetFormToMasterDefaults,
    populateFormWithExistingSubmission,
  ]);

  const handleInputChange = (e) => {
    if (isViewOnlyMode || (!isEditMode && currentSubmissionId)) return;
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleGoodMediaFileChange = useCallback(
    (fieldName, file) => {
      if (isViewOnlyMode || (!isEditMode && currentSubmissionId)) return;
      setGoodMediaFiles((prev) => ({ ...prev, [fieldName]: file }));
    },
    [isEditMode, currentSubmissionId, isViewOnlyMode]
  );

  const handleDefectMultiFileChange = (defectCategoryImagesField, event) => {
    if (isViewOnlyMode || (!isEditMode && currentSubmissionId)) return;
    const newFilesArray = Array.from(event.target.files);
    if (newFilesArray.length > 0) {
      setDefectFiles((prev) => ({
        ...prev,
        [defectCategoryImagesField]: [
          ...(prev[defectCategoryImagesField] || []).filter(
            (f) => typeof f === "string" || (f instanceof File && f.name) // Keep existing URLs or already staged Files
          ),
          ...newFilesArray,
        ],
      }));
    }
    if (event.target) event.target.value = null;
  };

  const handleDefectSingleFileAdd = (defectCategoryImagesField, event) => {
    if (isViewOnlyMode || (!isEditMode && currentSubmissionId)) return;
    const newFile = event.target.files[0];
    if (newFile) {
      setDefectFiles((prev) => ({
        ...prev,
        [defectCategoryImagesField]: [
          ...(prev[defectCategoryImagesField] || []).filter(
            (f) => typeof f === "string" || (f instanceof File && f.name)
          ),
          newFile,
        ],
      }));
    }
    if (event.target) event.target.value = null;
  };

  const removeDefectFile = (defectCategoryImagesField, fileToRemove) => {
    if (isViewOnlyMode || (!isEditMode && currentSubmissionId)) return;
    setDefectFiles((prev) => ({
      ...prev,
      [defectCategoryImagesField]: prev[defectCategoryImagesField].filter(
        (f) => f !== fileToRemove
      ),
    }));
  };

  const handleSubmitOrUpdate = async (e) => {
    e.preventDefault();
    setFormError("");
    if (isViewOnlyMode) {
      toast.info("This form is in view-only mode.");
      return;
    }
    if (!isEditMode && currentSubmissionId) {
      toast.warn("Form not in edit mode. Click 'Edit Data' to make changes.");
      return;
    }
    if (!formData.is_completed) {
      const confirmSaveIncomplete = window.confirm(
        "This submission is not marked as complete. Save as a draft?"
      );
      if (!confirmSaveIncomplete) {
        toast.info("Save cancelled. Mark as complete or confirm draft save.");
        return;
      }
    }
    if (!user || !user.username) {
      toast.error("Authentication error. Please re-login.");
      navigate("/login", { replace: true });
      return;
    }
    if (!plantCodeFromUrl || !materialMasterData) {
      toast.error(
        "Plant information is missing or inconsistent. Cannot submit."
      );
      setFormError("Plant information is critical and seems to be missing.");
      return;
    }

    setIsSubmitting(true);
    const dataPayload = new FormData();
    dataPayload.append("material_code", materialCode);
    dataPayload.append(
      "material_description_snapshot",
      materialMasterData.material_description || "N/A"
    );
    dataPayload.append("submitted_by_username", user.username);
    dataPayload.append("plant", plantCodeFromUrl);
    dataPayload.append("plant_name", materialMasterData.plant_name || "N/A");

    Object.keys(formData).forEach((key) =>
      dataPayload.append(key, formData[key])
    );

    goodMediaFieldsConfig.forEach((field) => {
      const currentFile = goodMediaFiles[field.name];
      if (currentFile instanceof File) {
        dataPayload.append(field.name, currentFile);
      } else if (currentFile === null && initialGoodMediaPaths[field.name]) {
        // File was cleared
        dataPayload.append(`${field.name}_cleared`, "true");
      }
    });

    defectCategoriesConfig.forEach((cat) => {
      const filesForCategory = defectFiles[cat.imagesField] || [];
      const initialPathsForThisCategory =
        initialDefectMediaPaths[cat.dbImagesKey] || [];

      let newFilesUploadedForCategory = false;
      const keptOldUrls = [];

      filesForCategory.forEach((fileOrUrl) => {
        if (fileOrUrl instanceof File) {
          dataPayload.append(cat.imagesField, fileOrUrl);
          newFilesUploadedForCategory = true;
        } else if (typeof fileOrUrl === "string") {
          keptOldUrls.push(fileOrUrl);
        }
      });

      if (
        initialPathsForThisCategory.length > 0 &&
        keptOldUrls.length === 0 &&
        !newFilesUploadedForCategory
      ) {
        // All initial images were removed and no new ones were added
        dataPayload.append(`${cat.imagesField}_cleared`, "true");
      } else if (currentSubmissionId) {
        // For updates, if not clearing all, send the list of URLs to keep.
        // The backend uses this to reconcile.
        dataPayload.append(
          `${cat.dbImagesKey}_kept_urls`,
          JSON.stringify(keptOldUrls)
        );
      }
      // For new submissions (no currentSubmissionId), only new files are sent. No kept_urls or _cleared needed.
    });

    try {
      let submissionResponseData;
      if (currentSubmissionId) {
        const updateResponse = await updateMaterialData(
          currentSubmissionId,
          dataPayload
        );
        submissionResponseData = updateResponse.data; // Assuming API returns updated submission
        toast.success(
          `Data for ${materialCode} (Plant: ${plantCodeFromUrl}) updated!`
        );
      } else {
        const submitResponse = await submitMaterialData(dataPayload);
        submissionResponseData = submitResponse.data; // Assuming API returns new submission with ID
        toast.success(
          `Data for ${materialCode} (Plant: ${plantCodeFromUrl}) submitted! ID: ${
            submissionResponseData.id || submissionResponseData.submissionId
          }`
        );
      }

      setIsLoadingData(true);
      const freshMasterRes = await getMaterialMasterDetails(
        materialCode,
        plantCodeFromUrl
      );
      const freshMasterData = freshMasterRes.data;
      setMaterialMasterData(freshMasterData);

      // Fetch the specific submission that was just created/updated to ensure data consistency
      // This is more reliable than getLatestMaterialSubmission if there could be rapid submissions.
      // However, getLatestMaterialSubmission is simpler if the API for specific submission isn't available
      // or if submissionResponseData doesn't contain the full object.
      // For simplicity, using getLatestMaterialSubmission as per original logic.
      const latestSubRes = await getLatestMaterialSubmission(
        materialCode,
        plantCodeFromUrl
      );
      populateFormWithExistingSubmission(latestSubRes.data, freshMasterData);

      if (latestSubRes.data.is_completed) {
        setIsEditMode(false);
      }
    } catch (err) {
      console.error("Error submitting/updating data:", err);
      const errorMsg =
        err.response?.data?.message || err.message || "Operation failed.";
      toast.error(errorMsg);
      setFormError(errorMsg);
      if (err.response?.status === 409 && !currentSubmissionId) {
        toast.info(
          "A submission for this material & plant already exists. Loading it."
        );
        try {
          // Re-fetch master, then existing submission
          const masterRes = await getMaterialMasterDetails(
            materialCode,
            plantCodeFromUrl
          );
          setMaterialMasterData(masterRes.data);
          const existingSub = await getLatestMaterialSubmission(
            materialCode,
            plantCodeFromUrl
          );
          populateFormWithExistingSubmission(existingSub.data, masterRes.data);
        } catch (fetchErr) {
          toast.error("Failed to load existing submission after conflict.");
        }
      }
    } finally {
      setIsSubmitting(false);
      setIsLoadingData(false);
    }
  };

  const handleEditClick = () => {
    if (isViewOnlyMode) return;
    if (formData.is_completed) {
      // Allow editing a completed form, it will become a draft again
      setFormData((prev) => ({ ...prev, is_completed: false }));
    }
    setIsEditMode(true);
    toast.info("Form is now in edit mode.");
  };

  const handleCancelEdit = () => {
    if (isViewOnlyMode) return;
    setIsLoadingData(true);
    setFormError(""); // Clear previous errors

    // Re-fetch master data first
    getMaterialMasterDetails(materialCode, plantCodeFromUrl)
      .then((masterRes) => {
        const freshMasterData = masterRes.data;
        setMaterialMasterData(freshMasterData); // Update master data state

        if (currentSubmissionId) {
          // If there was an existing submission, re-fetch it
          return getLatestMaterialSubmission(
            materialCode,
            plantCodeFromUrl
          ).then((subRes) => {
            populateFormWithExistingSubmission(subRes.data, freshMasterData);
          });
        } else {
          // If it was a new form, reset to master defaults
          resetFormToMasterDefaults(freshMasterData);
        }
      })
      .then(() => {
        toast.info("Edit cancelled. Changes reverted.");
      })
      .catch((err) => {
        console.error("Failed to revert changes:", err);
        toast.error(
          "Failed to revert changes. Displaying potentially stale data or defaults."
        );
        // Fallback: reset with potentially old master data or empty if masterData is null
        resetFormToMasterDefaults(materialMasterData || {});
      })
      .finally(() => {
        setIsLoadingData(false);
      });
  };

  const formEffectivelyDisabled =
    isViewOnlyMode ||
    (!isEditMode && currentSubmissionId !== null) ||
    isSubmitting;

  if (authLoading || isLoadingData) {
    return (
      <div className="container loading-fullscreen">
        <FaSpinner className="spinner-icon large-spinner" />
        <p>Loading page data for Plant {plantCodeFromUrl || "..."}...</p>
      </div>
    );
  }

  if (!plantCodeFromUrl && !isLoadingData && !authLoading) {
    // This case should be caught earlier by the useEffect, but as a safeguard
    return (
      <div className="container error-fullscreen">
        <FaExclamationCircle className="error-icon large-error" />
        <p>Error: Plant Code is missing from URL.</p>
        <button
          onClick={() => navigate("/material-codes")}
          className="btn btn-primary"
        >
          Go to Material Lookup
        </button>
      </div>
    );
  }

  // This condition specifically handles when initial data load (master details) fails.
  if (formError && !materialMasterData && !isLoadingData) {
    return (
      <div className="container error-fullscreen">
        <FaExclamationCircle className="error-icon large-error" />
        <p>Error: {formError}</p>
        <button
          onClick={() => navigate("/material-codes")}
          className="btn btn-primary"
        >
          Go to Material Lookup
        </button>
      </div>
    );
  }

  const calculatedMissingCount =
    (parseInt(formData.soh_quantity, 10) || 0) -
    ((parseInt(formData.good_material_count, 10) || 0) +
      (parseInt(formData.package_defects_count, 10) || 0) +
      (parseInt(formData.physical_defects_count, 10) || 0) +
      (parseInt(formData.other_defects_count, 10) || 0));

  return (
    <div className="container material-data-form-page">
      <header className="page-header">
        <h1>
          {isViewOnlyMode
            ? "View Completed Data"
            : currentSubmissionId && !isEditMode
            ? "View Data"
            : currentSubmissionId
            ? "Edit Data"
            : "New Data Entry"}
          : <span className="material-code-highlight">{materialCode}</span>
          {plantCodeFromUrl && (
            <span className="plant-code-header-info">
              <FaBuilding /> Plant: {plantCodeFromUrl}
            </span>
          )}
        </h1>
        {materialMasterData?.material_description && (
          <div className="material-description-display">
            <FaInfoCircle /> <strong>Description:</strong>{" "}
            {materialMasterData.material_description}
          </div>
        )}
      </header>

      <form
        onSubmit={handleSubmitOrUpdate}
        className="material-form card-style"
      >
        {!isViewOnlyMode && currentSubmissionId && !isEditMode && (
          <div className="form-actions-top">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleEditClick}
              disabled={isSubmitting} // isSubmitting also implies formEffectivelyDisabled
            >
              <FaEdit /> Edit Data
            </button>
          </div>
        )}

        <fieldset disabled={formEffectivelyDisabled}>
          <section className="form-section">
            <h2 className="form-section-title">
              Material Details (Plant: {plantCodeFromUrl})
            </h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="uom">UOM</label>
                <input
                  type="text"
                  id="uom"
                  name="uom"
                  className="form-control"
                  value={formData.uom}
                  onChange={handleInputChange}
                  list="uom-datalist"
                  placeholder="Select or type UOM"
                  required
                />
                <datalist id="uom-datalist">
                  {uniqueUOMs.map((u) => (
                    <option key={`uom-${u}`} value={u} />
                  ))}
                </datalist>
              </div>
              <div className="form-group">
                <label>Plant Code (Context)</label>
                <input
                  type="text"
                  className="form-control"
                  value={materialMasterData?.plant || plantCodeFromUrl || ""}
                  readOnly
                />
              </div>
              <div className="form-group">
                <label>Plant Name (Context)</label>
                <input
                  type="text"
                  className="form-control"
                  value={materialMasterData?.plant_name || ""}
                  readOnly
                />
              </div>
              <div className="form-group">
                <label htmlFor="category">Category</label>
                <input
                  type="text"
                  id="category"
                  name="category"
                  className="form-control"
                  value={formData.category}
                  onChange={handleInputChange}
                  list="category-datalist"
                  placeholder="Select or type Category"
                  required
                />
                <datalist id="category-datalist">
                  {uniqueCategories.map((c) => (
                    <option key={`cat-${c}`} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="form-group">
                <label htmlFor="soh_quantity">
                  Current SOH Quantity (at Plant {plantCodeFromUrl})
                </label>
                <input
                  type="number"
                  id="soh_quantity"
                  name="soh_quantity"
                  className="form-control"
                  value={formData.soh_quantity}
                  onChange={handleInputChange}
                  min="0"
                  required
                />
                <small className="form-text text-muted">
                  Original Master SOH:{" "}
                  {materialMasterData?.soh_quantity !== undefined
                    ? materialMasterData.soh_quantity
                    : "N/A"}
                  . Adjust if current SOH differs.
                </small>
              </div>
              <div className="form-group">
                <label htmlFor="good_material_count">Good Material Count</label>
                <input
                  type="number"
                  id="good_material_count"
                  name="good_material_count"
                  className="form-control"
                  value={formData.good_material_count}
                  onChange={handleInputChange}
                  min="0"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="package_defects_count">
                  Package Defects Count
                </label>
                <input
                  type="number"
                  id="package_defects_count"
                  name="package_defects_count"
                  className="form-control"
                  value={formData.package_defects_count}
                  onChange={handleInputChange}
                  min="0"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="physical_defects_count">
                  Physical Defects Count
                </label>
                <input
                  type="number"
                  id="physical_defects_count"
                  name="physical_defects_count"
                  className="form-control"
                  value={formData.physical_defects_count}
                  onChange={handleInputChange}
                  min="0"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="other_defects_count">Other Defects Count</label>
                <input
                  type="number"
                  id="other_defects_count"
                  name="other_defects_count"
                  className="form-control"
                  value={formData.other_defects_count}
                  onChange={handleInputChange}
                  min="0"
                  required
                />
              </div>
              <div className="form-group">
                <label>Missing Material Count (Calculated)</label>
                <input
                  type="text"
                  className="form-control"
                  value={calculatedMissingCount}
                  readOnly
                  style={{
                    fontWeight: "bold",
                    color: calculatedMissingCount < 0 ? "red" : "inherit",
                  }}
                />
                {calculatedMissingCount < 0 && (
                  <small className="text-danger">Counts exceed SOH.</small>
                )}
              </div>
            </div>
          </section>

          <section className="form-section media-uploads-section">
            <h2 className="form-section-title">Good Media Uploads</h2>
            <div className="media-grid">
              {goodMediaFieldsConfig.map((field) => (
                <ImageUploadField
                  key={field.name}
                  name={field.name}
                  label={field.label}
                  onChange={handleGoodMediaFileChange}
                  currentFile={goodMediaFiles[field.name]}
                  accept={field.accept}
                  captureMode={field.captureMode}
                  disabled={formEffectivelyDisabled}
                />
              ))}
            </div>
          </section>

          <section className="form-section defects-section">
            <h2 className="form-section-title">Defects Details</h2>
            {defectCategoriesConfig.map((category) => (
              <div
                key={category.name}
                className="defect-category-group card-style"
              >
                <h3>
                  {category.label} (Count: {formData[category.countField] || 0})
                </h3>
                <div className="form-group">
                  <label htmlFor={category.reasonField}>
                    Reasons for {category.label.toLowerCase()}
                  </label>
                  <textarea
                    id={category.reasonField}
                    name={category.reasonField}
                    className="form-control"
                    value={formData[category.reasonField]}
                    onChange={handleInputChange}
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label>{category.label} Images</label>
                  {!isViewOnlyMode && (isEditMode || !currentSubmissionId) && (
                    <div className="defect-image-controls">
                      <label
                        htmlFor={`${category.imagesField}_file_input_trigger`}
                        className={`btn btn-secondary btn-sm ${
                          formEffectivelyDisabled ? "disabled" : ""
                        }`}
                        title="Select multiple images from files"
                      >
                        <FaFileUpload /> Select Files
                      </label>
                      <input
                        type="file"
                        id={`${category.imagesField}_file_input_trigger`}
                        multiple
                        accept="image/*"
                        onChange={(e) =>
                          handleDefectMultiFileChange(category.imagesField, e)
                        }
                        style={{ display: "none" }}
                        disabled={formEffectivelyDisabled}
                      />
                      <label
                        htmlFor={`${category.imagesField}_camera_input_trigger`}
                        className={`btn btn-secondary btn-sm ${
                          formEffectivelyDisabled ? "disabled" : ""
                        }`}
                        title="Capture image using camera"
                      >
                        <FaCamera /> Use Camera
                      </label>
                      <input
                        type="file"
                        id={`${category.imagesField}_camera_input_trigger`}
                        accept="image/*"
                        capture="environment"
                        onChange={(e) =>
                          handleDefectSingleFileAdd(category.imagesField, e)
                        }
                        style={{ display: "none" }}
                        disabled={formEffectivelyDisabled}
                      />
                    </div>
                  )}
                  <div className="defect-previews">
                    {Array.isArray(defectFiles[category.imagesField]) &&
                      defectFiles[category.imagesField].map(
                        (fileOrUrl, index) => (
                          <div
                            key={`${category.imagesField}-${index}-${
                              typeof fileOrUrl === "string"
                                ? fileOrUrl.substring(
                                    fileOrUrl.lastIndexOf("/") + 1
                                  ) // Use filename for key uniqueness
                                : fileOrUrl.name
                            }`}
                            className="preview-item defect-preview-item"
                          >
                            <DefectImagePreviewItem
                              fileOrUrl={fileOrUrl}
                              altText={`${category.label} ${index + 1}`}
                            />
                            {!isViewOnlyMode &&
                              (isEditMode || !currentSubmissionId) &&
                              !isSubmitting && ( // isSubmitting check is good, formEffectivelyDisabled covers most
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeDefectFile(
                                      category.imagesField,
                                      fileOrUrl
                                    )
                                  }
                                  className="btn-remove-defect-img"
                                  title="Remove this image"
                                  disabled={formEffectivelyDisabled} // Ensure this button is also disabled
                                >
                                  <FaTrash />
                                </button>
                              )}
                          </div>
                        )
                      )}
                  </div>
                </div>
              </div>
            ))}
            <div className="form-group">
              <label htmlFor="missing_defects_status">
                Missing Defects Status / Remarks
              </label>
              <input
                type="text"
                id="missing_defects_status"
                name="missing_defects_status"
                className="form-control"
                value={formData.missing_defects_status}
                onChange={handleInputChange}
              />
            </div>
          </section>
        </fieldset>

        {formError &&
          !isLoadingData && ( // Show general form error if submitting failed & not initial load error
            <p className="form-submission-error alert alert-danger">
              <FaExclamationCircle /> {formError}
            </p>
          )}

        {!isViewOnlyMode && (isEditMode || !currentSubmissionId) && (
          <div className="form-group checkbox-group completion-checkbox">
            <input
              type="checkbox"
              id="is_completed"
              name="is_completed"
              checked={formData.is_completed}
              onChange={handleInputChange}
              disabled={formEffectivelyDisabled}
            />
            <label htmlFor="is_completed">
              I have reviewed all data and mark this submission as complete.
            </label>
          </div>
        )}

        {(currentSubmissionId || (isViewOnlyMode && materialMasterData)) && (
          <div className="form-group completion-status-view">
            <strong>Status:</strong>{" "}
            {formData.is_completed ? "Completed" : "Not Completed (Draft)"}
          </div>
        )}

        <div className="form-actions-bottom">
          {!isViewOnlyMode && (isEditMode || !currentSubmissionId) && (
            <button
              type="submit"
              className="btn btn-primary btn-submit-material"
              disabled={formEffectivelyDisabled}
            >
              {isSubmitting ? (
                <FaSpinner className="spinner-icon-btn" />
              ) : currentSubmissionId ? (
                <FaSave />
              ) : (
                <FaPaperPlane />
              )}
              {isSubmitting
                ? "Saving..."
                : currentSubmissionId
                ? "Update Data"
                : "Submit Data"}
            </button>
          )}
          {!isViewOnlyMode && currentSubmissionId && isEditMode && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCancelEdit}
              disabled={isSubmitting} // isSubmitting is sufficient here, edit mode implies not viewOnly
            >
              <FaTimes /> Cancel Edit
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default MaterialDataFormPage;
