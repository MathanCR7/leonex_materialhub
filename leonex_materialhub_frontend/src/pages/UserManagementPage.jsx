// src/pages/UserManagementPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  getAllUsers,
  getUniquePlants,
  createUser,
  updateUser,
} from "../services/api";
import { toast } from "react-toastify";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  FaPlus,
  FaEdit,
  FaSave,
  FaTimes,
  FaSpinner,
  FaUsers,
} from "react-icons/fa";
import "./_UserManagementPage.scss";

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [plantOptions, setPlantOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const initialFormState = {
    username: "",
    password: "",
    role: "cataloguer",
    expires_at: null,
    is_active: true,
    plants: [],
  };
  const [formData, setFormData] = useState(initialFormState);

  const fetchUsersAndPlants = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersRes, plantsRes] = await Promise.all([
        getAllUsers(),
        getUniquePlants(),
      ]);
      setUsers(usersRes.data || []);

      const options = (plantsRes.data || []).map((p) => ({
        value: p.plantcode,
        label: `${p.plantlocation} (${p.plantcode})`,
      }));
      setPlantOptions(options);
    } catch (error) {
      toast.error("Failed to load user or plant data.");
      console.error("Data fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsersAndPlants();
  }, [fetchUsersAndPlants]);

  const openModalForCreate = () => {
    setEditingUser(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openModalForEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: "",
      role: user.role,
      expires_at: user.expires_at ? new Date(user.expires_at) : null,
      is_active: user.is_active,
      // MODIFIED: Find options based on plantcode from the user.plants object array
      plants: (user.plants || [])
        .map((p) => plantOptions.find((opt) => opt.value === p.plantcode))
        .filter(Boolean),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handlePlantSelectChange = (selectedOptions) => {
    setFormData((prev) => ({ ...prev, plants: selectedOptions || [] }));
  };

  const handleDateChange = (date) => {
    setFormData((prev) => ({ ...prev, expires_at: date }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      ...formData,
      plants: formData.plants.map((p) => p.value), // Send only plant codes to backend
      expires_at: formData.expires_at
        ? formData.expires_at.toISOString()
        : null,
    };

    if (editingUser && !payload.password) {
      delete payload.password;
    } else if (!editingUser && !payload.password) {
      toast.error("Password is required for new users.");
      setIsSubmitting(false);
      return;
    }

    try {
      if (editingUser) {
        await updateUser(editingUser.id, payload);
        toast.success(`User ${formData.username} updated successfully.`);
      } else {
        await createUser(payload);
        toast.success(`User ${formData.username} created successfully.`);
      }
      closeModal();
      fetchUsersAndPlants();
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed.");
      console.error("Submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container user-management-page">
      <header className="page-header">
        <h1>
          <FaUsers /> User Management
        </h1>
        <p className="page-subtitle">
          Add, view, and edit system users and their permissions.
        </p>
        <button className="btn btn-primary" onClick={openModalForCreate}>
          <FaPlus /> Add New User
        </button>
      </header>

      {isLoading ? (
        <div className="loading-indicator">
          <FaSpinner className="spinner-icon large-spinner" />
          <p>Loading users...</p>
        </div>
      ) : (
        <div className="users-table-container card-style">
          <table className="users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Assigned Plants</th>
                <th>Expires On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td className={`role-badge ${user.role}`}>{user.role}</td>
                  <td>
                    {user.is_active ? (
                      <span className="status-badge active">Active</span>
                    ) : (
                      <span className="status-badge inactive">Inactive</span>
                    )}
                  </td>
                  <td>
                    {/* MODIFIED: Display both plant location and code */}
                    {user.role === "cataloguer" || user.role === "thirdparties"
                      ? user.plants.length > 0
                        ? user.plants
                            .map((p) => `${p.plantlocation} (${p.plantcode})`)
                            .join(", ")
                        : "None"
                      : "ALL PLANTS"}
                  </td>
                  <td>
                    {user.expires_at
                      ? new Date(user.expires_at).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td>
                    <button
                      className="btn-icon"
                      onClick={() => openModalForEdit(user)}
                      title="Edit User"
                    >
                      <FaEdit />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content card-style">
            <div className="modal-header">
              <h2>{editingUser ? "Edit User" : "Create New User"}</h2>
              <button className="btn-close-modal" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="user-form">
              <fieldset disabled={isSubmitting}>
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="form-control"
                    placeholder={
                      editingUser ? "Leave blank to keep current" : "Required"
                    }
                    required={!editingUser}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="role">Role</label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  >
                    <option value="admin">Admin</option>
                    <option value="cataloguer">Cataloguer</option>
                    <option value="thirdparties">Third Party</option>
                  </select>
                </div>
                {(formData.role === "cataloguer" ||
                  formData.role === "thirdparties") && (
                  <div className="form-group">
                    <label htmlFor="plants">Assigned Plants</label>
                    <Select
                      id="plants"
                      isMulti
                      options={plantOptions}
                      value={formData.plants}
                      onChange={handlePlantSelectChange}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      placeholder="Select one or more plants..."
                      required
                    />
                  </div>
                )}
                <div className="form-group date-picker-group">
                  <label htmlFor="expires_at">Expiration Date</label>
                  <DatePicker
                    selected={formData.expires_at}
                    onChange={handleDateChange}
                    className="form-control"
                    dateFormat="yyyy/MM/dd"
                    isClearable
                    placeholderText="Optional: Select date"
                  />
                </div>
                {editingUser && (
                  <div className="form-group checkbox-group">
                    <input
                      type="checkbox"
                      id="is_active"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="is_active">User is Active</label>
                  </div>
                )}
              </fieldset>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <FaSpinner className="spinner-icon-btn" />
                  ) : (
                    <FaSave />
                  )}
                  {isSubmitting
                    ? "Saving..."
                    : editingUser
                    ? "Update User"
                    : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
