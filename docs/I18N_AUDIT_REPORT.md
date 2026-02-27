# i18n Audit Report – Missing Configuration and Fixes

**Date:** Generated from codebase audit  
**Languages:** English (en), German (de)

---

## 1. What Was Missing

### 1.1 German locale (de.json) – missing keys

- **Total keys in en:** 2,297  
- **Total keys in de (before fix):** 2,205  
- **Missing in de:** **240 keys** (present in en but not in de)

Missing key groups included:

| Section | Examples of missing keys |
|--------|---------------------------|
| **navigation** | `columnAccessConfig`, `assetTypeChecklistMapping`, `usageBasedAssetReport`, `slaReport`, `assetGroups` |
| **dashboard** | `assetBreakdown`, `overlaps`, `assignedAndMaintenance`, `vendorContractRenewal`, `triggerVendorRenewal`, etc. |
| **reports** | `placeholders.enterBranchNumber`, `columnHeaders.standardHours`, `columnHeaders.actualHours`, etc. |
| **auditLogs** | `configSubtitle` |
| **workorderManagement** | `notSet` |
| **inspectionApproval** | `title`, `assetCode`, `assetType`, `serialNumber`, `scheduledDate`, `status`, `branch`, `jobRole`, `failedToFetch`, `detailTitle`, `assetDetails`, `frequency`, `approvalWorkflow`, `yourAction`, `addComments`, `history`, `rejectReasonRequired`, etc. |
| **vendorRenewalApproval** | `title`, `subtitle`, `vendorName`, `companyName`, `contactPerson`, `scheduledDate`, `maintenanceType`, `status`, `daysUntilDue`, and status/export messages |
| **maintenanceSupervisor** | `email`, `pleaseFillAllRequiredFields`, `nameIsRequired`, `phoneIsRequired`, `standardHours`, `actualHours`, `variance`, `enterHours`, and related validation/remarks keys |
| **inspectionView** | `createManualInspection`, `inspectionCreatedSuccessfully`, `failedToCreateInspection` |
| **scrapSales** | Status keys: `statusApprovalPending`, `statusInitiated`, `statusInProgress`, `statusCompleted`, `statusCancelled`, `deleteScrapSales`, error messages |
| **groupAssets** | Entire `createGroupAsset.*` and `editGroupAsset.*` subsections (labels, messages, buttons, document management, etc.) |

So **German was missing i18n configuration** for these 240 keys; switching to German would have shown key paths or fallback English for those strings.

---

## 2. What Was Fixed

### 2.1 German locale – all missing keys added

- **Action:** Merged missing keys from `en.json` into `de.json` (add-only; no overwrite of existing de keys).
- **Script:** `scripts/merge-i18n-de.cjs` (run with `node scripts/merge-i18n-de.cjs`).
- **Result:** **65 merge operations** (nested objects counted as one each), so that **all 240 previously missing leaf keys** now exist in `de.json`.
- **Verification:** After merge, **0 keys** from `en` are missing in `de`.
- **Note:** Newly added keys in `de` use the **same value as in en** (English text). For proper German UX, those values can be translated later in `de.json`.

**Did we add it?** **Yes** – all missing de keys were added.

---

### 2.2 New i18n keys and usage in components

New keys were introduced for titles/labels that were hardcoded, and components were updated to use them in **both** en and de.

| Location | What was missing | Fix | Added to en | Added to de |
|----------|-------------------|-----|-------------|-------------|
| **Header (path titles)** | "Inspection Checklists", "Inspection Frequency", "Product / Service", "Role Management", "Properties", "Breakdown Reason Codes" | Use `t(...)` with new keys | Yes | Yes (German translations) |
| **ColumnAccessConfig page** | "Column Access Configuration" | Use `t('columnAccessConfig.pageTitle')` | Yes | Yes |
| **InspectionChecklists page** | "Inspection Checklists List" | Use `t('inspectionChecklists.pageTitle')` | Yes | Yes |
| **AdminSettingsView** | "Column Access Config" label | Use `t('navigation.columnAccessConfig')` | Key already existed | Already present |

