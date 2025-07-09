# Leonex Material Hub - Developer Guide

This document provides in-depth technical details for developers working on the Leonex Material Hub project.

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

The Leonex Material Hub is a web application designed to facilitate the structured cataloguing and assessment of material inventory based on defined conditions and material codes. This guide provides the technical foundation necessary to understand, modify, and extend the system.

## 2. Architecture Overview

The project follows a client-server architecture, likely implemented as a Single Page Application (SPA) frontend communicating with a RESTful API backend.

*   **Frontend:** The user interface, built using a modern JavaScript framework, handles user interactions, data presentation, and communication with the backend API.
*   **Backend (API):** Handles business logic, data storage (database interaction), user authentication and authorization, file uploads, and serves data to the frontend via RESTful endpoints.
*   **Database:** Stores all application data, including user information, plant details, material master data, and the dynamic submission and estimation records.
*   **File Storage:** A system for storing uploaded images and videos associated with material submissions.

## 3. Project Structure

(This is an example structure, adjust based on the actual codebase)
Use code with caution.
Markdown
leonex_materialhub/
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
Generated code
## 4. Database Schema

The database schema is designed to store user information, plant details, material master data, and the dynamic submission and estimation records.

### Users Table

Stores user accounts and their roles and assignments.

| Column          | Type        | Constraints           | Description                         |
| :-------------- | :---------- | :-------------------- | :---------------------------------- |
| `user_id`       | UUID/INT    | PRIMARY KEY           | Unique user identifier              |
| `username`      | VARCHAR     | UNIQUE, NOT NULL      | User login name                     |
| `password_hash` | VARCHAR     | NOT NULL              | Hashed password                     |
| `role`          | ENUM/VARCHAR| NOT NULL              | User role ('admin', 'cataloguer', 'third_party') |
| `plant_id`      | UUID/INT    | FOREIGN KEY (Plants), NULLABLE | Plant assigned to (NULL for Admin) |
| `active`        | BOOLEAN     | NOT NULL, DEFAULT TRUE | Account active status               |
| `expiry_date`   | DATE/TIMESTAMP | NULLABLE              | Account expiry date                 |
| `created_at`    | TIMESTAMP   | NOT NULL              | Record creation timestamp           |
| `updated_at`    | TIMESTAMP   | NOT NULL              | Last update timestamp               |

### Plants Table

Stores information about the physical plants.

| Column          | Type        | Constraints           | Description                         |
| :-------------- | :---------- | :-------------------- | :---------------------------------- |
| `plant_id`      | UUID/INT    | PRIMARY KEY           | Unique plant identifier             |
| `plant_code`    | VARCHAR(10) | UNIQUE, NOT NULL      | Short plant code (e.g., 'FXTR')     |
| `plant_location`| VARCHAR     | NOT NULL              | Full plant location (e.g., 'Trichy')|
| `created_at`    | TIMESTAMP   | NOT NULL              | Record creation timestamp           |
| `updated_at`    | TIMESTAMP   | NOT NULL              | Last update timestamp               |

### Materials Table

Stores the master data for material codes. This is likely populated by the Admin.

| Column          | Type        | Constraints           | Description                         |
| :-------------- | :---------- | :-------------------- | :---------------------------------- |
| `material_id`   | UUID/INT    | PRIMARY KEY           | Unique material identifier          |
| `material_code` | VARCHAR     | UNIQUE, NOT NULL      | The unique material code            |
| `plant_id`      | UUID/INT    | FOREIGN KEY (Plants), NOT NULL | Plant where this material code exists |
| `uom`           | VARCHAR(10) | NOT NULL              | Unit of Measurement (e.g., 'NO')    |
| `category`      | VARCHAR     | NULLABLE              | Material category (e.g., 'Snacks')  |
| `soh_quantity`  | INT         | NOT NULL              | Stock On Hand quantity              |
| `created_at`    | TIMESTAMP   | NOT NULL              | Record creation timestamp           |
| `updated_at`    | TIMESTAMP   | NOT NULL              | Last update timestamp               |

### Material Submissions Table

Stores the cataloguer's submission for a specific material at a specific time.

