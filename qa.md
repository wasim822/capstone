# Capstone UI Q&A Guide

This guide helps users complete common tasks in the app through the UI.

## Q1) How do I add a new item to inventory?

1. Open the app and sign in.
2. Go to the **Inventory** page from the dashboard menu.
3. Click **+ Add Product** in the top-right corner.
4. Fill in the required fields:
   - Product Name
   - SKU (format must match `PROX-XXX-0001`)
   - Category
   - Quantity
   - Unit Price
   - Location
   - Description (optional)
5. Confirm and submit the form.
6. Verify the new item appears in the inventory table.

## Q2) Why can I not submit a new inventory item?

Common reasons:

- A required field is empty (Product Name, SKU, Category, Quantity, Unit Price, or Location).
- SKU format is invalid. Use uppercase format like `PROX-ABC-0001`.
- Quantity is not a valid whole number or is out of accepted range.
- Unit Price is missing or invalid.

## Q3) How do I edit an existing inventory item?

1. Go to **Inventory**.
2. Find the item using search or filters.
3. Open the row action menu for that item.
4. Choose **Edit**.
5. Update fields and save.

## Q4) How do I delete an inventory item?

1. Go to **Inventory**.
2. Find the item.
3. Open the row action menu.
4. Choose **Delete**.
5. Confirm deletion in the dialog.

## Q5) How do I create an inventory report (lost, damaged, expired, stolen)?

1. Open **Reports** and navigate to **Inventory Reports**.
2. Click **+ Add Report**.
3. Enter report details:
   - Item Name
   - Reported By
   - Report Type (Lost, Damaged, Expired, or Stolen)
   - Description
   - Additional Notes (optional)
4. Submit the report.
5. Confirm it appears in the report list.

## Q6) Why is report creation not working?

Check the following:

- **Report Type** is selected (required).
- Required text fields are not blank.
- You have permission to create reports.
- Backend API is running and reachable.

## Q7) How do I edit or delete a report?

1. Go to **Inventory Reports**.
2. Locate the report using search/filter.
3. Open report actions.
4. Choose **Edit** to update fields, or **Delete** to remove it.
5. Confirm the action.

## Q8) How do I quickly find items or reports?

- Use the search bar at the top of each page.
- Use filters:
  - Inventory: category and stock status.
  - Reports: report type.
- Use pagination controls to browse additional results.

## Q9) The UI does not show my changes after saving. What should I do?

1. Refresh the page.
2. Re-check search/filter settings.
3. Confirm the backend is running.
4. Check browser console/network tab for API errors.
5. Re-login if your session expired.

## Q10) What are the stock status rules in inventory?

The app calculates status from quantity:

- `<= 0` -> Out of Stock
- `1 to 5` -> Low Stock
- `>= 6` -> In Stock

## Quick Checklist for Support

- User is logged in and has proper permissions.
- Backend API is up.
- Database is up.
- Required fields are filled.
- SKU format is valid for inventory item creation.
- Report Type is selected for report creation.
