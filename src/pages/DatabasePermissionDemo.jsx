import { useNavigation } from "../hooks/useNavigation";
import DatabasePermissionButton from "../components/DatabasePermissionButton";

const DatabasePermissionDemo = () => {
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
        getNavigationItem,
        getAccessLevelLabel,
        getAccessLevelColor 
    } = useNavigation();

    const features = [
        { appId: 'ASSETS', name: 'Assets Management' },
        { appId: 'MAINTENANCE', name: 'Maintenance' },
        { appId: 'USERS', name: 'User Management' },
        { appId: 'ADMINSETTINGS', name: 'Admin Settings' },
        { appId: 'REPORTS', name: 'Reports' },
        { appId: 'MAINTENANCEAPPROVAL', name: 'Maintenance Approval' }
    ];

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex justify-center items-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                        <p>Loading navigation data...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <strong>Error:</strong> {error}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Database-Driven Permission System Demo</h1>
                
                {/* Navigation Data Display */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h2 className="text-xl font-semibold mb-2">Current Navigation Structure</h2>
                    <p className="text-sm text-gray-600 mb-2">
                        This data is fetched from the tblJobRoleNav table based on your job role.
                    </p>
                    <div className="bg-white rounded p-3 text-sm">
                        <pre className="whitespace-pre-wrap overflow-x-auto">
                            {JSON.stringify(navigation, null, 2)}
                        </pre>
                    </div>
                </div>

                {/* Permission Matrix */}
                <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-xl font-semibold">Permission Matrix</h2>
                        <p className="text-gray-600">Your current permissions for different features</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Feature
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        App ID
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Access Level
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Can View
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Can Edit
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Can Delete
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {features.map(feature => {
                                    const accessLevel = getAccessLevel(feature.appId);
                                    const navigationItem = getNavigationItem(feature.appId);
                                    
                                    return (
                                        <tr key={feature.appId} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {feature.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {feature.appId}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {accessLevel ? (
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        accessLevel === 'A' ? 'bg-green-100 text-green-800' :
                                                        accessLevel === 'D' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                        {getAccessLevelLabel(accessLevel)} ({accessLevel})
                                                    </span>
                                                ) : (
                                                    <span className="text-red-600">No Access</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {canView(feature.appId) ? 
                                                    <span className="text-green-600">✓ Yes</span> : 
                                                    <span className="text-red-600">✗ No</span>
                                                }
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {canEdit(feature.appId) ? 
                                                    <span className="text-green-600">✓ Yes</span> : 
                                                    <span className="text-red-600">✗ No</span>
                                                }
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {canDelete(feature.appId) ? 
                                                    <span className="text-green-600">✓ Yes</span> : 
                                                    <span className="text-red-600">✗ No</span>
                                                }
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Action Buttons Demo */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Action Buttons Demo</h2>
                    <p className="text-gray-600 mb-4">
                        These buttons will only appear if you have the required permissions:
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="border rounded-lg p-4">
                            <h3 className="font-medium mb-2">Assets Management</h3>
                            <div className="space-y-2">
                                <DatabasePermissionButton 
                                    appId="ASSETS" 
                                    permission="view"
                                    className="w-full bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600"
                                >
                                    View Assets
                                </DatabasePermissionButton>
                                
                                <DatabasePermissionButton 
                                    appId="ASSETS" 
                                    permission="create"
                                    className="w-full bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600"
                                >
                                    Add Asset
                                </DatabasePermissionButton>
                                
                                <DatabasePermissionButton 
                                    appId="ASSETS" 
                                    permission="delete"
                                    className="w-full bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600"
                                >
                                    Delete Assets
                                </DatabasePermissionButton>
                            </div>
                        </div>

                        <div className="border rounded-lg p-4">
                            <h3 className="font-medium mb-2">Maintenance</h3>
                            <div className="space-y-2">
                                <DatabasePermissionButton 
                                    appId="MAINTENANCE" 
                                    permission="view"
                                    className="w-full bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600"
                                >
                                    View Maintenance
                                </DatabasePermissionButton>
                                
                                <DatabasePermissionButton 
                                    appId="MAINTENANCE" 
                                    permission="edit"
                                    className="w-full bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600"
                                >
                                    Schedule Maintenance
                                </DatabasePermissionButton>
                                
                                <DatabasePermissionButton 
                                    appId="MAINTENANCE" 
                                    permission="delete"
                                    className="w-full bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600"
                                >
                                    Manage Maintenance
                                </DatabasePermissionButton>
                            </div>
                        </div>

                        <div className="border rounded-lg p-4">
                            <h3 className="font-medium mb-2">Admin Settings</h3>
                            <div className="space-y-2">
                                <DatabasePermissionButton 
                                    appId="ADMINSETTINGS" 
                                    permission="view"
                                    className="w-full bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600"
                                >
                                    View Settings
                                </DatabasePermissionButton>
                                
                                <DatabasePermissionButton 
                                    appId="ADMINSETTINGS" 
                                    permission="edit"
                                    className="w-full bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600"
                                >
                                    Modify Settings
                                </DatabasePermissionButton>
                                
                                <DatabasePermissionButton 
                                    appId="ADMINSETTINGS" 
                                    permission="delete"
                                    className="w-full bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600"
                                >
                                    System Admin
                                </DatabasePermissionButton>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Access Level Legend */}
                <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Access Level Legend</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center">
                            <div className="w-4 h-4 bg-green-400 rounded-full mr-3"></div>
                            <div>
                                <div className="font-medium">Full Access (A)</div>
                                <div className="text-sm text-gray-600">Can view and edit</div>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <div className="w-4 h-4 bg-yellow-400 rounded-full mr-3"></div>
                            <div>
                                <div className="font-medium">Read Only (D)</div>
                                <div className="text-sm text-gray-600">Can view only</div>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <div className="w-4 h-4 bg-red-400 rounded-full mr-3"></div>
                            <div>
                                <div className="font-medium">No Access</div>
                                <div className="text-sm text-gray-600">Cannot access</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Database Structure Info */}
                <div className="bg-blue-50 rounded-lg p-6 mt-6">
                    <h2 className="text-xl font-semibold mb-4">Database Structure</h2>
                    <p className="text-gray-700 mb-4">
                        This permission system is based on the following database tables:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-700">
                        <li><strong>tblUserJobRoles:</strong> Links users to their job roles</li>
                        <li><strong>tblJobRoleNav:</strong> Defines navigation items and permissions for each job role</li>
                        <li><strong>Access Levels:</strong> A (Full Access), D (Read Only), NULL (No Access)</li>
                        <li><strong>Group Structure:</strong> Parent-child relationships using Parent ID</li>
                        <li><strong>Sequence:</strong> Ordering of navigation items</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default DatabasePermissionDemo; 