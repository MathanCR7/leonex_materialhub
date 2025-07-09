# Stock and Inventory Management

<!-- Optional: Add relevant badges here, e.g., build status, license, version -->
<!-- ![Build Status](https://img.shields.io/badge/build-passing-brightgreen) -->
<!-- ![Version](https://img.shields.io/badge/version-1.0.0-blue) -->
<!-- ![License](https://img.shields.io/badge/license-MIT-blue.svg) -->

## 👋 Welcome to the Stock and Inventory Management Project!

This project provides a sophisticated web-based platform designed to revolutionize how organizations manage their physical inventory across multiple locations (plants/warehouses). Going beyond simple stock counts, this system focuses on **detailed condition tracking**, **defect management**, and **cost estimation** to support informed decisions for inventory disposition, potential recovery, or stock selling. By leveraging precise item code identification and a robust role-based access control system, it streamlines workflows and enhances visibility throughout the inventory lifecycle.

Built with a powerful and modern **React (with Vite)** frontend, a flexible **Node.js/Express** backend, and a reliable **MySQL** database, this application is designed for scalability and performance in a multi-plant environment.

## ✨ Key Features

The Stock and Inventory Management platform offers a comprehensive suite of features tailored to its core function and different user responsibilities:

### Core Inventory Lifecycle Management

-   **Comprehensive Stock Condition Cataloguing:** Accurately classify inventory items based on detailed conditions: Good, Package Defect, Physical Defect, Other Defect, and Missing. This granular classification is key for valuation and disposition.
-   **Detailed Defect Tracking:** Go beyond just noting defects. Record specific types (Package, Physical, Other), capture reasons, add descriptive notes, and upload supporting media (images, videos).
-   **Rich Media Attachments:** Easily upload images and videos to visually document the condition of items, providing clear evidence for good stock and specific defects. Supports multiple images per item/defect.
-   **Automated Missing Stock Calculation:** The system automatically calculates the quantity of 'Missing' items based on the difference between the expected Stock On Hand (SOH) and the sum of quantities classified into 'Good', 'Package Defect', 'Physical Defect', and 'Other Defect' conditions.
-   **Precise Item Code Identification:** Centralized management and lookup of unique item codes ensure accuracy and consistency across the inventory.

### Role-Based Access & Workflow

The platform securely manages user access and functionality based on assigned roles:

#### 👑 Admin - Full Control & Oversight

-   **Plant/Location Management:** Define and manage all operational plants or warehouse locations within the system.
-   **Master Item Code Management:** Maintain the master list of all item codes, including adding new items and updating details.
-   **User Account Management:** Create, edit, and manage user accounts with specific roles (Cataloguer, Third Party).
-   **Secure User Assignment & Access:** Assign users to specific plants, limiting their access accordingly, secured via JWT.
-   **Account Lifecycle Management:** Activate, deactivate, or set expiry dates for user accounts.
-   **Global Data Visibility:** Access and view all inventory data, condition submissions, and defect details from *all* plants.
-   **Cost Estimation Review:** View and manage all cost estimations submitted by Third Parties for any item code.
-   **Analytical Dashboard:** Access aggregated reports and statistics providing insights into inventory status, defect trends, and classification progress across the platform.

#### 📦 Cataloguer - Inventory Condition Experts

-   **Plant-Specific Access:** Limited access to view and process only inventory items assigned to their specific plant(s).
-   **Stock Review & Submission:** Locate assigned item codes within their plant, physically inspect stock, fill out the detailed condition form (quantities per condition, defect details, media uploads), and submit their findings for classification.
-   **Submission Tracking:** View the status and details of inventory items they have personally classified and submitted.

#### 🤝 Third Party - Valuation & Estimation

-   **Restricted Submission Access:** Access only inventory submissions from plants they are assigned to, typically limited to submissions pending their expert valuation or cost estimation.
-   **Cost Estimation Input:** Provide detailed cost estimations or valuation inputs for classified items (Good, Package Defect, Physical Defect, Other Defect), which aids in decisions regarding stock selling, recovery, or write-off.
-   **Estimation History:** View the cost estimates they have previously submitted.
-   **Limited Dashboard:** Access relevant statistics pertinent to items requiring estimation or estimates they have completed.

## 🛠️ Tech Stack

This project is built using a robust and popular stack for modern web applications:

-   **Frontend:** **React** (A powerful JavaScript library for building user interfaces) powered by **Vite** (A next-generation frontend tooling that provides a blazing fast development experience).
-   **Backend:** **Node.js** (A JavaScript runtime) with the **Express.js** framework (A minimalist web application framework for building RESTful APIs).
-   **Database:** **MySQL** (A widely-used, reliable, and powerful open-source relational database management system for structured data storage).
-   **Authentication:** **JWT (JSON Web Tokens)** for secure, stateless authentication and authorization.
-   **File Storage:** Utilizes local filesystem storage (with potential for cloud integration like AWS S3, Google Cloud Storage in future enhancements) for managing uploaded media files.

This combination offers flexibility, performance, and scalability for your inventory management needs.

## 🚀 Getting Started

Follow these steps to get the Stock and Inventory Management application running on your local machine for development and testing.

### Prerequisites

-   Node.js (LTS version recommended) and npm or yarn installed
-   A running MySQL database server instance
-   Git

### Installation Steps

1.  **Clone the repository:**

    ```bash
    git clone <repository_url>
    cd stock_inventory_management # Navigate into the project directory
    ```

2.  **Set up Backend:**

    ```bash
    # Navigate to the backend directory (assuming your backend code is in a 'backend' folder)
    cd backend
    npm install # or yarn install
    ```

    -   Create a `.env` file in the `backend` root directory. Copy the contents from `.env.example` (which should be provided in the repo) and fill in your specific configuration details, especially the MySQL database connection.
    -   Run database migrations to set up the necessary tables in your MySQL database. The specific command depends on your ORM or migration tool (e.g., `npm run migrate` or similar).
    -   Run seeders (if available) to populate the database with initial data like an admin user, some plants, or sample item codes (e.g., `npm run seed` or similar).

3.  **Set up Frontend:**
    ```bash
    # Navigate to the frontend directory (assuming your frontend code is in a 'frontend' folder)
    cd ../frontend
    npm install # or yarn install
    ```
    -   Create a `.env` file in the `frontend` root directory based on `.env.example`. Configure variables like the backend API URL. Remember that for Vite, environment variables exposed to the browser must be prefixed with `VITE_`.

### Configuration (.env Files)

Sensitive configurations, database credentials, API keys, and external URLs are managed via `.env` files. **Crucially, never commit your actual `.env` files to version control (they should be ignored by `.gitignore`).** Example files (`.env.example`) should guide you.

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
    JWT_SECRET=your_super_secret_jwt_token # <-- IMPORTANT: CHANGE THIS to a strong, unique, random value! Used for signing JWTs.

    # File Storage
    # Configure the base URL where uploaded media files can be accessed and the local storage path
    MEDIA_BASE_URL=http://localhost:5001/media # Base URL for serving media (match backend port)
    FILE_UPLOAD_DESTINATION=./uploads/ # Local path where files will be stored (relative to backend root)

    # CORS Settings
    CORS_ORIGIN=http://localhost:5173 # Frontend URL allowed to access the API (for development CORS)
    ```
*   **Frontend Configuration (`frontend/.env`):** Create this file from `frontend/.env.example` and fill in your specific details.
    ```dotenv
    # API Configuration
    # Base URL for the backend API - MUST match the backend's port and path
    VITE_API_URL=http://localhost:5001/api
    ```

### Running the Application

1.  **Start the Backend Server:**

    ```bash
    cd backend
    node server.js # Use the command specified in your backend setup
    # Alternative commonly used commands: npm start OR npm run dev
    ```

    The backend API should now be running, typically on the port specified in your backend `.env` file (e.g., 5001).

2.  **Start the Frontend Development Server (using Vite):**
    ```bash
    cd frontend
    npm run dev # Standard command for Vite development server
    # Alternative if using yarn: yarn dev
    ```
    The frontend application should open in your browser, typically on a port like 5173 (Vite default).

## Initial Testing Credentials

For initial testing and exploration of different user capabilities in the development environment, you can use the following credentials. These accounts are typically created by the database seed script.

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
*   Follow secure practices for initial administrative user creation (e.g., creating the first admin via a secure setup process or command-line tool).
*   Consider disabling or removing default test accounts after setting up your production users.
*   Review and implement appropriate access control, security measures, input validation, and data encryption practices.

---

## 📸 Screenshots

*(Suggestion: Add screenshots or GIFs here to showcase the application's UI for different roles.)*

For example:

-   ![Admin Dashboard Screenshot](docs/screenshots/admin-dashboard.png)
-   ![Cataloguer Submission Form Screenshot](docs/screenshots/cataloguer-form.png)
-   ![Third Party Estimation Screenshot](docs/screenshots/third-party-estimation.png)

*(Replace the above lines with actual image links once you have screenshots.)*

## 📚 Documentation

-   **For Developers:** Dive into the technical details, project architecture, API endpoint documentation, database schema, testing procedures, and advanced setup guides in the [Developer Guide](DEVELOPER_GUIDE.md).
-   **For End-Users:** Learn how to navigate and utilize the application based on your assigned role (Admin, Cataloguer, Third Party) in the [User Guide](USER_GUIDE.md).

*(Note: Ensure `DEVELOPER_GUIDE.md` and `USER_GUIDE.md` files exist and contain the relevant detailed information.)*

## 📄 License

This project is licensed under the [MIT License](LICENSE) (if available) - see the `LICENSE.md` file for details.

## 📞 Contact

If you have any questions, encounter issues, or require further assistance, please feel free to open an issue on this GitHub repository. You can also connect with MATHAN C via [LinkedIn](https://www.linkedin.com/in/mathan-c/) for project-related discussions.

---

Built with ❤️ and Code.
