// src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import apiClient from "../services/api"; // Import apiClient to set headers dynamically

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // To show a loading state on initial app load

  // This effect runs only once when the application first loads.
  useEffect(() => {
    try {
      // Try to retrieve the stored token and user object from localStorage.
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (storedUser && storedToken) {
        // If both exist, parse the user object back into a JavaScript object.
        const parsedUser = JSON.parse(storedUser);

        // Set the user state for the application.
        setUser(parsedUser);

        // IMPORTANT: Set the default Authorization header for all future API calls with this token.
        // This ensures that even after a refresh, every API call is authenticated.
        apiClient.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${storedToken}`;
      }
    } catch (error) {
      // If there's an error (e.g., malformed JSON), clear storage to be safe.
      console.error("Failed to initialize auth from localStorage", error);
      localStorage.clear();
      setUser(null);
    } finally {
      // We are done checking, so set loading to false.
      setLoading(false);
    }
  }, []);

  // The login function, called after a successful API login.
  const login = (userDataFromApi) => {
    // The userData from the backend includes the token and user details.
    // We destructure it to separate the token from the rest of the user details.
    const { token, ...userDetails } = userDataFromApi;

    // Store the token and the user details object (as a JSON string) in localStorage.
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userDetails));

    // Set the default Authorization header for the current session.
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    // Update the user state, making it available to the rest of the app.
    setUser(userDetails);
  };

  // The logout function.
  const logout = () => {
    // Clear the token and user data from localStorage.
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Remove the Authorization header from the API client.
    delete apiClient.defaults.headers.common["Authorization"];

    // Reset the user state to null.
    setUser(null);
  };

  // Provide the user, loading state, and functions to the rest of the application.
  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
