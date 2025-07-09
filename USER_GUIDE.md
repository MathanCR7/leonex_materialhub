# Leonex Material Hub - User Guide

Welcome to the Leonex Material Hub! This guide will help you understand how to use the application based on your assigned role.

The Material Hub is a system designed to help track and assess the condition of materials in different plants. It uses material codes to identify items and allows users to report their status, including defects and missing items.

## 📖 Table of Contents

1.  [Logging In](#1-logging-in)
2.  [Understanding Roles](#2-understanding-roles)
    *   [Admin](#admin)
    *   [Cataloguer](#cataloguer)
    *   [Third Party](#third-party)
3.  [Dashboard Overview](#3-dashboard-overview)
4.  [Admin User Guide](#4-admin-user-guide)
    *   [Managing Plants](#managing-plants)
    *   [Managing Users](#managing-users)
    *   [Adding Material Codes](#adding-material-codes)
    *   [Viewing Material Data & Submissions](#viewing-material-data--submissions)
    *   [Viewing Cost Estimations](#viewing-cost-estimations)
5.  [Cataloguer User Guide](#5-cataloguer-user-guide)
    *   [Accessing Your Assigned Materials](#accessing-your-assigned-materials)
    *   [Submitting Material Details](#submitting-material-details)
        *   [Understanding the Form](#understanding-the-form)
        *   [Adding Counts](#adding-counts)
        *   [Adding Defect Reasons and Images](#adding-defect-reasons-and-images)
        *   [Uploading Good Material Media](#uploading-good-material-media)
        *   [Missing Count Calculation](#missing-count-calculation)
        *   [Saving/Submitting](#saving-submitting)
    *   [Viewing Your Submissions](#viewing-your-submissions)
6.  [Third Party User Guide](#6-third-party-user-guide)
    *   [Accessing Submissions for Estimation](#accessing-submissions-for-estimation)
    *   [Providing Cost Estimations](#providing-cost-estimations)
    *   [Viewing Your Estimations](#viewing-your-estimations)
7.  [Getting Help](#7-getting-help)

---

## 1. Logging In

To access the Leonex Material Hub, you will need a username and password provided by your administrator.

1.  Open the application URL in your web browser.
2.  Enter your **Username** and **Password** in the login form.
3.  Click the **"Login"** button.

If your credentials are correct and your account is active, you will be directed to the application dashboard. If you have trouble logging in, contact your administrator.

## 2. Understanding Roles

Your permissions and what you can do in the system depend on your user role.

### Admin

Admins have full access to the system. They can manage plants, users, material codes, and view all data, including submissions and cost estimations across all plants.

### Cataloguer

Cataloguers are responsible for inspecting and documenting the condition of materials. They can only see and submit data for material codes located in the plant(s) they are assigned to.

### Third Party

Third Parties are responsible for providing cost estimations for materials that have been catalogued. They can only see material submissions that are relevant to their role and assigned plant(s) and are pending estimation.

## 3. Dashboard Overview

After logging in, you will see a dashboard. The information displayed on the dashboard will vary based on your role:

*   **Admin:** May see overall statistics like the total number of plants, users, materials, submissions, and aggregated counts/values.
*   **Cataloguer:** May see a summary for their assigned plant(s), such as the number of materials assigned, submissions pending, and submissions completed.
*   **Third Party:** May see the number of submissions currently awaiting their cost estimation and a summary of completed estimations.

Navigate through the application using the menu options available to you (these options are determined by your role).

## 4. Admin User Guide

As an Admin, you have control over the system's core data and users.

### Managing Plants

You can add, view, and potentially edit information about the plants in your organization.
*   **Add New Plant:** Look for a "Manage Plants" or "Admin" section in the menu. Find an option like "Add Plant" or "New Plant". You will need to enter the **Plant Code** (e.g., FXTR) and **Plant Location** (e.g., Trichy). Save the new plant.
*   **View Plants:** The "Manage Plants" section will list all plants configured in the system.

### Managing Users

You can create, assign plants to, activate/deactivate, and set expiry dates for Cataloguer and Third Party users.
*   **Add New User:** Navigate to the "Manage Users" section. Click "Add User" or "New User".
    *   Enter a unique **Username**.
    *   Set an initial **Password**.
    *   Select the **Role** (Cataloguer or Third Party).
    *   If the role is Cataloguer or Third Party, you *must* **Assign Plant(s)** from the list of available plants. A user can potentially be assigned to multiple plants.
    *   Set the account **Status** (Active/Inactive).
    *   Optionally set an **Expiry Date** for the account.
    *   Save the user.
*   **View/Edit Users:** The "Manage Users" list shows all users. Click on a user to view or edit their details, change their assigned plant(s), update status, or set/change expiry.

### Adding Material Codes

You are responsible for populating the system with the list of materials to be catalogued.
*   Navigate to a "Manage Materials" or "Admin" section.
*   Look for an option like "Add Material Code" or "Import Materials".
*   You will need to specify the **Material Code**, the **Plant** it belongs to, its **UOM** (Unit of Measurement, e.g., NO, PCS, KG), **Category** (e.g., Snacks, Electronics), and the initial **SOH Quantity** (Stock On Hand Quantity).
*   Save the material.
*   *(Note: There might be an option to import materials in bulk via a spreadsheet like CSV. Consult specific application instructions if available).*

### Viewing Material Data & Submissions

Admins can see all material codes and all cataloguer submissions regardless of the plant.
*   Navigate to sections like "Materials" or "Submissions".
*   You can likely filter or search by Plant, Material Code, or Submission Date.
*   Click on a specific material code or submission record to see its full details, including counts, defects, media uploads, and the cataloguer who submitted it.

### Viewing Cost Estimations

Admins can see all cost estimations provided by Third Parties.
*   Navigate to an "Estimations" or "Admin" section.
*   You can view estimations linked to submissions, seeing the estimated prices and the total calculated value per category (Good, Package Defect, etc.).

## 5. Cataloguer User Guide

As a Cataloguer, your main task is to accurately assess and report the condition of materials in your assigned plant(s).

### Accessing Your Assigned Materials

When you log in, you will only see material codes that exist in the plant(s) you have been assigned to.
1.  Look for a "Materials" or "Cataloguing" section in the menu.
2.  You will see a list of material codes pending cataloguing or previously submitted within your assigned plant.
3.  Use search or filter options (if available) to find a specific material code you need to inspect.

### Submitting Material Details

Once you find a material code you need to catalogue:

1.  Click on the material code from the list.
2.  Look for a button like "Start Cataloguing" or "Submit Details".
3.  This will open a form where you will enter the condition details based on your physical inspection of the stock.

#### Understanding the Form

The form reflects the structure required for cataloguing:

*   **Material Details:** Displays fixed information like Plant Code, Location, UOM, Category, and the initial SOH Quantity for this material code.
*   **Counts:** Sections for entering the quantity of items falling into different condition categories:
    *   **Good Material Count:** Number of items found to be in perfect condition.
    *   **Package Defects Count:** Number of items with issues only related to packaging.
    *   **Physical Defects Count:** Number of items with damage or defects to the product itself.
    *   **Other Defects Count:** Number of items with defects not covered by the above categories (e.g., expired date, wrong variant).
    *   **Missing Count (Calculated):** This field is automatically calculated by the system (see below).
*   **Media Uploads (Good Material):** Specific slots for uploading images/videos to document the condition of the *good* material. You might need to upload images for Specification, Packing Condition, Product View, etc., and potentially an Inspection Video. Follow the required media types.
*   **Defects Details (Package, Physical, Other):** For each defect category where the count is greater than 0, you must:
    *   Enter **Reason(s):** Describe the specific defect(s) found (e.g., "Torn box," "Dented can," "Expired 01/2024"). You can often add multiple reasons if needed.
    *   Upload **Images:** Provide clear pictures illustrating the defects you described. You might need to upload multiple images per defect category.
*   **Missing Defects Status / Remarks:** If there is a calculated missing count, you may need to provide remarks or context here (e.g., "Stock count discrepancy," "Could not locate remaining items").

#### Adding Counts

Carefully count the items based on their condition and enter the quantities in the corresponding count fields (Good, Package Defects, Physical Defects, Other Defects).

#### Adding Defect Reasons and Images

For each defect type (Package, Physical, Other) where you entered a count greater than zero:
1.  Click to add a reason and description of the defect observed.
2.  Use the upload button within that section to attach clear images showing the specific defects mentioned.

#### Uploading Good Material Media

Use the specific upload buttons under the "Good Media Uploads" section to add the required images and videos that demonstrate the condition of the *good* material.

#### Missing Count Calculation

The system automatically calculates the Missing Count using the formula:

`Missing Count = SOH Quantity - (Good Material Count + Package Defects Count + Physical Defects Count + Other Defects Count)`

You do not need to calculate this yourself, but ensure your counts for the other categories are accurate as they directly impact this calculation.

#### Saving/Submitting

Once you have filled in all the counts, defect reasons, and uploaded all required media:

1.  Review all the information you've entered for accuracy.
2.  Click the **"Submit"** or **"Save"** button at the bottom of the form.

Your submission will be saved, and the material's status will update in the system, likely making it available for a Third Party to provide an estimation.

### Viewing Your Submissions

You can view the history and details of the material submissions you have made.
*   Look for a "My Submissions" or similar section.
*   This list will show the materials you have catalogued, the date of submission, and their current status (e.g., "Submitted," "Pending Third Party," "Estimation Received," "Completed").
*   Click on a submission to view the details you previously entered.

## 6. Third Party User Guide

As a Third Party, your role is to provide cost estimations for materials based on the condition reported by the Cataloguer.

### Accessing Submissions for Estimation

You will only see material submissions from the plant(s) you are assigned to, specifically those that are ready for your estimation.
1.  Look for a "Estimations" or "Third Party" section in the menu.
2.  You will see a list of material submissions that require a cost estimate from you. This list will be limited to your assigned plants and the relevant status.
3.  Click on a submission from the list to view its details.

### Providing Cost Estimations

When you open a submission for estimation:

1.  You will see the Material Details, the SOH Quantity, and the counts determined by the Cataloguer for Good, Package Defect, Physical Defect, Other Defect, and Missing items.
2.  You will also be able to view the **Defect Reasons** and **Images** uploaded by the Cataloguer to understand the nature of the defects.
3.  Locate the section for entering cost estimations.
4.  Enter your estimated price *per UOM* (Unit of Measurement) for each applicable category:
    *   **Good Material Price (per UOM)**
    *   **Package Defects Price (per UOM)**
    *   **Physical Defects Price (per UOM)**
    *   **Other Defects Price (per UOM)**
5.  Ensure the prices are accurate based on your valuation expertise and the condition documented.
6.  Review your entered prices.
7.  Click the **"Submit Estimation"** or **"Save"** button.

Once submitted, the estimation is recorded, and the submission's status will likely update.

### Viewing Your Estimations

You can review the cost estimations you have previously submitted.
*   Look for a "My Estimations" or "Completed Estimations" section.
*   This list will show the submissions you have estimated, the date of estimation, and the prices you provided.

## 7. Getting Help

If you encounter any issues, have questions about using the application, or need assistance with your account (login, plant assignment, etc.), please contact your system administrator.
