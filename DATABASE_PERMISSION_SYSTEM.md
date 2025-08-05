# Database-Driven Permission System

## Overview

This system implements a flexible, database-driven role-based access control (RBAC) system based on the `tblJobRoleNav` table structure. The system dynamically loads navigation items and permissions from the database, allowing for granular control over user access to different features.

## Database Structure

### tblUserJobRoles
Links users to their job roles:
```sql
CREATE TABLE "tblUserJobRoles" (
    user_id VARCHAR PRIMARY KEY,
    job_role_id VARCHAR NOT NULL,
    assigned_by VARCHAR,
    assigned_on DATE,
    updated_by VARCHAR,
    updated_on DATE,
    int_status INTEGER DEFAULT 1
);
```

### tblJobRoleNav
Defines navigation items and permissions for each job role:
```sql
CREATE TABLE "tblJobRoleNav" (
    id VARCHAR PRIMARY KEY,
    int_status INTEGER DEFAULT 1,
    job_role_id VARCHAR NOT NULL,
    parent_id VARCHAR,
    app_id VARCHAR NOT NULL,
    label VARCHAR NOT NULL,
    is_group BOOLEAN DEFAULT FALSE,
    seq INTEGER DEFAULT 10,
    access_level CHAR(1), -- 'A' for full access, 'D' for read-only, NULL for no access
    mobile_desktop CHAR(1) DEFAULT 'D'
);
```

## Access Levels

- **A (Authorized)**: Full access - can view and edit
- **D (Display)**: Read-only access - can view only
- **NULL**: No access - item is hidden

## API Endpoints

### User Navigation
- `GET /api/navigation/user/navigation` - Get user's navigation based on their job role
- `GET /api/navigation/user/job-role` - Get user's job role information

### Admin Management
- `GET /api/navigation/all-navigation` - Get all navigation items (admin only)
- `GET /api/navigation/job-role/:job_role_id/navigation` - Get navigation for specific job role
- `POST /api/navigation/navigation` - Create navigation item
- `PUT /api/navigation/navigation/:id` - Update navigation item
- `DELETE /api/navigation/navigation/:id` - Delete navigation item

### User Management
- `GET /api/navigation/users/job-roles` - Get all users with their job roles
- `POST /api/navigation/users/assign-job-role` - Assign job role to user

## Frontend Usage

### Using the Navigation Hook

```javascript
import { useNavigation } from '../hooks/useNavigation';

const MyComponent = () => {
    const { 
        navigation, 
        loading, 
        error,
        hasAccess, 
        hasEditAccess, 
        canView, 
        canEdit, 
        canCreate, 
        canDelete,
        getAccessLevel,
        getNavigationItem 
    } = useNavigation();

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div>
            {canView('ASSETS') && (
                <div>Asset content</div>
            )}
            
            {canCreate('ASSETS') && (
                <button>Add Asset</button>
            )}
            
            {canDelete('ASSETS') && (
                <button>Delete Asset</button>
            )}
        </div>
    );
};
```

### Using Database Permission Button

```javascript
import DatabasePermissionButton from '../components/DatabasePermissionButton';

const MyComponent = () => {
    return (
        <div>
            <DatabasePermissionButton 
                appId="ASSETS" 
                permission="view"
                className="btn btn-primary"
            >
                View Assets
            </DatabasePermissionButton>
            
            <DatabasePermissionButton 
                appId="ASSETS" 
                permission="create"
                className="btn btn-success"
            >
                Add Asset
            </DatabasePermissionButton>
            
            <DatabasePermissionButton 
                appId="ASSETS" 
                permission="delete"
                className="btn btn-danger"
            >
                Delete Asset
            </DatabasePermissionButton>
        </div>
    );
};
```

### Using Database Sidebar

```javascript
import DatabaseSidebar from '../components/DatabaseSidebar';

const Layout = () => {
    return (
        <div className="flex">
            <DatabaseSidebar />
            <main className="flex-1">
                {/* Main content */}
            </main>
        </div>
    );
};
```

## App ID Mapping

The system maps `app_id` values to route paths:

| App ID | Route Path | Description |
|--------|------------|-------------|
| DASHBOARD | /dashboard | Dashboard |
| ASSETS | /assets | Assets Management |
| ADDASSET | /assets/add | Add Asset |
| VENDORS | /master-data/vendors | Manage Vendors |
| ASSETASSIGNMENT | /assign-department-assets | Asset Assignment |
| MAINTENANCE | /maintenance | Maintenance |
| INSPECTION | /inspection | Inspection |
| MAINTENANCEAPPROVAL | /maintenance-approval | Maintenance Approval |
| SUPERVISORAPPROVAL | /supervisor-approval | Supervisor Approval |
| REPORTS | /reports | Reports |
| ADMINSETTINGS | /admin-settings | Admin Settings |
| ORGANIZATIONS | /master-data/organizations | Organizations |
| ASSETTYPES | /master-data/asset-types | Asset Types |
| DEPARTMENTS | /master-data/departments | Departments |
| DEPARTMENTSADMIN | /master-data/departments-admin | Department Admins |
| DEPARTMENTSASSET | /master-data/departments-asset | Department Assets |
| BRANCHES | /master-data/branches | Branches |
| PRODSERV | /master-data/prod-serv | Products/Services |
| ROLES | /master-data/roles | Roles |
| USERS | /master-data/users | Users |
| MAINTENANCESCHEDULE | /master-data/maintenance-schedule | Maintenance Schedule |
| AUDITLOGS | /master-data/audit-logs | Audit Logs |

