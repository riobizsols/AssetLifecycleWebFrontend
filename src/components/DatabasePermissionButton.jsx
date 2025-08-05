import { useNavigation } from "../hooks/useNavigation";

const DatabasePermissionButton = ({ 
    children, 
    appId, 
    permission = "view", 
    className = "", 
    disabled = false,
    ...props 
}) => {
    const { hasAccess, hasEditAccess, canView, canEdit, canCreate, canDelete } = useNavigation();

    // Check if user has required permission
    let hasPermission = false;
    switch (permission) {
        case "view":
            hasPermission = canView(appId);
            break;
        case "edit":
            hasPermission = canEdit(appId);
            break;
        case "create":
            hasPermission = canCreate(appId);
            break;
        case "delete":
            hasPermission = canDelete(appId);
            break;
        default:
            hasPermission = canView(appId);
    }

    // If user doesn't have permission, don't render the button
    if (!hasPermission) {
        return null;
    }

    return (
        <button 
            className={className} 
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
};

export default DatabasePermissionButton; 