| Column                    | Type        | Constraints           | Description                         |
| :------------------------ | :---------- | :-------------------- | :---------------------------------- |
| `submission_id`           | UUID/INT    | PRIMARY KEY           | Unique submission identifier        |
| `material_id`             | UUID/INT    | FOREIGN KEY (Materials), NOT NULL | The material being catalogued     |
| `cataloguer_user_id`      | UUID/INT    | FOREIGN KEY (Users), NOT NULL | The cataloguer who made the submission |
| `submission_date`         | TIMESTAMP   | NOT NULL              | Date and time of submission         |
| `good_count`              | INT         | NOT NULL, DEFAULT 0   | Count of good items submitted     |
| `package_defect_count`    | INT         | NOT NULL, DEFAULT 0   | Count of package defect items     |
| `physical_defect_count`   | INT         | NOT NULL, DEFAULT 0   | Count of physical defect items    |
| `other_defect_count`      | INT         | NOT NULL, DEFAULT 0   | Count of other defect items       |
| `missing_count_calc`      | INT         | NOT NULL              | Calculated: SOH - (all defect counts) |
| `missing_remarks`         | TEXT        | NULLABLE              | Remarks for missing items         |
| `status`                  | VARCHAR     | NOT NULL, DEFAULT 'pending_cataloguer_review' | Submission status (e.g., 'pending_third_party', 'completed') |
| `created_at`              | TIMESTAMP   | NOT NULL              | Record creation timestamp           |
| `updated_at`              | TIMESTAMP   | NOT NULL              | Last update timestamp               |

*Note: The `missing_count_calc` should ideally be a calculated field or derived logic, but storing it can simplify queries if consistency is ensured on write.*

### Material Submission Media Table

Stores references to uploaded files for each submission.

| Column        | Type        | Constraints           | Description                         |
| :------------ | :---------- | :-------------------- | :---------------------------------- |
| `media_id`    | UUID/INT    | PRIMARY KEY           | Unique media identifier             |
| `submission_id` | UUID/INT    | FOREIGN KEY (Material Submissions), NOT NULL | The submission this media belongs to |
| `media_type`  | VARCHAR     | NOT NULL              | Type of media ('good_spec', 'good_packing', ..., 'package_defect', 'physical_defect', 'other_defect', 'good_video') |
| `file_path`   | VARCHAR     | NOT NULL              | Path or URL to the stored file      |
| `reason`      | TEXT        | NULLABLE              | Reason for defect (if applicable) |
| `created_at`  | TIMESTAMP   | NOT NULL              | Record creation timestamp           |

### Third Party Estimations Table

Stores the cost estimations provided by third parties for a specific submission.

| Column                  | Type        | Constraints           | Description                         |
| :---------------------- | :---------- | :-------------------- | :---------------------------------- |
| `estimation_id`         | UUID/INT    | PRIMARY KEY           | Unique estimation identifier        |
| `submission_id`         | UUID/INT    | FOREIGN KEY (Material Submissions), NOT NULL | The submission being estimated      |
| `third_party_user_id`   | UUID/INT    | FOREIGN KEY (Users), NOT NULL | The third party user who estimated |
| `good_price_per_uom`    | DECIMAL     | NULLABLE              | Estimated price per UOM for good items |
| `package_defect_price_per_uom` | DECIMAL| NULLABLE              | Estimated price per UOM for package defects |
| `physical_defect_price_per_uom`| DECIMAL| NULLABLE              | Estimated price per UOM for physical defects |
| `other_defect_price_per_uom` | DECIMAL| NULLABLE              | Estimated price per UOM for other defects |
| `total_good_value`      | DECIMAL     | Calculated/NULLABLE   | good_price * good_count           |
| `total_package_defect_value`| DECIMAL| Calculated/NULLABLE   | package_defect_price * package_defect_count |
| `total_physical_defect_value`| DECIMAL| Calculated/NULLABLE | physical_defect_price * physical_defect_count |
| `total_other_defect_value`| DECIMAL  | Calculated/NULLABLE   | other_defect_price * other_defect_count |
| `estimation_date`       | TIMESTAMP   | NOT NULL              | Date and time of estimation         |
| `created_at`            | TIMESTAMP   | NOT NULL              | Record creation timestamp           |
| `updated_at`            | TIMESTAMP   | NOT NULL              | Last update timestamp               |

*Note: Total values can be calculated on retrieval or stored for performance.*

## 5. Authentication & Authorization (JWT)

The application uses JSON Web Tokens (JWT) for managing user sessions and access control.

### Login Process

