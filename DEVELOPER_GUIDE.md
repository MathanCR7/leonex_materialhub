## Stock and Inventory Management - Developer Guide

This document provides in-depth technical details for developers working on the Stock and Inventory Management project.

## 📖 Table of Contents

1.  [Introduction](#1-introduction)
2.  [Architecture Overview](#2-architecture-overview)
3.  [Project Structure](#3-project-structure)
4.  [Database Schema](#4-database-schema)
    *   [Users Table](#users-table)
    *   [Plants Table](#plants-table)
    *   [Materials Table](#materials-table)
    *   [Material Submissions Table](#material-submissions-table)
    *   [Material Submission Media Table](#material-submission-media-table)
    *   [Third Party Estimations Table](#third-party-estimations-table)
5.  [Authentication & Authorization (JWT)](#5-authentication--authorization-jwt)
    *   [Login Process](#login-process)
    *   [Token Structure (Claims)](#token-structure-claims)
    *   [Protected Routes](#protected-routes)
    *   [Role and Plant Based Access Control](#role-and-plant-based-access-control)
6.  [API Documentation](#6-api-documentation)
    *   [Authentication Endpoints](#authentication-endpoints)
    *   [Admin Endpoints](#admin-endpoints)
    *   [Cataloguer/Material Endpoints](#cataloguermaterial-endpoints)
    *   [Third Party Endpoints](#third-party-endpoints)
    *   [Common Endpoints](#common-endpoints)
    *   [File Uploads](#file-uploads)
7.  [Setting up Development Environment](#7-setting-up-development-environment)
    *   [Prerequisites](#prerequisites)
    *   [Installation & Setup](#installation--setup)
    *   [Environment Variables](#environment-variables)
    *   [Database Setup](#database-setup)
    *   [Running the Application](#running-the-application)
8.  [Testing](#8-testing)
9.  [Deployment Considerations](#9-deployment-considerations)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Introduction

The Stock and Inventory Management is a web application designed to facilitate the structured cataloguing and assessment of material inventory based on defined conditions and material codes. This guide provides the technical foundation necessary to understand, modify, and extend the system.

## 2. Architecture Overview

The project follows a client-server architecture, likely implemented as a Single Page Application (SPA) frontend communicating with a RESTful API backend.

*   **Frontend:** The user interface, built using a modern JavaScript framework, handles user interactions, data presentation, and communication with the backend API.
*   **Backend (API):** Handles business logic, data storage (database interaction), user authentication and authorization, file uploads, and serves data to the frontend via RESTful endpoints.
*   **Database:** Stores all application data, including user information, plant details, material master data, and the dynamic submission and estimation records.
*   **File Storage:** A system for storing uploaded images and videos associated with material submissions.

## 3. Project Structure

(This is an example structure, adjust based on the actual codebase)

```markdown
stock_inventory_management/
├── backend/
│ ├── src/
│ │ ├── controllers/ # Handle incoming requests, call services
│ │ ├── services/ # Business logic
│ │ ├── models/ # Database models/schemas
│ │ ├── routes/ # API routes definition
│ │ ├── middleware/ # Authentication, authorization, error handling
│ │ ├── config/ # Configuration files (DB, JWT, etc.)
│ │ └── app.js # Entry point
│ ├── migrations/ # Database migration scripts
│ ├── seeds/ # Database seeding scripts
│ ├── .env.example
│ ├── package.json
│ └── ...
├── frontend/
│ ├── public/ # Static assets
│ ├── src/
│ │ ├── components/ # Reusable UI components
│ │ ├── pages/ # Route-specific components/views
│ │ ├── services/ # API interaction logic
│ │ ├── contexts/ # State management (if applicable)
│ │ ├── App.js # Main application component
│ │ ├── index.js # Entry point
│ │ └── ...
│ ├── .env.development
│ ├── .env.production
│ ├── package.json
│ └── ...
├── docs/
│ ├── DEVELOPER_GUIDE.md # This file
│ └── USER_GUIDE.md
├── .gitignore
├── README.md
└── ...

4. Database Schema

The database schema is designed to store user information, plant details, material master data, and the dynamic submission and estimation records.

Users Table

Stores user accounts and their roles and assignments.

Column	Type	Constraints	Description
user_id	UUID/INT	PRIMARY KEY	Unique user identifier
username	VARCHAR	UNIQUE, NOT NULL	User login name
password_hash	VARCHAR	NOT NULL	Hashed password
role	ENUM/VARCHAR	NOT NULL	User role ('admin', 'cataloguer', 'third_party')
plant_id	UUID/INT	FOREIGN KEY (Plants), NULLABLE	Plant assigned to (NULL for Admin)
active	BOOLEAN	NOT NULL, DEFAULT TRUE	Account active status
expiry_date	DATE/TIMESTAMP	NULLABLE	Account expiry date
created_at	TIMESTAMP	NOT NULL	Record creation timestamp
updated_at	TIMESTAMP	NOT NULL	Last update timestamp
Plants Table

Stores information about the physical plants.

Column	Type	Constraints	Description
plant_id	UUID/INT	PRIMARY KEY	Unique plant identifier
plant_code	VARCHAR(10)	UNIQUE, NOT NULL	Short plant code (e.g., 'FXTR')
plant_location	VARCHAR	NOT NULL	Full plant location (e.g., 'Trichy')
created_at	TIMESTAMP	NOT NULL	Record creation timestamp
updated_at	TIMESTAMP	NOT NULL	Last update timestamp
Materials Table

Stores the master data for material codes. This is likely populated by the Admin.

Column	Type	Constraints	Description
material_id	UUID/INT	PRIMARY KEY	Unique material identifier
material_code	VARCHAR	UNIQUE, NOT NULL	The unique material code
plant_id	UUID/INT	FOREIGN KEY (Plants), NOT NULL	Plant where this material code exists
uom	VARCHAR(10)	NOT NULL	Unit of Measurement (e.g., 'NO')
category	VARCHAR	NULLABLE	Material category (e.g., 'Snacks')
soh_quantity	INT	NOT NULL	Stock On Hand quantity
created_at	TIMESTAMP	NOT NULL	Record creation timestamp
updated_at	TIMESTAMP	NOT NULL	Last update timestamp
Material Submissions Table

Stores the cataloguer's submission for a specific material at a specific time.

Column	Type	Constraints	Description
submission_id	UUID/INT	PRIMARY KEY	Unique submission identifier
material_id	UUID/INT	FOREIGN KEY (Materials), NOT NULL	The material being catalogued
cataloguer_user_id	UUID/INT	FOREIGN KEY (Users), NOT NULL	The cataloguer who made the submission
submission_date	TIMESTAMP	NOT NULL	Date and time of submission
good_count	INT	NOT NULL, DEFAULT 0	Count of good items submitted
package_defect_count	INT	NOT NULL, DEFAULT 0	Count of package defect items
physical_defect_count	INT	NOT NULL, DEFAULT 0	Count of physical defect items
other_defect_count	INT	NOT NULL, DEFAULT 0	Count of other defect items
missing_count_calc	INT	NOT NULL	Calculated: SOH - (all defect counts)
missing_remarks	TEXT	NULLABLE	Remarks for missing items
status	VARCHAR	NOT NULL, DEFAULT 'pending_cataloguer_review'	Submission status (e.g., 'pending_third_party', 'completed')
created_at	TIMESTAMP	NOT NULL	Record creation timestamp
updated_at	TIMESTAMP	NOT NULL	Last update timestamp

Note: The missing_count_calc should ideally be a calculated field or derived logic, but storing it can simplify queries if consistency is ensured on write.

Material Submission Media Table

Stores references to uploaded files for each submission.

Column	Type	Constraints	Description
media_id	UUID/INT	PRIMARY KEY	Unique media identifier
submission_id	UUID/INT	FOREIGN KEY (Material Submissions), NOT NULL	The submission this media belongs to
media_type	VARCHAR	NOT NULL	Type of media ('good_spec', 'good_packing', ..., 'package_defect', 'physical_defect', 'other_defect', 'good_video')
file_path	VARCHAR	NOT NULL	Path or URL to the stored file
reason	TEXT	NULLABLE	Reason for defect (if applicable)
created_at	TIMESTAMP	NOT NULL	Record creation timestamp
Third Party Estimations Table

Stores the cost estimations provided by third parties for a specific submission.

Column	Type	Constraints	Description
estimation_id	UUID/INT	PRIMARY KEY	Unique estimation identifier
submission_id	UUID/INT	FOREIGN KEY (Material Submissions), NOT NULL	The submission being estimated
third_party_user_id	UUID/INT	FOREIGN KEY (Users), NOT NULL	The third party user who estimated
good_price_per_uom	DECIMAL	NULLABLE	Estimated price per UOM for good items
package_defect_price_per_uom	DECIMAL	NULLABLE	Estimated price per UOM for package defects
physical_defect_price_per_uom	DECIMAL	NULLABLE	Estimated price per UOM for physical defects
other_defect_price_per_uom	DECIMAL	NULLABLE	Estimated price per UOM for other defects
total_good_value	DECIMAL	Calculated/NULLABLE	good_price * good_count
total_package_defect_value	DECIMAL	Calculated/NULLABLE	package_defect_price * package_defect_count
total_physical_defect_value	DECIMAL	Calculated/NULLABLE	physical_defect_price * physical_defect_count
total_other_defect_value	DECIMAL	Calculated/NULLABLE	other_defect_price * other_defect_count
estimation_date	TIMESTAMP	NOT NULL	Date and time of estimation
created_at	TIMESTAMP	NOT NULL	Record creation timestamp
updated_at	TIMESTAMP	NOT NULL	Last update timestamp

Note: Total values can be calculated on retrieval or stored for performance.

5. Authentication & Authorization (JWT)

The application uses JSON Web Tokens (JWT) for managing user sessions and access control.

Login Process

User sends POST request to /api/auth/login with username and password.

Backend verifies credentials against the users table.

If valid and active, backend generates a JWT containing claims:

user_id

username

role (e.g., 'admin', 'cataloguer', 'third_party')

plant_id (if applicable, NULL for Admin)

exp (expiry timestamp)

The token is returned to the frontend, usually in the response body or an Authorization header.

The frontend stores the token (e.g., in localStorage or sessionStorage).

Token Structure (Claims)

The JWT payload contains claims used for identifying the user and their permissions.

Generated json
{
  "user_id": "...",
  "username": "...",
  "role": "admin" | "cataloguer" | "third_party",
  "plant_id": "..." | null, // Null for admin
  "exp": 1234567890 // Expiry timestamp
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Json
IGNORE_WHEN_COPYING_END
Protected Routes

API routes that require authentication will expect a valid JWT in the Authorization header, typically in the format Bearer <token>.

Generated code
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
IGNORE_WHEN_COPYING_END

Middleware on the backend will intercept requests to protected routes, verify the token's signature and expiry, and extract the user claims to determine access rights.

Role and Plant Based Access Control

Beyond basic authentication, the application implements authorization checks based on the user's role and plant_id from the JWT:

Admin: Has access to all data and administrative endpoints (user management, plant management, material master data management). Not restricted by plant_id.

Cataloguer: Limited to material submissions and viewing data related to the plant_id assigned in their token. Cannot access Admin endpoints or data from other plants.

Third Party: Limited to viewing specific material submissions (likely those pending estimation) related to the plant_id assigned in their token, and submitting estimations. Cannot access Admin endpoints or data from other plants/submissions they are not assigned to.

Middleware or controllers will check the decoded JWT claims against the requested resource (e.g., checking if the requested material's plant_id matches the user's plant_id).

6. API Documentation

This section outlines the main API endpoints. Full API documentation (e.g., using Swagger/OpenAPI) is recommended for a large project.

All endpoints should be prefixed with /api.

Authentication Endpoints

POST /api/auth/login: Authenticate a user.

Request Body: { username, password }

Response: { token: "...", user: { user_id, username, role, plant_id } } or error.

POST /api/auth/logout: Invalidate the current token (if stateless, this might just be a frontend action, but a backend endpoint could be used for token blocklisting if needed).

Admin Endpoints

(Require Admin role)

GET /api/admin/users: Get a list of all users.

POST /api/admin/users: Create a new user.

Request Body: { username, password, role, plant_id, active, expiry_date }

PUT /api/admin/users/:userId: Update an existing user.

Request Body: { username?, password?, role?, plant_id?, active?, expiry_date? }

DELETE /api/admin/users/:userId: Delete a user.

GET /api/admin/plants: Get a list of all plants.

POST /api/admin/plants: Create a new plant.

Request Body: { plant_code, plant_location }

PUT /api/admin/plants/:plantId: Update a plant.

DELETE /api/admin/plants/:plantId: Delete a plant.

GET /api/admin/materials: Get a list of all materials (master data).

POST /api/admin/materials: Add new material master data.

Request Body: { material_code, plant_id, uom, category, soh_quantity }

PUT /api/admin/materials/:materialId: Update material master data.

DELETE /api/admin/materials/:materialId: Delete material master data.

GET /api/admin/submissions: Get all material submissions from all plants.

GET /api/admin/estimations: Get all third-party estimations.

Cataloguer/Material Endpoints

(Require Cataloguer role, restricted by plant_id)

GET /api/materials/by-plant: Get materials (master data) assigned to the user's plant.

Query Params: ?plantId=<user_plant_id> (backend verifies against token)

POST /api/submissions: Create a new material submission.

Request Body: { material_id, good_count, package_defect_count, ..., missing_remarks, media: [...] }

Requires file uploads for media.

Backend calculates missing_count_calc.

Backend sets cataloguer_user_id from token and verifies material_id belongs to user's plant.

GET /api/submissions/by-plant: Get submissions made for the user's plant.

Query Params: ?plantId=<user_plant_id> (backend verifies)

GET /api/submissions/:submissionId: Get details for a specific submission.

Backend verifies submissionId belongs to user's plant.

GET /api/submissions/mine: Get submissions made by the logged-in cataloguer user.

Third Party Endpoints

(Require Third_Party role, restricted by plant_id)

GET /api/submissions/for-estimation: Get submissions pending estimation for the user's assigned plants.

Query Params: ?plantId=<user_plant_id> (backend verifies)

POST /api/estimations: Submit a new estimation for a submission.

Request Body: { submission_id, good_price_per_uom, ...other_defect_price_per_uom }

Backend verifies submission_id is pending estimation and belongs to user's assigned plant.

Backend sets third_party_user_id from token.

GET /api/estimations/mine: Get estimations made by the logged-in third party user.

Common Endpoints

(Might be accessible to multiple roles with potentially different data based on role/plant restrictions)

GET /api/plants: Get a list of plants (might be filtered based on user role/assignment).

GET /api/materials/:materialId: Get details for a specific material (master data).

Access might be restricted if not Admin.

GET /api/media/:filename: Serve uploaded media files.

Requires appropriate security checks to ensure only authorized users can access files (e.g., checking if the user is linked to the submission the file belongs to).

File Uploads

File uploads for media associated with submissions should use multipart/form-data. The backend should use a library like multer (for Express) to handle file parsing and storage. File paths stored in the database should be relative paths, and the /api/media/:filename endpoint should be configured to serve files from the designated upload directory, implementing access control.

7. Setting up Development Environment
Prerequisites

Node.js and npm or yarn

MySQL server instance

Git client

Installation & Setup

Clone the repository: git clone <repository_url>

Navigate to the project root: cd stock_inventory_management

Set up Backend:

cd backend

npm install or yarn install

Create .env from .env.example and configure.

Run migrations: npm run migrate (command may vary)

Run seeds: npm run seed (command may vary)

Set up Frontend:

cd ../frontend

npm install or yarn install

Create .env from .env.example and configure.

Environment Variables

Refer to the .env.example files in both backend and frontend directories. Do not commit actual .env files.

Key backend variables:

DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT: MySQL connection details.

PORT: Backend server port.

JWT_SECRET: Secret key for signing JWTs (must be strong and unique).

MEDIA_BASE_URL: Base URL to access uploaded media.

FILE_UPLOAD_DESTINATION: Local path for storing uploads.

CORS_ORIGIN: Frontend URL for CORS.

Key frontend variables (Vite):

VITE_API_URL: URL of the backend API.

Database Setup

Ensure your MySQL server is running. Create the database specified in your backend/.env (DB_NAME). Run the migration scripts to create the necessary tables as defined in the schema section. Running seed scripts will populate initial data like the default admin user and potentially some initial plants/materials for testing.

Running the Application

Start Backend: cd backend && node server.js (or npm start, npm run dev as configured)

Start Frontend: cd frontend && npm run dev (for Vite development server)

The application should now be accessible in your browser at the frontend development URL (typically http://localhost:5173).

8. Testing

(This section needs to be filled based on the project's testing strategy)

Unit Tests: Tests for individual functions or components.

Integration Tests: Tests verifying the interaction between different parts of the application (e.g., frontend component interacting with API, API endpoint interacting with database).

End-to-End (E2E) Tests: Tests simulating user workflows through the entire application.

Specify the testing frameworks used (e.g., Jest, Mocha, React Testing Library, Cypress) and how to run the tests (e.g., npm test).

9. Deployment Considerations

(This section needs to be filled based on deployment strategy)

Production Environment Variables: How to manage environment variables in production (e.g., using hosting provider configurations).

Database: Production database setup, backups, scaling.

File Storage: Using a scalable cloud storage solution (AWS S3, Google Cloud Storage) instead of local filesystem in production.

Process Management: Using tools like PM2 for Node.js application process management.

HTTPS: Ensuring the application is served over HTTPS.

Load Balancing & Scaling: Strategies for handling increased traffic.

CI/CD: Setting up Continuous Integration/Continuous Deployment pipelines.

10. Troubleshooting

Database Connection Issues: Double-check .env credentials (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME). Ensure the MySQL server is running and accessible from where the backend is running. Check firewall rules.

JWT Authentication Failed: Verify the JWT_SECRET is identical in the backend and frontend. Check if the token is being sent correctly in the Authorization: Bearer <token> header. Ensure the token hasn't expired.

CORS Issues: Make sure the CORS_ORIGIN in the backend .env correctly points to the frontend's URL, including the protocol (http/https) and port.

File Uploads Not Working/Files Not Visible: Verify the FILE_UPLOAD_DESTINATION path exists and the backend process has write permissions. Ensure the MEDIA_BASE_URL is correctly configured and the route serving media files (/api/media/:filename) is set up correctly and accessible.

For further help, consult the code, open an issue on the repository, or refer to specific error messages in the console logs (frontend) and terminal output (backend).

Generated code
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
IGNORE_WHEN_COPYING_END
