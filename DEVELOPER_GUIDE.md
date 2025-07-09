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