**New key groups:**

- **masterDataTitles**: `inspectionChecklists`, `inspectionFrequency`, `prodServ`, `roleManagement`, `properties`, `breakdownReasonCodes` (used in `Header.jsx`).
- **columnAccessConfig.pageTitle** (used in `ColumnAccessConfig.jsx`).
- **inspectionChecklists.pageTitle** (used in `InspectionChecklists.jsx`).

**Did we add it?** **Yes** – keys added in en and de, and components updated to use them.

---

## 3. Where i18n Is Still Missing (Not Fixed in This Pass)

These screens still contain hardcoded English strings (no `t()` or missing keys). They were **not** changed in this audit; only documented.

| Screen / File | Examples of hardcoded strings |
|---------------|--------------------------------|
| **adminSettings/Certifications.jsx** | "Existing Certificates", "Add New Certificate", "Certificate Name", "Certificate Number", "Remove filter", "Select column", "Search value", "Add filter", "Maintenance Certificates", "Inspection Certificates", "Add selected", "Add all", "Remove selected", "Remove all", "Select asset type", "Select maintenance type", "No certificates available", "No certificates selected", table headers, etc. |
| **masterData/UserRoles.jsx** | "Edit User", "Close", "Full Name", "Email", "Phone", "Department", "Select Department", "Role", "Select Role", "Status", "Active", "Inactive", "User Information", "Current Roles", "No roles assigned", "No roles available" |
| **masterData/Properties.jsx** | "Clear search", "Remove filter", "Delete value" |
| **adminSettings/InspectionChecklists.jsx** | Filter UI: "Remove filter", "Select column", "Search value", "Add filter", "Select type" |
| **TechnicianCertificates.jsx** | "Remove filter", "Select column", "Search value", "Add filter", "Select employee", "Select certificate" |
| **TechCertApprovals.jsx** | "Remove filter", "Select column", "Search value", "Add filter", "Select technician", "All technicians" |
| **masterData/CreateAssetTypeChecklistMapping.jsx** | Camera error message: "Could not access camera: ...", "Unknown error" |
| **AdminSettingsView.jsx** | Other default item labels/descriptions (e.g. "Job Roles", "Bulk Serial Number Print", "Maintenance Configuration", "Properties", etc.) besides Column Access Config |
| **ReportsBreakdown.jsx** | "Unknown error" in error handling |
| **ScrapSales.jsx** | "Delete failed" in error message |
| **MaintenanceSupervisor.jsx** | "Export failed" |
| **MaintenanceApproval.jsx** | "Export failed" |
| **InspectionView.jsx** | "Export failed" |

**Did we add it there?** **No** – these were left as-is and only listed for future i18n work.

---

## 4. Summary Table

| Item | Was it missing? | Did we add/fix it? |
|------|------------------|--------------------|
| 240 keys in German (de.json) | Yes | Yes – merged from en into de |
| Header titles (inspection checklists, frequency, product/service, roles, properties, breakdown reason codes) | Yes (hardcoded) | Yes – new keys + `t()` in Header |
| Column Access Configuration page title | Yes (hardcoded) | Yes – new key + `t()` in ColumnAccessConfig |
| Inspection Checklists List page title | Yes (hardcoded) | Yes – new key + `t()` in InspectionChecklists |
| AdminSettingsView "Column Access Config" label | Yes (hardcoded) | Yes – use existing `t('navigation.columnAccessConfig')` |
| Certifications, UserRoles, Properties, TechCert, etc. (remaining hardcoded strings) | Yes | No – documented only |

---

## 5. How to Re-run the Merge (if en gains new keys later)

From project root:

```bash
node scripts/merge-i18n-de.cjs
```

This only adds keys that exist in `en.json` but not in `de.json`; it does not overwrite existing German values.
