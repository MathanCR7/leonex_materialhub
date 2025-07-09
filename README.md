# Stock and Inventory Management

<!-- Optional: Add a relevant badge here, e.g., a build status badge -->
<!-- ![Build Status](https://img.shields.io/badge/build-passing-brightgreen) -->
<!-- ![License](https://img.shields.io/badge/license-MIT-blue.svg) -->

Welcome to the **Stock and Inventory Management** repository! This project is a web-based platform designed to provide a robust solution for managing inventory, tracking stock conditions and defects, and facilitating cost estimation processes within a multi-plant organization. It focuses on precise item code identification, detailed condition classification, and role-based access control to manage stock levels and conditions, supporting informed decisions regarding recovery, disposition, or sale based on item status.

Built with a modern stack including **React**, **Node.js/Express**, and utilizing **MySQL** for data persistence, this system aims to streamline complex inventory workflows.

## ✨ Features

The Stock and Inventory Management platform offers distinct functionalities tailored to different user roles and core inventory processes:

### Core Inventory & Condition Management

-   **Stock Condition Cataloguing:** Detailed review and classification of inventory items based on their physical and packaging condition (Good, Package Defect, Physical Defect, Other Defect, Missing).
-   **Defect Tracking:** Specific recording of package, physical, and other defects, including root causes, detailed descriptions, and supporting imagery.
-   **Image & Video Uploads:** Comprehensive media attachment capabilities for documenting inventory item conditions, including specific views for good materials and multiple images for documenting defects.
-   **Calculated Missing Stock:** Automatic calculation of missing items by comparing the system's Stock On Hand (SOH) quantity with the sum of quantities classified into different conditions.
-   **Item Code Identification:** Centralized management and precise identification of inventory items via unique item codes.

### Role-Based Access & Functionality

#### 👑 Admin

-   **Centralized Plant Management:** Configure and manage details of all operational plants or warehouse locations.
-   **Item Code Management:** Insert, update, and manage the master list of item codes and their details.
-   **User Management:** Create, edit, and manage user accounts (Cataloguers, Third Parties), assigning specific roles.
-   **User Assignment & Access Control:** Assign users to specific plants, controlling their access and permissions securely via JWT.
-   **Account Activation/Deactivation:** Control user account status and set expiry dates for enhanced security.
-   **Full Inventory Data Visibility:** View all stock data, condition submissions, and defect details across all plants.
-   **Cost Estimation Oversight:** View and manage all cost estimations submitted by Third Parties for any item code.
-   **Comprehensive Reporting & Statistics (Dashboard):** Access aggregated data, key performance indicators, and statistics across the entire platform for informed decision-making related to inventory and potential stock sell/disposition.

#### 📦 Cataloguer

-   **Restricted Plant Access:** Access and process only inventory items and submissions associated with their assigned plant(s).
-   **Stock Condition Review & Submission:** Locate assigned item codes, physically verify stock, fill out the detailed condition form (quantities per condition, defect reasons, media uploads), and submit the findings for review and potential estimation.
-   **View Own Submissions:** Track the status and details of inventory items they have classified and submitted.

#### 🤝 Third Party

-   **Restricted Submission Access:** Access only inventory submissions from plants they are assigned to, potentially limited to submissions pending their estimation.
-   **Cost Estimation Input:** Provide cost estimations or valuation inputs for material submissions based on their classified condition (Good, Package Defect, Physical Defect, Other Defect), aiding potential stock sell or recovery decisions.
-   **View Own Estimations:** See the cost estimates they have previously submitted.
-   **Dashboard Statistics (Limited):** View relevant statistics, potentially related to items requiring estimation or completed estimations.

## 🛠️ Tech Stack

This project is built using the following modern technologies:

-   **Frontend:** **React** (for building a dynamic and responsive user interface)
-   **Backend:** **Node.js** with **Express.js** (for building RESTful APIs, handling authentication, and business logic)
-   **Database:** **MySQL** (a robust and widely-used relational database for storing inventory data, user information, submissions, and estimations)
-   **Authentication:** **JWT (JSON Web Tokens)** (for secure API endpoint access and managing user sessions/permissions)
-   **File Storage:** Local filesystem or cloud storage services like AWS S3, Google Cloud Storage (for storing uploaded images and videos)

This combination provides a powerful, scalable, and maintainable architecture suitable for enterprise-level inventory management.

## 🚀 Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   Node.js and npm or yarn installed
-   A running MySQL database server instance
-   Git

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository_url>
    cd stock_inventory_management # Navigate into the project directory
    ```

2.  **Set up Backend:**

    ```bash
    # Navigate to the backend directory (assuming a standard structure like '/backend')
    cd backend
    npm install # or yarn install
    ```

    -   Create a `.env` file in the backend root based on a provided `.env.example`. Configure your MySQL database connection, JWT secret, file storage paths, etc.
    -   Run database migrations to set up the necessary tables: `npm run migrate` (command may vary based on your ORM/setup).
    -   Seed initial data (e.g., initial admin user, some plants, sample item codes if needed): `npm run seed` (command may vary).

3.  **Set up Frontend:**
    ```bash
    # Navigate to the frontend directory (assuming a standard structure like '/frontend')
    cd ../frontend
    npm install # or yarn install
    ```
    -   Create a `.env` file in the frontend root for the backend API URL, etc.

### Configuration (.env Files)

Sensitive configurations, database credentials, API keys, and external URLs are managed via `.env` files. Example files (`.env.example`) should be provided to help you set up. **Do not commit your actual `.env` files to version control.**

*   **Backend Configuration (`backend/.env`):** Create this file from `backend/.env.example` and fill in your specific details.
    ```dotenv
    # Database connection details (MySQL)
    DB_HOST=127.0.0.1
    DB_USER=root
    DB_PASSWORD=your_mysql_password # <-- IMPORTANT: CHANGE THIS to your actual DB password!
    DB_NAME=stock_inventory_db # <-- IMPORTANT: CHANGE THIS to your database name!
    DB_PORT=3306

    # Backend Server Settings
    PORT=5001 # Port for the backend API server

    # Authentication
    JWT_SECRET=your_super_secret_jwt_token # <-- IMPORTANT: CHANGE THIS to a strong, unique, random value! Secret key for signing JWTs.

    # File Storage
    # Configure base URL where uploaded media files can be accessed and the local storage path
    MEDIA_BASE_URL=http://localhost:5001/media # Base URL for serving media (match backend port)
    FILE_UPLOAD_DESTINATION=./uploads/ # Local path where files will be stored (relative to backend root)

    # CORS Settings
    CORS_ORIGIN=http://localhost:5173 # Frontend URL allowed to access the API (for development CORS)
    ```
*   **Frontend Configuration (`frontend/.env`):** Create this file from `frontend/.env.example` and fill in your specific details. (Note: If using Vite, variable names must be prefixed with `VITE_`).
    ```dotenv
    # API Configuration
    VITE_API_URL=http://localhost:5001/api # Base URL for the backend API (match backend port and API path)
    ```

### Running the Application

1.  **Start the Backend Server:**

    ```bash
    cd backend
    node server.js
    ```

    The backend API should now be running, typically on the port specified in your `.env` file (e.g., 5001).

2.  **Start the Frontend Development Server:**
    ```bash
    cd frontend
    npm start # or yarn start (depending on your package.json scripts)
    ```
    The frontend application should open in your browser, typically on a port like 3000, 5173 (Vite default), or 8080.

## Initial Testing Credentials

For initial testing and exploration of different user capabilities in the development environment, you can use the following credentials:

*   **Admin**
    *   Username: `admin`
    *   Password: `admin123`
    *   *Purpose: Full administrative capabilities.*

*   **Cataloguer**
    *   Username: `cataloguer`
    *   Password: `cataloguer123`
    *   *Purpose: Capabilities related to managing the catalogue/inventory.*

*   **Third-party**
    *   Username: `thirdparty`
    *   Password: `thirdparty123`
    *   *Purpose: Limited access typically for external integrations or specific views.*

---

**⚠️ Important Security Note:**

These credentials are strictly for **development and testing purposes** within a controlled, non-production environment. **NEVER** use these default credentials or weak passwords in a production system. In a production setup, you must:

*   Implement strong, unique passwords for all users.
*   Follow secure practices for initial administrative user creation.
*   Consider disabling or removing default test accounts after setup.
*   Review and implement appropriate access control, security measures, and data encryption.

---

## 📚 Documentation

-   **For Developers:** Dive into the technical details, architecture, API endpoints, database schema, and advanced setup guides in the [Developer Guide](DEVELOPER_GUIDE.md).
-   **For End-Users:** Learn how to use the application based on your role (Admin, Cataloguer, Third Party) in the [User Guide](USER_GUIDE.md).

*(Note: The `DEVELOPER_GUIDE.md` and `USER_GUIDE.md` files are assumed to exist and contain detailed information.)*

## 📄 License

This project is licensed under the [MIT License](LICENSE) (if available) - see the `LICENSE.md` file for details.

## 📞 Contact

If you have any questions, issues, or require further assistance, please feel free to open an issue on this GitHub repository. You can also connect with MATHAN C via [LinkedIn](https://www.linkedin.com/in/mathan-c/) for project-related discussions.

---
Built with ❤️ and Code.
