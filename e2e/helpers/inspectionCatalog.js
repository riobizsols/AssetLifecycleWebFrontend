// @ts-check

/**
 * Screens under sidebar → Inspection, plus child routes opened from those lists.
 * INSPECTION (legacy) and INSPECTIONVIEW both land on /inspection-view.
 */

export const INSPECTION_SIDEBAR = [
  {
    id: 'INSPECTIONAPPROVAL',
    name: 'Inspection Approval',
    path: '/inspection-approval',
    title: 'Inspection Approval',
    marker: 'Scheduled Date',
    kind: 'list',
    hasAdd: false,
    hasDownload: true,
    hasDelete: false,
    dateFilter: true,
    columns: [
      'Asset Code',
      'Asset Type',
      'Serial Number',
      'Scheduled Date',
      'Status',
      'Branch',
      'Job Role',
    ],
    searchColumns: ['Asset Code', 'Asset Type', 'Serial Number', 'Branch', 'Job Role'],
    statusFilter: {
      column: 'Status',
      options: ['IN', 'PN', 'AP', 'RJ', 'CO'],
      matchColumn: false,
    },
  },
  {
    id: 'INSPECTIONVIEW',
    name: 'Inspection View',
    path: '/inspection-view',
    title: 'Inspection View',
    marker: 'Outcome',
    kind: 'list',
    hasAdd: true,
    hasDownload: true,
    hasDelete: false,
    dateFilter: true,
    columns: [
      'ID',
      'Asset Code',
      'Asset Type',
      'Serial Number',
      'Start Date',
      'End Date',
      'Vendor',
      'Status',
      'Outcome',
      'Created On',
      'Created By',
    ],
    searchColumns: ['Asset Code', 'Asset Type', 'Serial Number', 'Vendor'],
    statusFilter: {
      column: 'Status',
      options: ['Initiated', 'In Progress', 'Completed', 'Cancelled'],
      matchColumn: true,
    },
    outcomeFilter: {
      column: 'Outcome',
      options: ['Passed', 'Failed', 'Partial', 'Pending'],
      matchColumn: true,
    },
  },
];

export const INSPECTION_CHILD_SCREENS = [
  {
    id: 'CREATE_MANUAL',
    name: 'Trigger Inspection for Asset',
    path: '/inspection-view/create',
    title: 'Trigger Inspection for Asset',
    parent: 'INSPECTIONVIEW',
    kind: 'create',
  },
];
