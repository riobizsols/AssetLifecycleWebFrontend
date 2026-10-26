// @ts-check

/**
 * Screens under sidebar → Admin Settings.
 *
 * AdminSettingsLayout (/adminsettings/configuration/*) shows the 12 config
 * modules. The main-app sidebar shows Audit Logs + Audit Log Config.
 * Text Messages is a hub card, not a sidebar child.
 * One Time Cron lives under Master Data in admin-settings mode.
 */

export const ADMIN_SETTINGS_HUB = {
  id: 'ADMINSETTINGS',
  name: 'Configuration hub',
  sidebar: 'Admin Settings',
  path: '/adminsettings/configuration',
  title: 'Admin Settings',
  marker: 'Centralized control center for system configuration',
  loading: 'Loading admin settings...',
  empty: 'Access Restricted',
};

/** Children of Admin Settings while inside AdminSettingsLayout. */
export const ADMIN_SETTINGS_MODULES = [
  {
    id: 'USERROLES',
    name: 'Job Roles',
    sidebar: 'Job Roles',
    path: '/adminsettings/configuration/job-roles',
    title: 'Job Roles',
    marker: 'Job Roles',
    kind: 'contentbox',
    tabs: ['Job Roles', 'Role Navigation'],
    columns: ['Role Name', 'Job Function', 'Status'],
    empty: /No job roles found|No navigation entries found/,
  },
  {
    id: 'COLUMNACCESSCONFIG',
    name: 'Column Access Config',
    sidebar: 'Column Access Config',
    path: '/adminsettings/configuration/data-config',
    title: 'Column Access Configuration',
    marker: 'Column Access Configuration',
    kind: 'column-access',
    empty: 'No columns found for this table.',
  },
  {
    id: 'BULKSERIALNUMBERPRINT',
    name: 'Bulk Serial Number Print',
    sidebar: 'Bulk Serial Number Print',
    path: '/adminsettings/configuration/bulk-serial-number-print',
    title: 'Bulk Serial Number Print',
    marker: 'Step 1: Select Asset Type',
    kind: 'bulk-print',
    empty: /No assets found/,
  },
  {
    id: 'MAINTENANCECONFIG',
    name: 'Maintenance Configuration',
    sidebar: 'Maintenance Configuration',
    path: '/adminsettings/configuration/maintenance-config',
    title: 'Maintenance Configuration',
    marker: 'Maintenance Details',
    kind: 'maint-config',
    tabs: ['Maintenance Details', 'Maintenance Frequency'],
    empty: /No workflow steps created yet|No maintenance frequencies created yet/,
  },
  {
    id: 'PROPERTIES',
    name: 'Properties',
    sidebar: 'Properties',
    path: '/adminsettings/configuration/properties',
    title: 'Properties',
    marker: 'Filter Properties',
    kind: 'properties',
    columns: ['Property Name', 'List Values', 'Actions'],
    empty: /No properties created yet|No properties match your search/,
  },
  {
    id: 'BREAKDOWNREASONCODES',
    name: 'Breakdown Reason Codes',
    sidebar: 'Breakdown Reason Codes',
    path: '/adminsettings/configuration/breakdown-reason-codes',
    title: 'Breakdown Reason Codes',
    marker: { column: 'Reason Code' },
    kind: 'contentbox',
    columns: ['Asset Type', 'Reason Code'],
    empty: 'No breakdown reason codes found',
  },
  {
    id: 'CERTIFICATIONS',
    name: 'Certifications',
    sidebar: 'Certifications',
    path: '/adminsettings/configuration/certifications',
    title: 'Certifications',
    marker: 'Existing Certificates',
    kind: 'certs',
    tabs: ['Certificate', 'Maintenance Certificate', 'Inspection Certificates'],
    empty: /No certificates found|No certificates mapped|No inspection certificates found/,
  },
  {
    id: 'INSPECTIONFREQUENCY',
    name: 'Inspection Frequency',
    sidebar: 'Inspection Frequency',
    path: '/adminsettings/configuration/inspection-frequency',
    title: 'Inspection Frequency',
    marker: { column: 'Frequency' },
    kind: 'contentbox',
    columns: ['Asset Type', 'Asset Name', 'Frequency', 'Maintained By', 'Description'],
    empty: null,
    childPath: '/adminsettings/configuration/inspection-frequency/create',
    childTitle: 'Create Inspection Frequency',
  },
  {
    id: 'INSPECTIONCHECKLISTS',
    name: 'Inspection Checklist',
    sidebar: 'Inspection Checklist',
    path: '/adminsettings/configuration/inspection-checklists',
    title: 'Inspection Checklists',
    marker: 'Inspection Checklists List',
    kind: 'checklists',
    columns: ['Question', 'Response Type', 'Expected Value', 'Min Range', 'Max Range'],
    empty: 'No inspection checklists found.',
  },
  {
    id: 'ASSETTYPECHECKLISTMAPPING',
    name: 'Asset Type - Inspection Checklist Mapping',
    sidebar: 'Asset Type - Inspection Checklist Mapping',
    path: '/adminsettings/configuration/asset-type-checklist-mapping',
    title: 'Asset Type - Inspection CheckList mapping',
    marker: { column: 'Total Questions' },
    kind: 'contentbox',
    columns: ['Asset Type', 'Asset Name (Specific)', 'Total Questions'],
    empty: null,
    childPath: '/adminsettings/configuration/asset-type-checklist-mapping/create',
    childTitle: 'Create New Asset Type - Checklist Mapping',
  },
  {
    id: 'OPCCONFIG',
    name: 'OPC Configuration',
    sidebar: 'OPC Configuration',
    path: '/adminsettings/configuration/opc-configuration',
    title: 'OPC Configuration',
    marker: 'Components',
    kind: 'opc',
    tabs: ['Components', 'Component-Tag Mapping', 'Conditions'],
    empty: /No components found|No tag mappings found|No condition rules found/,
  },
  {
    id: 'JOBMONITOR',
    name: 'Job Monitor',
    sidebar: 'Job Monitor',
    path: '/adminsettings/configuration/job-monitor',
    title: 'Job Monitor',
    marker: 'Job List',
    kind: 'jobs',
    columns: ['Job Name', 'Frequency', 'Status', 'Action'],
    empty: 'No history found',
  },
];

/** Main-app sidebar children of Admin Settings. */
export const ADMIN_SETTINGS_AUDIT = [
  {
    id: 'AUDITLOGS',
    name: 'Audit Logs',
    sidebar: 'Audit Logs',
    path: '/audit-logs-view',
    title: 'Audit Logs',
    marker: 'Total Records:',
    kind: 'audit',
    columns: ['Timestamp', 'User Name', 'Application', 'Event', 'Description'],
    empty: 'No audit logs found',
  },
  {
    id: 'AUDITLOGCONFIG',
    name: 'Audit Log Config',
    sidebar: 'Audit Log Config',
    path: '/audit-logs-view/config',
    title: 'Config',
    marker: { column: 'App & Event' },
    kind: 'audit-config',
    columns: ['App & Event', 'Status', 'Reporting Required', 'Email'],
    empty: 'No configurations found',
  },
];

export const ADMIN_SETTINGS_HUB_EXTRA = [
  {
    id: 'TEXTMESSAGES',
    name: 'Text Messages',
    sidebar: 'Text Messages',
    path: '/adminsettings/configuration/text-messages',
    title: 'Text Messages (English → Other Language)',
    marker: 'Text Messages (English → Other Language)',
    kind: 'text-messages',
    empty: 'No messages found.',
  },
];
