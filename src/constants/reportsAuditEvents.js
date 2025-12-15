/**
 * Reports Audit Events Constants
 * Contains app IDs and helper functions for reports audit logging
 */

// App IDs for different report types
export const REPORTS_APP_IDS = {
  ASSET_LIFECYCLE_REPORT: 'ASSETLIFECYCLEREPORT',
  ASSET_REPORT: 'ASSETREPORT',
  MAINTENANCE_HISTORY: 'MAINTENANCEHISTORY',
  ASSET_VALUATION: 'ASSETVALUATION',
  ASSET_WORKFLOW_HISTORY: 'ASSETWORKFLOWHISTORY',
  BREAKDOWN_HISTORY: 'BREAKDOWNHISTORY',
  USAGE_BASED_ASSET_REPORT: 'USAGEBASEDASSETREPORT',
  SLA_REPORT: 'SLAREPORT',
  QA_AUDIT_REPORT: 'QAAUDITREPORT'
};

/**
 * Get event description by event name
 * @param {string} eventName - The event name (e.g., 'Generate Report', 'Export Report')
 * @returns {string} - The event description
 */
export const getEventDescription = (eventName) => {
  const descriptions = {
    'Generate Report': 'Report Generated',
    'Export Report': 'Report Exported'
  };
  
  return descriptions[eventName] || eventName;
};

/**
 * Get event ID by event name
 * @param {string} eventName - The event name
 * @returns {string|null} - The event ID or null if not found
 */
export const getEventIdByName = (eventName) => {
  const eventMap = {
    'Generate Report': 'Eve023',
    'Export Report': 'Eve024'
  };
  
  return eventMap[eventName] || null;
};

/**
 * Get all available event names for reports
 * @returns {string[]} - Array of event names
 */
export const getEventNames = () => {
  return ['Generate Report', 'Export Report'];
};

/**
 * Check if an event is valid for reports
 * @param {string} eventName - The event name to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidEvent = (eventName) => {
  return getEventNames().includes(eventName);
};

/**
 * Get app ID for a specific report type
 * @param {string} reportType - The report type
 * @returns {string|null} - The app ID or null if not found
 */
export const getAppIdForReport = (reportType) => {
  const reportTypeMap = {
    'asset-lifecycle': REPORTS_APP_IDS.ASSET_LIFECYCLE_REPORT,
    'asset-register': REPORTS_APP_IDS.ASSET_REPORT,
    'maintenance-history': REPORTS_APP_IDS.MAINTENANCE_HISTORY,
    'asset-valuation': REPORTS_APP_IDS.ASSET_VALUATION,
    'asset-workflow-history': REPORTS_APP_IDS.ASSET_WORKFLOW_HISTORY,
    'breakdown-history': REPORTS_APP_IDS.BREAKDOWN_HISTORY,
    'usage-based-asset': REPORTS_APP_IDS.USAGE_BASED_ASSET_REPORT,
    'sla-report': REPORTS_APP_IDS.SLA_REPORT
  };
  
  return reportTypeMap[reportType] || null;
};

export default {
  REPORTS_APP_IDS,
  getEventDescription,
  getEventIdByName,
  getEventNames,
  isValidEvent,
  getAppIdForReport
};