## Navigation Structure

The system supports hierarchical navigation with parent-child relationships:

### Group Structure
- Items with `is_group = TRUE` are parent groups
- Child items reference their parent via `parent_id`
- Groups can contain multiple child items

### Example Structure
```
Master Data (Group)
├── Add Asset (Child)
├── Manage Vendors (Child)
└── Asset Types (Child)

Asset Assignment (Group)
├── Department Assignment (Child)
└── Employee Assignment (Child)
```

## Setting Up Navigation Data

### 1. Create Job Roles
```sql
INSERT INTO "tblJobRoles" (job_role_id, text, job_function, int_status) 
VALUES ('JR001', 'System Admin', 'Full system access', 1);
```

### 2. Assign Users to Job Roles
```sql
INSERT INTO "tblUserJobRoles" (user_id, job_role_id, assigned_by, assigned_on, int_status)
VALUES ('USR001', 'JR001', 'ADMIN', CURRENT_DATE, 1);
```

### 3. Create Navigation Items
```sql
-- Create group
INSERT INTO "tblJobRoleNav" (id, job_role_id, app_id, label, is_group, seq, access_level)
VALUES ('JRN01', 'JR001', 'NUII', 'Master Data', TRUE, 10, NULL);

-- Create child items
INSERT INTO "tblJobRoleNav" (id, job_role_id, parent_id, app_id, label, is_group, seq, access_level)
VALUES ('JRN02', 'JR001', 'JRN01', 'ADDASSET', 'Add Asset', FALSE, 10, 'A');

INSERT INTO "tblJobRoleNav" (id, job_role_id, parent_id, app_id, label, is_group, seq, access_level)
VALUES ('JRN03', 'JR001', 'JRN01', 'VENDORS', 'Manage Vendors', FALSE, 20, 'A');
```

## Permission Checking Functions

### Frontend Functions
- `hasAccess(appId)`: Check if user has any access
- `hasEditAccess(appId)`: Check if user has edit access
- `canView(appId)`: Check if user can view
- `canEdit(appId)`: Check if user can edit
- `canCreate(appId)`: Check if user can create
- `canDelete(appId)`: Check if user can delete
- `getAccessLevel(appId)`: Get access level (A, D, or null)
- `getNavigationItem(appId)`: Get full navigation item data

### Backend Functions
- `getUserNavigation(user_id)`: Get user's navigation structure
- `getNavigationByJobRole(job_role_id)`: Get navigation for job role
- `getNavigationStructure(job_role_id)`: Get organized navigation structure

## Visual Indicators

The sidebar includes visual indicators for access levels:

- 🟢 **Green Shield**: Full Access (A)
- 🟡 **Yellow Eye**: Read Only (D)  
- 🔴 **Red Lock**: No Access

## Best Practices

1. **Always check permissions** before showing action buttons
2. **Use the navigation hook** for consistent permission checking
3. **Apply backend validation** to all API endpoints
4. **Test with different job roles** to ensure proper access control
5. **Use app_id consistently** across frontend and backend
6. **Group related features** using parent-child relationships
7. **Set appropriate access levels** based on user roles

## Troubleshooting

### Common Issues

1. **Navigation not loading**: Check if user has a job role assigned
2. **Buttons not appearing**: Verify app_id matches database entries
3. **API 403 errors**: Check if navigation middleware is applied
4. **Permission not updating**: Ensure job role assignment is correct

### Debugging

```javascript
// Add this to debug navigation issues
const { navigation, getAccessLevel, getNavigationItem } = useNavigation();
console.log('Navigation data:', navigation);
console.log('Assets access level:', getAccessLevel('ASSETS'));
console.log('Assets navigation item:', getNavigationItem('ASSETS'));
```

## Migration from Hardcoded System

To migrate from the hardcoded permission system:

1. **Create database tables** with the structure shown above
2. **Populate navigation data** for each job role
3. **Update components** to use `useNavigation` hook
4. **Replace hardcoded buttons** with `DatabasePermissionButton`
5. **Update sidebar** to use `DatabaseSidebar`
6. **Test thoroughly** with different user roles

## Adding New Features

To add a new feature to the permission system:

1. **Add app_id mapping** in `DatabaseSidebar.jsx`
2. **Create database entries** in `tblJobRoleNav`
3. **Update route mapping** if needed
4. **Test with different roles** to ensure proper access control
5. **Document the new feature** in this guide 