1.  User sends `POST` request to `/api/auth/login` with `username` and `password`.
2.  Backend verifies credentials against the `users` table.
3.  If valid and `active`, backend generates a JWT containing claims:
    *   `user_id`
    *   `username`
    *   `role` (e.g., 'admin', 'cataloguer', 'third_party')
    *   `plant_id` (if applicable, NULL for Admin)
    *   `exp` (expiry timestamp)
4.  The token is returned to the frontend, usually in the response body or an `Authorization` header.
5.  The frontend stores the token (e.g., in `localStorage` or `sessionStorage`).

### Token Structure (Claims)

The JWT payload should minimally contain the user's identity and role for efficient authorization checks:

```json
{
  "user_id": "...",
  "username": "...",
  "role": "admin", // or "cataloguer", "third_party"
  "plant_id": null, // UUID/INT or null
  "exp": 1678886400 // Expiry timestamp
}
Use code with caution.
Protected Routes
All API routes, except /api/auth/login and potentially public static assets, should be protected. Middleware should:
Check for the presence of a JWT in the Authorization: Bearer <token> header.
Verify the JWT signature using the secret key.
Check if the token has expired.
Decode the token and extract the user_id, role, and plant_id.
Attach the user information (or just ID/role/plant_id) to the request object for subsequent route handlers.
Role and Plant Based Access Control
After authentication, middleware or route-specific logic must enforce authorization based on the user's role and assigned plant (plant_id from the token).
Admin: Can access all endpoints (users, plants, materials, submissions, estimations). No plant restriction.
Cataloguer:
Can only access material codes and submissions related to their plant_id.
Can only POST new submissions for materials within their plant_id.
Cannot access admin endpoints (user/plant management).
Cannot access third-party estimation endpoints.
Third Party:
Can only access material submissions related to their plant_id.
Can only POST estimations for submissions related to their plant_id that are pending estimation.
Cannot access admin endpoints.
Cannot access cataloguer submission endpoints (except to view submissions they need to estimate).
Middleware should check req.user.role and req.user.plant_id against the requested resource's plant_id or the endpoint's required permission level.
6. API Documentation
(This section outlines typical endpoints. Refer to specific backend implementation for exact paths, methods, and request/response formats.)
Base URL: /api
Authentication Endpoints
POST /auth/login: Authenticates a user and returns a JWT.
Body: { username, password }
Response: { token, user: { id, username, role, plant_id } }
Admin Endpoints
(Requires role: 'admin')
GET /admin/plants: Get list of all plants.
POST /admin/plants: Create a new plant.
Body: { plant_code, plant_location }
PUT /admin/plants/:plantId: Update plant details.
Body: { plant_code?, plant_location? }
GET /admin/users: Get list of all users.
POST /admin/users: Create a new user.
Body: { username, password, role, plant_id?, active?, expiry_date? } (plant_id required for cataloguer/third_party)
PUT /admin/users/:userId: Update user details (role, plant_id, active, expiry_date).
Body: { role?, plant_id?, active?, expiry_date? }
DELETE /admin/users/:userId: Delete a user.
POST /admin/materials: Insert a new material code (likely per plant).
Body: { material_code, plant_id, uom, category, soh_quantity }
GET /admin/submissions: Get all material submissions across all plants.
GET /admin/estimations: Get all third-party estimations across all submissions.
GET /admin/dashboard: Get aggregated statistics for the admin dashboard.
Cataloguer/Material Endpoints
(Requires role: 'cataloguer' and checks plant_id against resource)
GET /materials: Get material codes assigned to the user's plant. Can include filtering/pagination.
Query: ?plantId=<user_plant_id>&search=<material_code_partial>
GET /materials/:materialId: Get details for a specific material code within the user's plant.
GET /materials/:materialId/submissions: Get past submissions for this material by the current cataloguer.
POST /material-submissions: Submit material cataloguing details.
Body: { material_id, good_count, package_defect_count, physical_defect_count, other_defect_count, missing_remarks, media: [...] }
Note: Missing count is calculated on the backend. Media upload is separate or handled within this endpoint (see File Uploads).
GET /material-submissions/:submissionId: Get details of a specific submission within the user's plant.
Third Party Endpoints
(Requires role: 'third_party' and checks plant_id against resource)
GET /third-party/submissions: Get material submissions pending estimation assigned to the user's plant.
Query: ?plantId=<user_plant_id>&status=pending_third_party
GET /third-party/submissions/:submissionId: Get details of a specific submission pending estimation within the user's plant. Includes counts and media.
POST /third-party/estimations: Submit cost estimation for a submission.
Body: { submission_id, good_price_per_uom, package_defect_price_per_uom, physical_defect_price_per_uom, other_defect_price_per_uom }
GET /third-party/estimations/:estimationId: Get details of a previously submitted estimation by the user.
GET /third-party/dashboard: Get statistics relevant to the third party (e.g., number of pending estimations, completed estimations).
Common Endpoints
GET /dashboard: Endpoint for role-specific dashboard data (Admin gets full data, Cataloguer/Third Party get filtered data).
GET /plants: Get list of plants accessible to the user (all for Admin, assigned plant for Cataloguer/Third Party).
File Uploads
Media uploads (images, videos) should typically use multipart/form-data.
A dedicated endpoint like POST /upload or integrate upload within the POST /material-submissions endpoint.
Files should be stored securely (not directly in the database) and the file_path stored in the material_submission_media table.
Consider using a library or service for handling file uploads and storage (e.g., Multer for Node.js, cloud storage SDKs).
7. Setting up Development Environment
Refer to the README.md for basic steps. This section adds more detail.
Prerequisites
Ensure all necessary runtimes (Node.js, Python, etc.) and database servers are installed and accessible.
Installation & Setup
Follow the cloning and dependency installation steps in the README for both backend and frontend directories.
Environment Variables
Backend:
PORT: Port for the backend server.
DATABASE_URL: Connection string for the database.
JWT_SECRET: A strong, random string for signing JWTs.
FILE_UPLOAD_DESTINATION: Path to store uploaded files (ensure write permissions).
FILE_UPLOAD_PUBLIC_PATH: Base URL/path to access uploaded files publicly.
Other service-specific variables (e.g., cloud storage credentials).
Frontend:
REACT_APP_API_URL: Base URL of the backend API (http://localhost:xxxx/api).
Database Setup
Ensure your database server is running.
Create the database if it doesn't exist.
Run migration scripts (if using an ORM with migrations) to create tables: npm run migrate (or equivalent).
Run seed scripts to populate initial data, especially the admin user: npm run seed (or equivalent). This seed should create the admin user with password admin123.
Running the Application
Start the backend and frontend servers as described in the README. Access the application via the frontend server's address (usually http://localhost:3000).
8. Testing
Unit Tests: Test individual functions, methods, or components.
Integration Tests: Test interactions between different parts of the system (e.g., API endpoints interacting with the database).
End-to-End Tests: Test the full user flow through the application (e.g., login as admin, create user, login as cataloguer, submit data).
API Testing: Use tools like Postman or curl to test API endpoints directly, verifying request/response formats and authorization checks.
9. Deployment Considerations
Environment Variables: Use production-ready environment variables (database connection, JWT secret, etc.).
File Storage: For production, avoid storing uploads directly on the server filesystem. Use a dedicated storage solution like AWS S3, Google Cloud Storage, or a dedicated file server. Update FILE_UPLOAD_DESTINATION and FILE_UPLOAD_PUBLIC_PATH accordingly.
Scalability: Consider load balancing, database scaling, and separating the frontend and backend deployment.
Security: Ensure HTTPS is used, secure environment variables, regularly update dependencies, implement proper input validation and output sanitization.
Logging & Monitoring: Set up logging for errors and activity, and monitoring for application performance and health.
10. Troubleshooting
Login Issues: Check backend logs for authentication errors, database connection issues, or JWT secret mismatches. Verify the admin user exists and is active.
Permission Errors (403 Forbidden): Check the JWT payload in the browser/request, verify the role and plant_id are correct, and review the backend authorization middleware logic.
Database Errors: Check database server status, connection string, and ensure migrations have run successfully.
File Upload Issues: Verify file upload destination directory exists and has write permissions, check backend upload handling logic, and ensure correct multipart/form-data requests from the frontend.
Frontend Blank Screen: Check browser console for JavaScript errors or failed API requests. Ensure the backend is running and REACT_APP_API_URL is correct.
This guide provides a comprehensive technical overview. Consult the specific codebase files (routes, controllers, services, models, middleware) for exact implementation details.
Generated code
Use code with caution.
