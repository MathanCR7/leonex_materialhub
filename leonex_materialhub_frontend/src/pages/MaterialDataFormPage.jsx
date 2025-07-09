// src/pages/MaterialDataFormPage.jsx

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
import CostEstimationForm from "../components/CostEstimationForm";
import { toast } from "react-toastify";
import {
  FaSpinner,
  FaInfoCircle,
  FaExclamationCircle,
  FaEdit,
  FaSave,
  FaTrash,
  FaCamera,
  FaFileUpload,
} from "react-icons/fa";
import "./_MaterialDataFormPage.scss";

// --- Configurations ---
const goodMediaFieldsConfig = [
  {
    name: "image_specification",
    label: "1. Specification",
    dbKey: "image_specification_path",
    accept: "image/*",
  },
  {
    name: "image_packing_condition",
    label: "2. Packing Condition",
    dbKey: "image_packing_condition_path",
    accept: "image/*",
  },
  {
    name: "image_item_spec_mentioned",
    label: "3. Item Spec Mentioned",
    dbKey: "image_item_spec_mentioned_path",
    accept: "image/*",
  },
  {
    name: "image_product_top_view",
    label: "4. Product Top View",
    dbKey: "image_product_top_view_path",
    accept: "image/*",
  },
  {
    name: "image_3d_view",
    label: "5. 3D View",
    dbKey: "image_3d_view_path",
    accept: "image/*",
  },
  {
    name: "image_side_view_thickness",
    label: "6. Side/Thickness View",
    dbKey: "image_side_view_thickness_path",
    accept: "image/*",
  },
  {
    name: "image_stock_condition_packing",
    label: "7. Stock/Packing Condition",
    dbKey: "image_stock_condition_packing_path",
    accept: "image/*",
  },
  {
    name: "video_item_inspection",
    label: "8. Inspection Video",
    dbKey: "video_item_inspection_path",
    accept: "video/*",
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
  plantlocation: "",
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

// --- Helper Component ---
const DefectImagePreviewItem = ({ fileOrUrl, altText }) => {
  const [previewSrc, setPreviewSrc] = useState("");
  useEffect(() => {
    let objectUrl = null;
    if (fileOrUrl instanceof File) {
      objectUrl = URL.createObjectURL(fileOrUrl);
      setPreviewSrc(objectUrl);
    } else if (typeof fileOrUrl === "string") {
      setPreviewSrc(fileOrUrl);
    } else {
      setPreviewSrc("");
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileOrUrl]);

  if (!previewSrc) return null;
  return <img src={previewSrc} alt={altText} />;
};

// --- Main Component ---
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
  const [uniqueUOMs, setUniqueUOMs] = useState([]);
  const [uniqueCategories, setUniqueCategories] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isViewOnlyMode, setIsViewOnlyMode] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [initialGoodMediaPaths, setInitialGoodMediaPaths] =
    useState(initialFilesState);
  const [initialDefectMedia, setInitialDefectMedia] = useState(
    initialDefectFilesState
  );

  const resetFormToMasterDefaults = useCallback(
    (masterData) => {
      setFormData({
        ...initialFormDataBase,
        plantlocation: masterData?.plantlocation || "",
        uom: masterData?.uom || "",
        category: masterData?.category || "",
        soh_quantity: String(masterData?.soh_quantity || "0"),
      });
      setGoodMediaFiles(initialFilesState);
      setInitialGoodMediaPaths(initialFilesState);
      setDefectFiles(initialDefectFilesState);
      setInitialDefectMedia(initialDefectFilesState);
      setCurrentSubmissionId(null);
      setIsEditMode(canEdit);
    },
    [canEdit]
  );

  const populateFormWithExistingSubmission = useCallback(
    (submission, masterData) => {
      setFormData({
        plantlocation:
          submission.plantlocation || masterData?.plantlocation || "",
        uom: submission.uom || masterData?.uom || "",
        category: submission.category || masterData?.category || "",
        soh_quantity: String(
          submission.soh_quantity ?? masterData?.soh_quantity ?? "0"
        ),
        is_completed: submission.is_completed || false,
        good_material_count: String(submission.good_material_count || "0"),
        package_defects_count: String(submission.package_defects_count || "0"),
        physical_defects_count: String(
          submission.physical_defects_count || "0"
        ),
        other_defects_count: String(submission.other_defects_count || "0"),
        package_defects_reasons: submission.package_defects_reasons || "",
        physical_defects_reasons: submission.physical_defects_reasons || "",
        other_defects_reasons: submission.other_defects_reasons || "",
        missing_defects_status: submission.missing_defects_status || "",
      });
      const loadedGoodMedia = {};
      const initialPaths = {};
      goodMediaFieldsConfig.forEach((f) => {
        loadedGoodMedia[f.name] = submission[f.dbKey] || null;
        initialPaths[f.name] = submission[f.dbKey] || null;
      });
      setGoodMediaFiles(loadedGoodMedia);
      setInitialGoodMediaPaths(initialPaths);
      const loadedDefectMedia = {};
      defectCategoriesConfig.forEach((c) => {
        const paths = Array.isArray(submission[c.dbImagesKey])
          ? submission[c.dbImagesKey]
          : [];
        loadedDefectMedia[c.imagesField] = paths;
      });
      setDefectFiles(loadedDefectMedia);
      setInitialDefectMedia(loadedDefectMedia);
      setCurrentSubmissionId(submission.id);
      setIsEditMode(canEdit && !submission.is_completed);
    },
    [canEdit]
  );

  useEffect(() => {
    if (user) {
      const userIsViewer =
        user.role === "thirdparties" || location.state?.viewOnly === true;
      const userCanEditThisPlant =
        user.role === "admin" ||
        (user.role === "cataloguer" &&
          user.plants?.some((p) => p.plantcode === plantCodeFromUrl));
      setIsViewOnlyMode(userIsViewer);
      setCanEdit(userCanEditThisPlant);
      setIsEditMode(userCanEditThisPlant && !currentSubmissionId);
    }
  }, [user, location.state, plantCodeFromUrl, currentSubmissionId]);

  useEffect(() => {
    if (!plantCodeFromUrl) {
      toast.error("Plant code is missing.");
      navigate("/material-codes", { replace: true });
      return;
    }
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    const hasAccessToPlant =
      user.role === "admin" ||
      (user.plants &&
        user.plants.some((p) => p.plantcode === plantCodeFromUrl));
    if (!hasAccessToPlant) {
      toast.error("Access denied to this plant.");
      navigate("/material-codes", { replace: true });
      return;
    }
    setIsLoadingData(true);
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        const masterRes = await getMaterialMasterDetails(
          materialCode,
          plantCodeFromUrl,
          { signal: controller.signal }
        );
        const fetchedMasterData = masterRes.data;
        setMaterialMasterData(fetchedMasterData);
        if (canEdit) {
          const [uomsRes, catsRes] = await Promise.all([
            getUniqueMaterialValues("uom"),
            getUniqueMaterialValues("category"),
          ]);
          setUniqueUOMs(uomsRes.data);
          setUniqueCategories(catsRes.data);
        }
        try {
          const subRes = await getLatestMaterialSubmission(
            materialCode,
            plantCodeFromUrl,
            { signal: controller.signal }
          );
          populateFormWithExistingSubmission(subRes.data, fetchedMasterData);
        } catch (subErr) {
          if (subErr.response?.status === 404) {
            resetFormToMasterDefaults(fetchedMasterData);
          } else if (subErr.name !== "CanceledError") {
            throw subErr;
          }
        }
      } catch (err) {
        if (err.name !== "CanceledError") {
          toast.error(
            err.response?.data?.message || "Failed to load page data."
          );
          navigate("/material-codes", { replace: true });
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingData(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [
    materialCode,
    plantCodeFromUrl,
    user,
    authLoading,
    canEdit,
    navigate,
    populateFormWithExistingSubmission,
    resetFormToMasterDefaults,
  ]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((p) => ({
      ...p,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleGoodMediaFileChange = useCallback((name, file) => {
    setGoodMediaFiles((p) => ({ ...p, [name]: file }));
  }, []);

  const handleDefectFilesChange = (field, event) => {
    const newFiles = Array.from(event.target.files);
    setDefectFiles((p) => ({
      ...p,
      [field]: [...(p[field] || []), ...newFiles],
    }));
    if (event.target) event.target.value = null;
  };

  const handleDefectCameraFile = (field, event) => {
    const newFile = event.target.files[0];
    if (newFile) {
      setDefectFiles((p) => ({
        ...p,
        [field]: [...(p[field] || []), newFile],
      }));
    }
    if (event.target) event.target.value = null;
  };

  const removeDefectFile = (field, fileToRemove) => {
    setDefectFiles((p) => ({
      ...p,
      [field]: p[field].filter((f) => f !== fileToRemove),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formEffectivelyDisabled) return;
    if (
      !formData.is_completed &&
      !window.confirm("This submission is incomplete. Save as draft?")
    )
      return;
    setIsSubmitting(true);
    const dataPayload = new FormData();
    dataPayload.append("material_code", materialMasterData.material_code);
    dataPayload.append("plant", plantCodeFromUrl);
    dataPayload.append(
      "material_description_snapshot",
      materialMasterData.material_description
    );
    Object.keys(formData).forEach((key) =>
      dataPayload.append(key, formData[key])
    );
    goodMediaFieldsConfig.forEach((f) => {
      if (goodMediaFiles[f.name] instanceof File) {
        dataPayload.append(f.name, goodMediaFiles[f.name]);
      } else if (
        currentSubmissionId &&
        goodMediaFiles[f.name] === null &&
        initialGoodMediaPaths[f.name]
      ) {
        dataPayload.append(`${f.name}_cleared`, "true");
      }
    });
    defectCategoriesConfig.forEach((c) => {
      const currentFiles = defectFiles[c.imagesField] || [];
      const keptUrls = [];
      currentFiles.forEach((fileOrUrl) => {
        if (fileOrUrl instanceof File) {
          dataPayload.append(c.imagesField, fileOrUrl);
        } else if (typeof fileOrUrl === "string") {
          keptUrls.push(fileOrUrl);
        }
      });
      if (currentSubmissionId) {
        dataPayload.append(`kept_${c.dbImagesKey}`, JSON.stringify(keptUrls));
      }
    });
    try {
      if (currentSubmissionId) {
        await updateMaterialData(currentSubmissionId, dataPayload);
        toast.success("Data updated successfully!");
      } else {
        await submitMaterialData(dataPayload);
        toast.success("Data submitted successfully!");
      }
      const latestSubRes = await getLatestMaterialSubmission(
        materialCode,
        plantCodeFromUrl
      );
      populateFormWithExistingSubmission(latestSubRes.data, materialMasterData);
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = () => {
    if (canEdit) {
      if (formData.is_completed) {
        toast.info("Editing a completed form will mark it as a draft.");
        setFormData((prev) => ({ ...prev, is_completed: false }));
      }
      setIsEditMode(true);
    }
  };

  const formEffectivelyDisabled = isViewOnlyMode || !isEditMode || isSubmitting;
  const calculatedMissingCount =
    (parseInt(formData.soh_quantity, 10) || 0) -
    ((parseInt(formData.good_material_count, 10) || 0) +
      (parseInt(formData.package_defects_count, 10) || 0) +
      (parseInt(formData.physical_defects_count, 10) || 0) +
      (parseInt(formData.other_defects_count, 10) || 0));

  if (authLoading || isLoadingData)
    return (
      <div className="loading-fullscreen">
        <FaSpinner className="spinner-icon large-spinner" />
        <p>Loading Material Data...</p>
      </div>
    );
  if (!materialMasterData)
    return (
      <div className="container error-fullscreen">
        <FaExclamationCircle size={40} />
        <p>Could not load master material data.</p>
      </div>
    );

  return (
    <div className="material-data-form-page">
      <header className="page-header">
        <h1>
          {isViewOnlyMode
            ? "View Submission"
            : currentSubmissionId && !isEditMode
            ? "Review Submission"
            : currentSubmissionId
            ? "Edit Submission"
            : "New Submission"}
          :{" "}
          <span className="material-code-highlight">
            {materialMasterData?.material_code}
          </span>
          {user?.role === "admin" && materialMasterData?.mask_code && (
            <span className="mask-code-header-display">
              (Mask: {materialMasterData.mask_code})
            </span>
          )}
        </h1>
        <div className="material-description-display">
          <FaInfoCircle /> <strong>Description:</strong>{" "}
          {materialMasterData?.material_description}
        </div>
        <div className="material-description-display">
          <FaInfoCircle /> <strong>Plant:</strong> {plantCodeFromUrl}
          {formData.plantlocation && ` - ${formData.plantlocation}`}
        </div>
      </header>

      <form onSubmit={handleSubmit} className="material-form">
        {!isViewOnlyMode && currentSubmissionId && !isEditMode && canEdit && (
          <div className="form-actions-top">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleEditClick}
            >
              <FaEdit /> Edit Data
            </button>
          </div>
        )}

        <fieldset disabled={formEffectivelyDisabled}>
          <div className="card-style">
            <section className="form-section">
              <h2 className="form-section-title">Material Details</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Plant Code</label>
                  <input
                    type="text"
                    className="form-control"
                    value={plantCodeFromUrl}
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="plantlocation">Plant Location</label>
                  <input
                    type="text"
                    id="plantlocation"
                    name="plantlocation"
                    className="form-control"
                    value={formData.plantlocation}
                    readOnly
                  />
                </div>
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
                    required
                  />
                  <datalist id="uom-datalist">
                    {uniqueUOMs.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
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
                    required
                  />
                  <datalist id="category-datalist">
                    {uniqueCategories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div className="form-group">
                  <label>SOH Quantity</label>
                  <input
                    type="number"
                    name="soh_quantity"
                    className="form-control"
                    value={formData.soh_quantity}
                    onChange={handleInputChange}
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Good Material Count</label>
                  <input
                    type="number"
                    name="good_material_count"
                    className="form-control"
                    value={formData.good_material_count}
                    onChange={handleInputChange}
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Package Defects Count</label>
                  <input
                    type="number"
                    name="package_defects_count"
                    className="form-control"
                    value={formData.package_defects_count}
                    onChange={handleInputChange}
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Physical Defects Count</label>
                  <input
                    type="number"
                    name="physical_defects_count"
                    className="form-control"
                    value={formData.physical_defects_count}
                    onChange={handleInputChange}
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Other Defects Count</label>
                  <input
                    type="number"
                    name="other_defects_count"
                    className="form-control"
                    value={formData.other_defects_count}
                    onChange={handleInputChange}
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Missing Count (Calculated)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={calculatedMissingCount}
                    readOnly
                    style={{
                      fontWeight: "bold",
                      color: calculatedMissingCount < 0 ? "#ef4444" : "inherit",
                    }}
                  />
                </div>
              </div>
            </section>

            <section className="form-section">
              <h2 className="form-section-title">Good Media Uploads</h2>
              <div className="media-grid">
                {goodMediaFieldsConfig.map((f) => (
                  <ImageUploadField
                    key={f.name}
                    {...f}
                    onChange={handleGoodMediaFileChange}
                    currentFile={goodMediaFiles[f.name]}
                    disabled={formEffectivelyDisabled}
                  />
                ))}
              </div>
            </section>

            <section className="form-section">
              <h2 className="form-section-title">Defects Details</h2>
              {/* --- CHANGE: ADDED WRAPPER DIV FOR GRID --- */}
              <div className="defects-grid-container">
                {defectCategoriesConfig.map((c) => (
                  <div key={c.name} className="defect-category-group">
                    <h3>
                      {c.label} (Count: {formData[c.countField] || 0})
                    </h3>
                    <div className="form-group">
                      <label>Reasons</label>
                      <textarea
                        name={c.reasonField}
                        value={formData[c.reasonField]}
                        onChange={handleInputChange}
                        rows="2" /* --- CHANGE: REDUCED ROWS --- */
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label>Images</label>
                      {!formEffectivelyDisabled && (
                        <div className="defect-image-controls">
                          <label
                            htmlFor={`${c.imagesField}-input`}
                            className="btn btn-secondary btn-sm"
                          >
                            <FaFileUpload /> Select Files
                          </label>
                          <input
                            type="file"
                            id={`${c.imagesField}-input`}
                            multiple
                            accept="image/*"
                            onChange={(e) =>
                              handleDefectFilesChange(c.imagesField, e)
                            }
                            style={{ display: "none" }}
                          />
                          <label
                            htmlFor={`${c.imagesField}-camera`}
                            className="btn btn-secondary btn-sm"
                          >
                            <FaCamera /> Use Camera
                          </label>
                          <input
                            type="file"
                            id={`${c.imagesField}-camera`}
                            accept="image/*"
                            capture="environment"
                            onChange={(e) =>
                              handleDefectCameraFile(c.imagesField, e)
                            }
                            style={{ display: "none" }}
                          />
                        </div>
                      )}
                      <div className="defect-previews">
                        {(defectFiles[c.imagesField] || []).map(
                          (file, index) => (
                            <div key={index} className="preview-item">
                              <DefectImagePreviewItem
                                fileOrUrl={file}
                                altText={`${c.label} ${index + 1}`}
                              />
                              {!formEffectivelyDisabled && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeDefectFile(c.imagesField, file)
                                  }
                                  className="btn btn-sm btn-remove-defect-img"
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
                {/* --- CHANGE: ADDED SPECIFIC CLASS FOR STYLING --- */}
                <div className="form-group missing-defects-group">
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
              </div>
            </section>
          </div>

          {canEdit && !isViewOnlyMode && (
            <div className="card-style completion-card">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="is_completed"
                  name="is_completed"
                  checked={formData.is_completed}
                  onChange={handleInputChange}
                  disabled={formEffectivelyDisabled}
                />
                <label htmlFor="is_completed">
                  Mark this submission as complete and ready for review.
                </label>
              </div>
            </div>
          )}

          <div
            className={`completion-status-view ${
              formData.is_completed ? "status-completed" : "status-draft"
            }`}
          >
            <strong>Status:</strong>{" "}
            {formData.is_completed ? "Completed" : "Draft"}
          </div>

          <div className="form-actions-bottom">
            {isEditMode && canEdit && !isViewOnlyMode && (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={formEffectivelyDisabled}
              >
                {isSubmitting ? (
                  <FaSpinner className="spinner-icon" />
                ) : (
                  <FaSave />
                )}
                {currentSubmissionId ? "Update Data" : "Submit Data"}
              </button>
            )}
          </div>
        </fieldset>
      </form>

      {user?.role === "thirdparties" && currentSubmissionId && (
        <CostEstimationForm submissionId={currentSubmissionId} />
      )}
    </div>
  );
};

export default MaterialDataFormPage;
