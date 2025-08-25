# ✨ Stock and Inventory Management - User Guide ✨

Welcome to the **Stock and Inventory Management** platform! This comprehensive guide is designed to assist you in understanding how to navigate and utilize the system effectively based on your assigned role.

At its core, the platform streamlines the process of tracking and assessing the condition of inventory materials across various plant locations. It leverages unique material codes for identification and empowers users to report detailed item statuses, including defects and missing stock, facilitating informed decisions.

## 📖 Table of Contents

1.  [➡️ Logging In](#1-logging-in)
2.  [👤 Understanding Your Role](#2-understanding-your-role)
    *   [👑 Admin](#admin)
    *   [📦 Cataloguer](#cataloguer)
    *   [🤝 Third Party](#third-party)
3.  [📊 Dashboard Overview](#3-dashboard-overview)
4.  [👑 Admin User Guide](#4-admin-user-guide)
    *   [Managing Plants/Locations](#managing-plantslocations)
    *   [Managing User Accounts](#managing-user-accounts)
    *   [Adding Master Material Codes](#adding-master-material-codes)
    *   [Viewing All Data (Materials, Submissions, Estimations)](#viewing-all-data-materials-submissions-estimations)
5.  [📦 Cataloguer User Guide](#5-cataloguer-user-guide)
    *   [Accessing Your Assigned Materials](#accessing-your-assigned-materials)
    *   [Submitting Material Condition Details](#submitting-material-condition-details)
        *   [Navigating the Submission Form](#navigating-the-submission-form)
        *   [Entering Item Counts](#entering-item-counts)
        *   [Documenting Defects (Reasons & Images)](#documenting-defects-reasons--images)
        *   [Uploading Good Material Media](#uploading-good-material-media)
        *   [Automatic Missing Count](#automatic-missing-count)
        *   [Saving & Submitting Your Report](#saving--submitting-your-report)
    *   [Viewing Your Past Submissions](#viewing-your-past-submissions)
6.  [🤝 Third Party User Guide](#6-third-party-user-guide)
    *   [Accessing Submissions Requiring Estimation](#accessing-submissions-requiring-estimation)
    *   [Providing Cost Estimations](#providing-cost-estimations)
    *   [Reviewing Your Submitted Estimations](#reviewing-your-submitted-estimations)
7.  [❓ Getting Help](#7-getting-help)

---

## 1. ➡️ Logging In

To begin using the Stock and Inventory Management platform, you will need valid login credentials (a username and password) provided by your system administrator.

1.  Open the application URL in your preferred web browser.
2.  Locate the login form and enter your provided **Username** and **Password**.
3.  Click the **"Login"** button.

Upon successful authentication, if your account is active, you will be directed to your role-specific dashboard. Should you encounter any issues logging in, please contact your administrator.

## 2. 👤 Understanding Your Role

Your access and available functionalities within the system are strictly determined by your assigned user role.

### 👑 Admin

Admins possess comprehensive control and visibility. They are responsible for the system's foundational setup and oversight, including managing plants, users, the master material catalog, and viewing all data across the entire organization.

### 📦 Cataloguer

Cataloguers are the frontline users responsible for the physical inspection and detailed documentation of material conditions. Their access is limited to managing and submitting data specifically for the materials located in the plant(s) they are assigned to.

### 🤝 Third Party

Third Parties are external or internal experts tasked with providing cost estimations or valuations for materials based on their reported condition. Their view is typically restricted to relevant material submissions from their assigned plant(s) that are awaiting their expert assessment.

## 3. 📊 Dashboard Overview

Upon logging in, you will land on your personalized dashboard. The information displayed here provides a quick overview relevant to your role:

*   **Admin:** Likely sees high-level aggregated statistics such as total plants, total users, total materials catalogued, overall submission counts, and possibly a summary of total estimated values across the organization.
*   **Cataloguer:** May see key metrics for their assigned plant(s), including the number of materials assigned, submissions currently being processed, and those they have completed.
*   **Third Party:** Will likely see a count of submissions awaiting their cost estimation and a summary of the estimations they have already completed.

Navigate through the application by selecting options from the menu, which dynamically adjusts based on your permissions.

## 4. 👑 Admin User Guide

As an Admin, you are the custodian of the system's core configurations and data.

### Managing Plants/Locations

Control the list of physical plants or warehouse locations managed within the system.
*   **Add New Plant:** Navigate to the "Admin" or "Manage Plants" section. Find the option to add a new plant. Provide a unique **Plant Code** (e.g., 'FXTR', 'HQ') and the full **Plant Location** name (e.g., 'Trichy Manufacturing Plant'). Save to register the new plant.
*   **View Plants:** The "Manage Plants" section displays a list of all currently configured plants, allowing you to view their details. (Editing/Deleting options may also be available here).

### Managing User Accounts

Create, configure, and maintain user accounts for Cataloguers and Third Parties.
*   **Create New User:** Go to the "Admin" or "Manage Users" section. Select "Add User".
    *   Enter a unique **Username** and initial **Password**.
    *   Select the appropriate **Role** (**Cataloguer** or **Third Party**).
    *   For Cataloguer or Third Party roles, you **must** **Assign Plant(s)** from the list. Users can be assigned to multiple locations.
    *   Set the account **Status** (typically 'Active' initially).
    *   Optionally specify an account **Expiry Date**.
    *   Save the new user account.
*   **View/Edit Users:** The "Manage Users" list shows all system users. Click on a username to view or modify their details, update password, change role, adjust plant assignments, or toggle their active status/expiry date.

### Adding Master Material Codes

Populate and maintain the central catalog of materials that need tracking.
*   Navigate to the "Admin" or "Manage Materials" section.
*   Find the option to "Add Material Code" or initiate an "Import".
*   You will need to enter key details for each material: the unique **Material Code**, the specific **Plant** where this material exists, its **UOM** (Unit of Measurement, e.g., 'PCS', 'KG'), an optional **Category** (e.g., 'Raw Material', 'Finished Goods'), and the current **SOH Quantity** (Stock On Hand).
*   Save the material record.
*   *(Bulk import functionality, typically via CSV/spreadsheet, might be available - refer to specific system instructions).*

### Viewing All Data (Materials, Submissions, Estimations)

Admins have comprehensive visibility across the entire platform.
*   Navigate to relevant sections like "Materials", "Submissions", or "Estimations".
*   You can view lists of all materials, all cataloguer submissions, and all third-party estimations, irrespective of their originating plant.
*   Utilize filtering and search capabilities (if available) to quickly find specific records by plant, material code, date, or status.
*   Clicking on a specific record provides a detailed view of all associated information.

## 5. 📦 Cataloguer User Guide

Your primary responsibility is to accurately inspect and document the condition of inventory materials within your assigned plant(s).

### Accessing Your Assigned Materials

Upon logging in, the system will present you only with material codes located in the plant(s) you have been assigned by an administrator.
1.  Navigate to the "Materials" or "Cataloguing" section in your menu.
2.  You will see a list containing materials located in your assigned plant(s) that are either pending assessment or have been previously submitted.
3.  Use available search and filter options to locate the specific material code you need to work on.

### Submitting Material Condition Details

Once you've located a material code requiring assessment:

1.  Click on the material code from the list.
2.  Select the action button to initiate the cataloguing process, often labeled "Start Cataloguing" or "Submit Details".
3.  This action will open the detailed submission form.

#### Navigating the Submission Form

The submission form is structured to capture all necessary details about the material's condition:

*   **Material Information:** Displays static data like Plant Code, Location, UOM, Category, and the official SOH Quantity for the material.
*   **Item Counts:** Sections where you input the *actual* quantity of items physically found in each condition category.
*   **Media Uploads (Good Items):** Dedicated areas to upload images/videos specifically documenting the condition of items classified as 'Good'.
*   **Defects Documentation:** Sections for each defect type (Package, Physical, Other) where you detail the issues found.
*   **Missing Remarks:** An area to provide context for the calculated missing count.

#### Entering Item Counts

Based on your physical inspection, accurately count the items in each category and enter the corresponding numbers in the fields: **Good Material Count**, **Package Defects Count**, **Physical Defects Count**, and **Other Defects Count**.

#### Documenting Defects (Reasons & Images)

For any defect category (Package, Physical, Other) where you entered a count greater than zero:
1.  **Specify Reason(s):** Use the provided input area to clearly describe the observed defect(s). You may be able to add multiple reasons for a single defect type.
2.  **Upload Supporting Images:** Use the upload function within that defect section to attach clear photographs that visually demonstrate the defects you've described. Multiple images might be required or helpful.

#### Uploading Good Material Media

For items classified as 'Good', use the designated upload sections (e.g., for 'Specification Image', 'Packing Image', 'Product Image', 'Inspection Video') to provide the required visual documentation confirming their condition.

#### Automatic Missing Count

The system automatically calculates the **Missing Count** based on the difference between the Material's SOH Quantity and the sum of the counts you entered for Good, Package Defect, Physical Defect, and Other Defect items.

`Missing Count = SOH Quantity - (Good Count + Package Defect Count + Physical Defect Count + Other Defect Count)`

This field is read-only and requires no manual calculation on your part, but its accuracy depends directly on the counts you provide for the other categories. Provide **Missing Defects Status / Remarks** if necessary.

#### Saving & Submitting Your Report

After completing all sections of the form, reviewing for accuracy, and ensuring all required media is uploaded:

1.  Click the **"Submit"** or **"Save"** button at the bottom of the form.

Your detailed condition report will be saved in the system. The material's status will update, indicating that it's ready for the next step in the workflow (e.g., estimation by a Third Party).

### Viewing Your Past Submissions

You can track the history and status of the material condition reports you have submitted.
*   Look for a "My Submissions" or similar navigation link.
*   This list will display the materials you have catalogued, the date of submission, and their current processing status within the system.
*   Clicking on an entry will allow you to review the full details of your previous submission.

## 6. 🤝 Third Party User Guide

As a Third Party user, your primary task is to provide expert cost estimations or valuations for materials based on the detailed condition reports submitted by the Cataloguers.

### Accessing Submissions Requiring Estimation

You will only see material submissions that originate from the plant(s) you are assigned to and are currently pending your cost estimation.
1.  Navigate to the "Estimations" or "Third Party" section in your menu.
2.  The system will display a list of material submissions that are ready for your assessment and estimation.
3.  Click on a submission from this list to view its details and provide your estimate.

### Providing Cost Estimations

When you open a submission marked for estimation:

1.  Review the displayed **Material Details**, the original **SOH Quantity**, and the counts reported by the Cataloguer for items classified as Good, Package Defect, Physical Defect, Other Defect, and Missing.
2.  **Crucially, review the Defect Reasons and Images** uploaded by the Cataloguer. These provide essential context for accurately valuing the items based on their condition.
3.  Locate the section designated for entering cost estimations.
4.  Enter your estimated price *per UOM* (Unit of Measurement) for the items in each applicable condition category:
    *   **Good Material Price (per UOM)**
    *   **Package Defects Price (per UOM)**
    *   **Physical Defects Price (per UOM)**
    *   **Other Defects Price (per UOM)**
5.  Ensure the prices reflect your professional valuation based on the documented condition and market value.
6.  Review the prices you have entered for accuracy.
7.  Click the **"Submit Estimation"** or **"Save"** button to finalize your assessment.

Once submitted, your estimation is recorded against the submission, and the submission's status will update within the workflow.

### Reviewing Your Submitted Estimations

You can review the cost estimations you have previously provided for submitted materials.
*   Look for a "My Estimations" or "Completed Estimations" section.
*   This list will show the submissions you have estimated, the date the estimation was provided, and the specific prices you entered for each condition category.

## 7. ❓ Getting Help

Should you encounter any issues while using the application, have questions about specific functionalities, or require assistance with your user account (login problems, incorrect plant assignment, etc.), please reach out to your designated system administrator. They are the primary point of contact for user support.

---

*Thank you for using Stock and Inventory Management to help maintain accurate and detailed inventory records!*
