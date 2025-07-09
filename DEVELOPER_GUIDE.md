
# ✨ Stock and Inventory Management - Developer Guide ✨

This document serves as the comprehensive technical guide for developers contributing to the **Stock and Inventory Management** project. It details the architecture, database design, authentication mechanisms, API endpoints, and environmental setup.

<!-- Optional: Add relevant badges here -->
<!-- ![Code Quality](https://img.shields.io/badge/code%20quality-A%2B-green) -->
<!-- ![License](https://img.shields.io/badge/license-MIT-blue.svg) -->

## 📖 Table of Contents

1.  [Introduction](#1-introduction)
2.  [Architecture Overview](#2-architecture-overview)
3.  [Project Structure](#3-project-structure)
4.  [📦 Database Schema](#4-database-schema)
    *   [Users Table](#users-table)
    *   [Plants Table](#plants-table)
    *   [Materials Table](#materials-table)
    *   [Material Submissions Table](#material-submissions-table)
    *   [Material Submission Media Table](#material-submission-media-table)
    *   [Third Party Estimations Table](#third-party-estimations-table)
5.  [🔑 Authentication & Authorization (JWT)](#5-authentication--authorization-jwt)
    *   [Login Process](#login-process)
    *   [Token Structure (Claims)](#token-structure-claims)
    *   [Protected Routes](#protected-routes)
    *   [Role and Plant Based Access Control](#role-and-plant-based-access-control)
6.  [🌐 API Documentation](#6-api-documentation)
    *   [Authentication Endpoints](#authentication-endpoints)
    *   [👑 Admin Endpoints](#admin-endpoints)
    *   [📦 Cataloguer/Material Endpoints](#cataloguermaterial-endpoints)
    *   [🤝 Third Party Endpoints](#third-party-endpoints)
    *   [Common Endpoints](#common-endpoints)
    *   [⬆️ File Uploads](#file-uploads)
7.  [🛠️ Setting up Development Environment](#7-setting-up-development-environment)
    *   [Prerequisites](#prerequisites)
    *   [Installation & Setup](#installation--setup)
    *   [Environment Variables](#environment-variables)
    *   [Database Setup](#database-setup)
    *   [Running the Application](#running-the-application)
8.  [✅ Testing](#8-testing)
9.  [🚀 Deployment Considerations](#9-deployment-considerations)
10. [💡 Troubleshooting](#10-troubleshooting)

---

## 1. Introduction

The **Stock and Inventory Management** project is a web application designed to provide a structured and efficient system for the cataloguing, condition assessment, and cost estimation of material inventory. By focusing on defined conditions, material codes, and role-based workflows, it streamlines operations for multi-plant organizations. This guide is your essential resource for understanding the technical underpinnings and contributing to the project's development.

## 2. Architecture Overview

The system adheres to a classic client-server architecture, implemented as a Single Page Application (SPA) frontend that interacts with a RESTful API backend.

*   **Frontend:** Built with **React** and using **Vite** for a fast development experience, this layer handles the user interface, user interactions, state management, and presents data fetched from the backend.
*   **Backend (API):** Developed using **Node.js** with **Express.js**, this layer is the brain of the application. It contains the core business logic, manages data persistence via the database, handles user authentication and authorization (JWT), processes file uploads, and serves data to the frontend through well-defined RESTful endpoints.
*   **Database:** **MySQL** is used as the relational database to store all critical application data, including user profiles, plant information, the material master catalog, and the dynamic records of material submissions and third-party estimations.
*   **File Storage:** A dedicated system (initially local filesystem) is in place to store and serve the images and videos uploaded as part of the material submission process, providing visual documentation of item conditions.

## 3. Project Structure

Understanding the project layout is key to navigating the codebase. Below is an example structure, which may be adjusted based on the project's evolution:

```bash
stock_inventory_management/
├── backend/
│   ├── src/
│   │   ├── controllers/    # 🌐 Handle incoming HTTP requests and coordinate responses
│   │   ├── services/       # 🧠 Contain core business logic and operations
│   │   ├── models/         # 📦 Define database schemas and interactions (using ORM/ODM)
│   │   ├── routes/         # 🗺️ Define API endpoints and route handling
│   │   ├── middleware/     # 🛡️ Implement authentication, authorization, error handling, etc.
│   │   ├── config/         # ⚙️ Configuration settings (DB, JWT, etc.)
│   │   └── app.js          # ▶️ Backend application entry point
│   ├── migrations/         # ⬆️ Database schema migration scripts
│   ├── seeds/              # 🌱 Database seeding scripts for initial data
│   ├── .env.example        # Example environment variables for backend
│   ├── package.json        # Backend dependencies and scripts
│   └── ...
├── frontend/
│   ├── public/             # 📁 Static assets (index.html, favicon, etc.)
│   ├── src/
│   │   ├── components/     # ✨ Reusable UI components (Buttons, Forms, Cards)
│   │   ├── pages/          # 📄 Route-specific components/views (Login, Dashboard, SubmissionForm)
│   │   ├── services/       # 📡 API interaction logic (Fetching/Posting data)
│   │   ├── contexts/       # 🔄 Global state management (e.g., AuthContext)
│   │   ├── App.jsx         # ⚛️ Main React application component
│   │   ├── main.jsx        # Entry point for React app (using Vite)
│   │   └── ...
│   ├── .env.development    # Environment variables for development build
│   ├── .env.production     # Environment variables for production build
│   ├── package.json        # Frontend dependencies and scripts
│   └── vite.config.js      # Vite configuration
├── docs/
│   ├── DEVELOPER_GUIDE.md  # This document!
│   └── USER_GUIDE.md       # Guide for end-users
├── .gitignore              # Files/directories to ignore in Git
├── README.md               # Project overview
└── ...

4. 📦 Database Schema

The MySQL database schema is structured to meticulously store all necessary data for users, plant locations, the master material catalog, and the dynamic records of material submissions and subsequent third-party estimations.

Users Table

Manages user accounts, roles, and assignments.

Column	Type	Constraints	Description
user_id	UUID/INT	PRIMARY KEY	Unique identifier for each user.
username	VARCHAR(255)	UNIQUE, NOT NULL	User login name (must be unique).
password_hash	VARCHAR(255)	NOT NULL	Hashed password for secure storage.
role	ENUM/VARCHAR(50)	NOT NULL	User's role: 'admin', 'cataloguer', 'third_party'.
plant_id	UUID/INT	FOREIGN KEY (Plants), NULLABLE	The plant assigned to (NULL for Admin).
active	BOOLEAN	NOT NULL, DEFAULT TRUE	Indicates if the account is currently active.
expiry_date	DATE/TIMESTAMP	NULLABLE	Optional date when the account should expire.
created_at	TIMESTAMP	NOT NULL	Timestamp of record creation.
updated_at	TIMESTAMP	NOT NULL	Timestamp of the last update.
Plants Table

Details about the physical plants or warehouse locations.

Column	Type	Constraints	Description
plant_id	UUID/INT	PRIMARY KEY	Unique identifier for each plant.
plant_code	VARCHAR(10)	UNIQUE, NOT NULL	Short, unique code for the plant (e.g., 'FXTR').
plant_location	VARCHAR(255)	NOT NULL	Full location name (e.g., 'Trichy Facility').
created_at	TIMESTAMP	NOT NULL	Timestamp of record creation.
updated_at	TIMESTAMP	NOT NULL	Timestamp of the last update.
Materials Table

Master data for all trackable material/item codes. Managed by Admins.

Column	Type	Constraints	Description
material_id	UUID/INT	PRIMARY KEY	Unique identifier for each material item.
material_code	VARCHAR(255)	UNIQUE, NOT NULL	The primary unique code for the material.
plant_id	UUID/INT	FOREIGN KEY (Plants), NOT NULL	The plant where this material is located.
uom	VARCHAR(10)	NOT NULL	Unit of Measurement (e.g., 'PCS', 'KG', 'BOX').
category	VARCHAR(255)	NULLABLE	Optional category for grouping materials.
soh_quantity	INT	NOT NULL	Stock On Hand quantity currently expected.
created_at	TIMESTAMP	NOT NULL	Timestamp of record creation.
updated_at	TIMESTAMP	NOT NULL	Timestamp of the last update.
Material Submissions Table

Records the condition assessment submitted by a Cataloguer for a specific material at a specific time.

Column	Type	Constraints	Description
submission_id	UUID/INT	PRIMARY KEY	Unique identifier for each submission.
material_id	UUID/INT	FOREIGN KEY (Materials), NOT NULL	The material being catalogued.
cataloguer_user_id	UUID/INT	FOREIGN KEY (Users), NOT NULL	The user who performed the cataloguing.
submission_date	TIMESTAMP	NOT NULL	Date and time the submission was recorded.
good_count	INT	NOT NULL, DEFAULT 0	Quantity of items classified as 'Good'.
package_defect_count	INT	NOT NULL, DEFAULT 0	Quantity of items with package defects.
physical_defect_count	INT	NOT NULL, DEFAULT 0	Quantity of items with physical defects.
other_defect_count	INT	NOT NULL, DEFAULT 0	Quantity of items with other types of defects.
missing_count_calc	INT	NOT NULL	Calculated: SOH - (sum of all classified counts).
missing_remarks	TEXT	NULLABLE	Optional remarks about missing items.
status	VARCHAR(50)	NOT NULL, DEFAULT 'pending_cataloguer_review'	Current status of the submission (e.g., 'pending_third_party', 'completed', 'rejected').
created_at	TIMESTAMP	NOT NULL	Timestamp of record creation.
updated_at	TIMESTAMP	NOT NULL	Timestamp of the last update.

Note: While missing_count_calc is stored, it should be validated or recalculated server-side to maintain data integrity.

Material Submission Media Table

Links uploaded media (images/videos) to specific material submissions and defects.

Column	Type	Constraints	Description
media_id	UUID/INT	PRIMARY KEY	Unique identifier for each media file record.
submission_id	UUID/INT	FOREIGN KEY (Material Submissions), NOT NULL	The submission this media is part of.
media_type	VARCHAR(50)	NOT NULL	Classification of the media (e.g., 'good_item_photo', 'package_defect_video', 'physical_defect_photo').
file_path	VARCHAR(255)	NOT NULL	The path or URL where the file is stored.
reason	TEXT	NULLABLE	Applicable reason if the media documents a defect.
created_at	TIMESTAMP	NOT NULL	Timestamp of record creation.
Third Party Estimations Table

Stores the cost estimations provided by Third Party users for a specific submission.

Column	Type	Constraints	Description
estimation_id	UUID/INT	PRIMARY KEY	Unique identifier for each estimation record.
submission_id	UUID/INT	FOREIGN KEY (Material Submissions), NOT NULL	The submission being estimated.
third_party_user_id	UUID/INT	FOREIGN KEY (Users), NOT NULL	The Third Party user who provided the estimation.
good_price_per_uom	DECIMAL(10, 2)	NULLABLE	Estimated price per UOM for 'Good' items.
package_defect_price_per_uom	DECIMAL(10, 2)	NULLABLE	Estimated price per UOM for package defects.
physical_defect_price_per_uom	DECIMAL(10, 2)	NULLABLE	Estimated price per UOM for physical defects.
other_defect_price_per_uom	DECIMAL(10, 2)	NULLABLE	Estimated price per UOM for other defects.
total_good_value	DECIMAL(10, 2)	Calculated/NULLABLE	Calculated total value (price * count).
total_package_defect_value	DECIMAL(10, 2)	Calculated/NULLABLE	Calculated total value for package defects.
total_physical_defect_value	DECIMAL(10, 2)	Calculated/NULLABLE	Calculated total value for physical defects.
total_other_defect_value	DECIMAL(10, 2)	Calculated/NULLABLE	Calculated total value for other defects.
estimation_date	TIMESTAMP	NOT NULL	Date and time the estimation was provided.
created_at	TIMESTAMP	NOT NULL	Timestamp of record creation.
updated_at	TIMESTAMP	NOT NULL	Timestamp of the last update.

Note: Total values can be calculated server-side upon retrieval for accuracy, or stored if performance requires, ensuring they are updated when counts or prices change.

5. 🔑 Authentication & Authorization (JWT)

JWT is used to secure API endpoints and manage user sessions. This provides a stateless way for the backend to verify the identity and permissions of the user making a request.

Login Process

A user submits their username and password via a POST request to the /api/auth/login endpoint.

The backend verifies these credentials against the users table in the database.

If the credentials are valid and the user account is active, the backend generates a JWT. This token contains key information (claims) about the user: user_id, username, role, and importantly, their assigned plant_id (if applicable, null for Admin), along with an expiry timestamp (exp).

The generated JWT is returned to the frontend, typically within the response body.

The frontend is responsible for storing this token securely (e.g., in localStorage or sessionStorage) and including it in subsequent requests to protected API routes.

Token Structure (Claims)

The payload of the JWT contains the following standard and custom claims:

Generated json
{
  "user_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef", // Unique user identifier
  "username": "john.doe",
  "role": "admin" | "cataloguer" | "third_party", // User's assigned role
  "plant_id": "f9e8d7c6-b5a4-3210-fedc-ba9876543210" | null, // The plant assigned to the user (null for Admin)
  "exp": 1678886400 // Expiry timestamp (Unix epoch time)
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Json
IGNORE_WHEN_COPYING_END
Protected Routes

Any API endpoint that requires a user to be logged in and authorized will be considered a "protected route". Requests to these routes must include the JWT in the Authorization header in the format:

Generated code
Authorization: Bearer <your_json_web_token_here>
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
IGNORE_WHEN_COPYING_END

Backend middleware intercepts these requests, extracts the token, verifies its signature using the JWT_SECRET, checks if it's expired, and then makes the decoded claims available for authorization checks in the request handler.

Role and Plant Based Access Control

Authorization is implemented granularly based on the user's role and plant_id extracted from the JWT:

👑 Admin: Possesses the highest level of access. Can interact with all administrative endpoints (managing users, plants, master material data) and view data from all plants. They are not restricted by a specific plant_id in their token.

📦 Cataloguer: Access is limited to functionalities related to material submissions and viewing data (like the material master list) specifically tied to the plant_id assigned in their JWT. They cannot access Admin-level functions or view data from plants other than their own.

🤝 Third Party: Access is primarily focused on viewing specific material submissions (likely those awaiting estimation) and submitting estimations. Their access is restricted to submissions and potentially materials associated with the plant_id assigned in their token. They cannot access Admin functions or view data from other plants/unassigned submissions.

Middleware layers or checks within the controllers are responsible for enforcing these rules by comparing the plant_id claim in the user's token against the plant_id associated with the requested resource (e.g., a material record, a submission).

6. 🌐 API Documentation

This section provides a high-level overview of the main API endpoints grouped by functionality and role. A more detailed, interactive API documentation (e.g., using Swagger/OpenAPI generated from backend code annotations) is highly recommended for easier development and testing.

All API routes should be prefixed with /api.

Authentication Endpoints

POST /api/auth/login: Authenticate a user with username and password. Returns JWT on success.

Request Body: { username, password }

Response: { token: string, user: { user_id: string, username: string, role: string, plant_id: string | null } } (on success) or error.

POST /api/auth/logout: Invalidates the current user session (typically handled by frontend removing the token, but a backend endpoint could support server-side token invalidation/blocklisting).

👑 Admin Endpoints

(Require Admin role)

GET /api/admin/users: Retrieve a list of all user accounts.

POST /api/admin/users: Create a new user account.

Request Body: { username, password, role, plant_id?, active?, expiry_date? }

PUT /api/admin/users/:userId: Update details of an existing user account.

Request Body: { username?, password?, role?, plant_id?, active?, expiry_date? }

DELETE /api/admin/users/:userId: Delete a user account.

GET /api/admin/plants: Retrieve a list of all plants.

POST /api/admin/plants: Create a new plant record.

Request Body: { plant_code, plant_location }

PUT /api/admin/plants/:plantId: Update details of a plant record.

DELETE /api/admin/plants/:plantId: Delete a plant record.

GET /api/admin/materials: Retrieve the master list of all material codes across all plants.

POST /api/admin/materials: Add new material master data.

Request Body: { material_code, plant_id, uom, category?, soh_quantity }

PUT /api/admin/materials/:materialId: Update material master data.

DELETE /api/admin/materials/:materialId: Delete material master data.

GET /api/admin/submissions: Retrieve all material submissions from all plants.

GET /api/admin/estimations: Retrieve all third-party estimations from all submissions.

📦 Cataloguer/Material Endpoints

(Require Cataloguer role, access restricted by plant_id)

GET /api/materials/by-plant: Get materials (master data) assigned to the logged-in cataloguer's plant.

Backend should automatically filter based on user's plant_id from token.

POST /api/submissions: Create a new material submission. Handles submission details and associated media uploads.

Request Body: multipart/form-data containing { material_id, good_count, package_defect_count, physical_defect_count, other_defect_count, missing_remarks?, mediaFiles: File[] }

Backend validates material_id belongs to the user's plant, calculates missing_count_calc, and associates cataloguer_user_id from token.

GET /api/submissions/by-plant: Get submissions made for the logged-in cataloguer's plant.

Backend filters based on user's plant_id from token.

GET /api/submissions/:submissionId: Get detailed information for a specific submission.

Backend verifies the submission belongs to the user's assigned plant.

GET /api/submissions/mine: Get all submissions specifically created by the logged-in cataloguer user.

🤝 Third Party Endpoints

(Require Third Party role, access restricted by plant_id)

GET /api/submissions/for-estimation: Get material submissions that are currently pending estimation and are associated with the third party's assigned plant(s).

Backend filters based on user's plant_id from token and submission status.

POST /api/estimations: Submit a new estimation for a specific material submission.

Request Body: { submission_id, good_price_per_uom?, package_defect_price_per_uom?, physical_defect_price_per_uom?, other_defect_price_per_uom? }

Backend validates submission_id is pending estimation and belongs to the user's assigned plant. Associates third_party_user_id from token.

GET /api/estimations/mine: Get all estimations submitted by the logged-in third party user.

Common Endpoints

(Accessible to multiple roles, data visibility may be restricted)

GET /api/plants: Get a list of plants. (Might return all for Admin, or only assigned for others).

GET /api/materials/:materialId: Get details for a single material master record. (Access might be restricted if not Admin and material is not in assigned plant).

GET /api/media/:filename: Serves uploaded media files. Important: This endpoint must have strong access control to ensure only users authorized to view the associated submission can access the file.

⬆️ File Uploads

File uploads for material submission media should be handled using the multipart/form-data content type. Libraries like multer for Express are commonly used on the backend to parse the incoming file data and store it (e.g., on the local filesystem or a cloud storage service). The file paths stored in the database should reference these stored files. The /api/media/:filename endpoint is then responsible for retrieving and serving these files, enforcing the necessary authorization checks before responding.

7. 🛠️ Setting up Development Environment

Getting your local development environment ready is straightforward.

Prerequisites

Node.js (LTS version recommended) and a package manager (npm or yarn) installed.

A running MySQL server instance (local or remote, accessible from your machine).

Git client installed.

Installation & Setup

Clone the repository: Open your terminal or command prompt and run:

Generated bash
git clone <repository_url>
cd stock_inventory_management # Navigate into the project directory
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Bash
IGNORE_WHEN_COPYING_END

Set up Backend:

Navigate to the backend directory: cd backend

Install dependencies: npm install or yarn install

Configure Environment: Create a .env file in the backend root. Copy the contents from the provided .env.example and fill in your specific configurations (especially database credentials and JWT_SECRET).

Database Setup: Ensure your MySQL server is running. Create the database specified in your backend/.env (DB_NAME). Run database migrations to create the necessary tables (the exact command depends on your ORM/migration tool, often npm run migrate or similar).

Seed Initial Data: Run seed scripts (if available) to populate initial data like the default admin user, some plants, or sample materials for testing (e.g., npm run seed or similar).

Set up Frontend:

Navigate back to the project root, then into the frontend directory: cd ../frontend

Install dependencies: npm install or yarn install

Configure Environment: Create a .env file in the frontend root based on the provided .env.example. Configure variables like the backend API URL (VITE_API_URL). Remember that for Vite, environment variables accessible in the browser must be prefixed with VITE_.

Environment Variables

Crucially, configuration secrets and environment-specific values are managed via .env files. These files should never be committed to version control. Always use the provided .env.example as a template.

Key Backend (backend/.env) Variables:

Generated dotenv
# Database connection details (MySQL)
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=your_mysql_password # <-- !! CHANGE THIS !! Your actual DB password
DB_NAME=stock_inventory_db # <-- !! CHANGE THIS !! Your database name
DB_PORT=3306 # Default MySQL port

# Backend Server Settings
PORT=5001 # Port the backend API server will run on

# Authentication
JWT_SECRET=your_super_secret_jwt_token # <-- !! CHANGE THIS !! Must be a strong, unique, random value.

# File Storage
MEDIA_BASE_URL=http://localhost:5001/media # Base URL to access uploaded media files (match backend port)
FILE_UPLOAD_DESTINATION=./uploads/ # Local path for storing uploads (relative to backend root)

# CORS Settings
CORS_ORIGIN=http://localhost:5173 # Frontend URL allowed to access the API (for development)
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Dotenv
IGNORE_WHEN_COPYING_END

Key Frontend (frontend/.env) Variables (for Vite):

Generated dotenv
# API Configuration
# Base URL for the backend API - Ensure this matches your backend's PORT and API path
VITE_API_URL=http://localhost:5001/api
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Dotenv
IGNORE_WHEN_COPYING_END
Running the Application

Start Backend: In the backend directory, run the command to start the Node.js server.

Generated bash
cd backend
node server.js # Or use the script defined in package.json, e.g., npm start, npm run dev
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Bash
IGNORE_WHEN_COPYING_END

The backend API should now be running, listening on the port specified in your backend/.env.

Start Frontend (Vite): In the frontend directory, start the Vite development server.

Generated bash
cd frontend
npm run dev # This is the standard Vite command
# Or if using yarn: yarn dev
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Bash
IGNORE_WHEN_COPYING_END

The frontend application will typically open in your browser automatically, usually at http://localhost:5173.

8. ✅ Testing

(This section needs to be filled based on the project's actual testing implementation. Describe the types of tests and how to run them.)

The project should incorporate various levels of testing to ensure reliability and prevent regressions:

Unit Tests: Testing individual functions, components, or modules in isolation.

Integration Tests: Verifying that different parts of the application interact correctly (e.g., a service talking to a model, a controller using a service).

End-to-End (E2E) Tests: Simulating real user scenarios flowing through the entire application stack (frontend interacting with backend, backend with database).

Frameworks Used:

(Example: Backend: Jest/Mocha/Chai)

(Example: Frontend: Jest/React Testing Library)

(Example: E2E: Cypress/Playwright)

How to Run Tests:

(Example: Run all tests: npm test)

(Example: Run backend tests: cd backend && npm test)

(Example: Run frontend tests: cd frontend && npm test)

Developers are encouraged to write tests for new features and bug fixes.

9. 🚀 Deployment Considerations

(This section needs to be elaborated based on the chosen deployment strategy and infrastructure.)

Deploying the application to a production environment requires careful consideration:

Production Environment Variables: Securely manage production secrets (database credentials, JWT_SECRET, API keys) using environment variables provided by your hosting platform (e.g., Heroku Config Vars, AWS Systems Manager Parameter Store, Docker Secrets). Do not hardcode them or include a production .env file in your build.

Database: Set up a production-grade MySQL database instance. Implement regular backups and consider strategies for scaling and high availability. Ensure proper user permissions are configured.

File Storage: Replace the local filesystem storage for media uploads with a scalable and reliable cloud storage solution like AWS S3, Google Cloud Storage, or similar. Update the backend's file upload and serving logic accordingly.

Process Management: Use a process manager like PM2 or container orchestration (Docker, Kubernetes) to keep the Node.js backend application running reliably, handle restarts on crashes, and manage logs.

HTTPS: Always serve the application over HTTPS in production to encrypt data in transit, especially sensitive login credentials and inventory data. Use services like Let's Encrypt, or certificates provided by your cloud provider.

Load Balancing & Scaling: Use a load balancer to distribute incoming traffic across multiple instances of the backend application to handle increased load and improve availability.

CI/CD: Set up Continuous Integration and Continuous Deployment pipelines to automate building, testing, and deploying changes, ensuring a smooth and reliable release process.

10. 💡 Troubleshooting

Encountering issues is a normal part of development. Here are some common problems and debugging tips:

Database Connection Errors:

Double-check all database configuration values in your backend/.env (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME).

Ensure your MySQL server is running and accessible from where your backend is running (check firewalls).

Verify that the user specified has the correct permissions for the database.

Check backend logs for specific database driver error messages.

JWT Authentication Failed / 401 Unauthorized:

Verify that the JWT_SECRET in your backend/.env exactly matches the secret used when generating/verifying tokens.

Check if the frontend is correctly including the Authorization: Bearer <token> header in requests to protected routes.

Ensure the token has not expired.

Check backend authentication middleware logs to see why the token verification failed.

CORS Issues:

Ensure the CORS_ORIGIN variable in your backend/.env correctly specifies the protocol (http:// or https://), hostname (localhost), and port (:5173) of your frontend development server.

Make sure the backend's CORS middleware is correctly configured and applied to the routes.

File Uploads Not Working or Files Not Visible:

Verify that the FILE_UPLOAD_DESTINATION path in your backend/.env is correct and exists on the server filesystem.

Ensure the backend process has necessary write permissions for the FILE_UPLOAD_DESTINATION directory.

Check the backend logs for file upload errors from the middleware (e.g., Multer).

Ensure the /api/media/:filename route is correctly configured to serve static files from the upload directory and that its access control logic is correct.

Verify the MEDIA_BASE_URL in the backend is correct for accessing the served files from the frontend.

For more specific issues, inspect error messages in the browser console (frontend) and the terminal where your backend server is running. Utilize debugging tools provided by your IDE and browser. If you get stuck, consult the codebase, open an issue on the project repository with details of the problem, or reach out to fellow contributors.

Happy Coding! 😊

