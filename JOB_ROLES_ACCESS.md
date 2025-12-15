# 🔐 Job Roles Management - Access Guide

## 🌐 How to Access the UI

### Direct URL Access
```
http://localhost:5173/master-data/job-roles
```

### Via Navigation Menu
Look for **"Job Roles"** under the **Master Data** section in your navigation menu.

---

## 📋 What You Can Do

### 1. View All Job Roles
The main screen displays a table with all existing job roles including:
- Job Role ID
- Role Name
- Job Function
- Status

### 2. Create New Job Role
1. Click the **"+ Add New Role"** button (top-right corner)
2. **Tab 1 - Role Details**:
   - Enter Job Role ID (e.g., JR010)
   - Enter Role Name (e.g., "Asset Manager")
   - Enter Job Function (optional description)
3. **Tab 2 - Navigation Access**:
   - Select navigation items (checkboxes)
   - Set access level for each:
     - **Display Only** - View access
     - **Full Access (Edit)** - Edit permissions
   - Choose platform (Desktop/Mobile/Both)
4. Click **"Save Job Role"**

### 3. Edit Existing Job Role
1. Click the **edit icon** (✏️) on any job role row
2. Modify any details in Tab 1
3. Add/remove navigation items in Tab 2
4. Change access levels as needed
5. Click **"Save Job Role"**

---

## 🔒 Access Requirements

**Required Permission**: `USERROLES` app ID with auth access

If you don't see the "+ Add New Role" button or edit icons, you may not have edit permissions for this screen.

**Note**: Make sure the `USERROLES` app ID exists in your `tblAppId` table and is assigned to your job role in `tblJobRoleNav`.

---

## 🎯 Quick Test

### Test 1: Access the Page
```
1. Open browser
2. Go to: http://localhost:5173/master-data/job-roles
3. You should see the Job Roles Management page
```

### Test 2: Create a Test Role
```
1. Click "+ Add New Role"
2. Enter:
   - Job Role ID: JR999
   - Role Name: Test Manager
3. Switch to "Navigation Access" tab
4. Select a few items
5. Click "Save"
6. Verify it appears in the table
```

---

## 📊 Features Available

| Feature | Description |
|---------|-------------|
| ✅ List Roles | View all job roles in table |
| ✅ Search & Filter | Find specific roles |
| ✅ Export to Excel | Download role data |
| ✅ Create New | Add new job role with navigation |
| ✅ Edit Existing | Modify role and navigation |
| ✅ Two-Tab Interface | Details & Navigation tabs |
| ✅ Access Control | Display vs Auth permissions |
| ✅ Platform Selection | Desktop/Mobile/Both |

---

## 🚀 Backend API (Already Connected)

The frontend connects to:
```
GET    /api/job-roles
POST   /api/job-roles
PUT    /api/job-roles/:jobRoleId
GET    /api/job-roles/available-app-ids
GET    /api/job-roles/:jobRoleId/navigation
```

All endpoints are working and ready!

---

## 🎉 You're All Set!

Navigate to the page and start managing job roles:
```
http://localhost:5173/master-data/job-roles
```

**Status**: ✅ Ready to Use  
**Route Added**: `/master-data/job-roles`

