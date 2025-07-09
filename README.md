# Leonex Material Hub



Welcome to the Leonex Material Hub repository! This project is a web-based platform designed to streamline the material cataloguing, defect tracking, and third-party cost estimation process within a multi-plant organization. It centers around precise material code identification and role-based access control to manage inventory conditions and facilitate potential recovery or disposition decisions.

## ✨ Features

The Leonex Material Hub provides distinct functionalities tailored to different user roles:

### Core Functionality

- **Material Cataloguing:** Detailed review and classification of material items based on their condition (Good, Package Defect, Physical Defect, Other Defect, Missing).
- **Defect Tracking:** Specific recording of package, physical, and other defects, including reasons and supporting imagery.
- **Image & Video Uploads:** Comprehensive media attachment capabilities for documenting material condition, including specific views for good materials and images for defects.
- **Calculated Missing Items:** Automatic calculation of missing items based on the difference between SOH (Stock On Hand) quantity and the counts of classified items.

### Role-Based Features

#### 👑 Admin

- **Centralized Plant Management:** Manage details of all operational plants.
- **Material Code Management:** Insert new material codes into the system.
- **User Management:** Create, edit, and manage user accounts (Cataloguers, Third Parties).
- **User Assignment & Access Control:** Assign Cataloguers and Third Parties to specific plants, controlling their access via JWT.
- **Account Activation/Deactivation:** Control user account status and set expiry dates.
- **Full Data Visibility:** View all material data and submissions across all plants.
- **Cost Estimation Oversight:** View all cost estimations submitted by Third Parties for any material code.
- **Comprehensive Reporting & Statistics (Dashboard):** Access aggregated data and statistics across the platform.

#### 📦 Cataloguer

- **Restricted Plant Access:** Access and process only material codes assigned to their specific plant.
- **Material Review & Submission:** Locate assigned material codes, review physical stock, fill out the detailed condition form (counts, reasons for defects, media uploads), and submit the findings.
- **View Own Submissions:** Track the status of materials they have catalogued.

#### 🤝 Third Party

- **Restricted Submission Access:** Access only material submissions from plants they are assigned to, and potentially only submissions pending their estimation.
- **Cost Estimation Input:** Provide cost estimations for material submissions based on their classified condition (Good, Package Defect, Physical Defect, Other Defect).
- **View Own Estimations:** See the cost estimates they have submitted.
- **Dashboard Statistics (Limited):** View relevant statistics, potentially related to items requiring estimation or completed estimations.

## 🛠️ Tech Stack (Assumed)

While the specific technologies weren't fully detailed, this project likely utilizes a modern web development stack. Common choices might include:

- **Frontend:** React, Vue.js, or Angular (for a dynamic single-page application)
- **Backend:** Node.js (Express.js), Python (Django/Flask), Ruby on Rails, Java (Spring), or PHP (Laravel/Symfony) (for API development, authentication, and data processing)
- **Database:** PostgreSQL, MySQL, MongoDB, etc. (for storing material data, user info, submissions, and estimations)
- **Authentication:** JWT (JSON Web Tokens) for securing API endpoints and managing user sessions/permissions.
- **File Storage:** Local filesystem, AWS S3, Google Cloud Storage, etc. (for storing uploaded images and videos).

## 🚀 Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js and npm or yarn installed (check specific backend requirements if different)
- A compatible database server running (e.g., PostgreSQL, MySQL)
- Git

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository_url>
    cd leonex_materialhub
    ```

2.  **Set up Backend:**

    ```bash
    # Navigate to the backend directory (assuming a typical structure)
    cd backend
    npm install # or yarn install
    ```

    - Create a `.env` file in the backend root based on a provided `.env.example` (if available). Configure database connections, JWT secret, file storage paths, etc.
    - Run database migrations (if applicable): `npm run migrate` (command may vary).
    - Seed initial data (e.g., initial admin user, some plants if needed): `npm run seed` (command may vary).

3.  **Set up Frontend:**
    ```bash
    # Navigate to the frontend directory (assuming a typical structure)
    cd ../frontend
    npm install # or yarn install
    ```
    - Create a `.env` file in the frontend root for API URLs, etc.


### Configuration (.env Files)

Sensitive configurations, database credentials, API keys, and external URLs are managed via `.env` files. Example files are provided to help you set up.

*   **Backend Configuration (`backend/.env`):** Create this file from `backend/.env.example` and fill in your specific details.
    ```dotenv
    # Database connection details (MySQL)
    DB_HOST=127.0.0.1
    DB_USER=root
    DB_PASSWORD=your_db_password # <-- CHANGE THIS!
    DB_NAME=your_db_name # <-- CHANGE THIS!
    DB_PORT=3306

    # Backend Server Settings
    PORT=5001 # Port for the backend API server

    # Authentication
    JWT_SECRET=your_jwt_secret_token # <-- CHANGE THIS to a strong, unique value! Secret key for signing JWTs.

    # File Storage
    MEDIA_BASE_URL=http://localhost:5001/media # Base URL where uploaded media files can be accessed
    FILE_UPLOAD_DESTINATION=./uploads/ # Local path where files will be stored (relative to backend root)

    # CORS Settings
    CORS_ORIGIN=http://localhost:5173 # Frontend URL allowed to access the API (for development CORS)
    ```
*   **Frontend Configuration (`frontend/.env`):** Create this file from `frontend/.env.example` and fill in your specific details. (Note: If using Vite, variable names must be prefixed with `VITE_`).
    ```dotenv
    # API Configuration
    VITE_API_URL=http://localhost:5001/api # Base URL for the backend API
    ```



### Running the Application

1.  **Start the Backend Server:**

    ```bash
    cd backend
    npm start # or npm run dev (depending on setup)
    ```

    The backend API should now be running, typically on a port like 3000, 5000, or 8080.

2.  **Start the Frontend Development Server:**
    ```bash
    cd frontend
    npm start # or yarn start
    ```
    The frontend application should open in your browser, typically on port 3000 or 8080.

## 🔑 Testing Credentials

For initial testing and exploration of the Admin capabilities:

- **Username:** `admin`
- **Password:** `admin123`

**Important:** These credentials are for _testing purposes only_ in a development environment. Ensure strong, unique passwords are used in production, and implement proper security practices for initial user creation.

## 📚 Documentation

- **For Developers:** Dive into the technical details, architecture, API endpoints, and setup guides in the [Developer Guide](DEVELOPER_GUIDE.md).
- **For End-Users:** Learn how to use the application based on your role (Admin, Cataloguer, Third Party) in the [User Guide](USER_GUIDE.md).


## 📄 License

This project is licensed under the [MIT License](LICENSE) (if available) - see the LICENSE.md file for details.

## 📞 Contact

If you have any questions or issues, please open an issue on this repository or contact MATHAN C via [LinkedIn](https://www.linkedin.com/in/mathan-c/).
