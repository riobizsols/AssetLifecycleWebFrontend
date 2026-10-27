// @ts-check

/**
 * Screens under sidebar → Consumables.
 * CONSUMABLESREPORT lives under Reports (/reports/consumables).
 */
export const CONSUMABLES_SIDEBAR = [
  {
    id: 'CONSUMABLESMASTER',
    name: 'Consumables',
    sidebar: 'Consumables',
    path: '/consumables/master',
    title: 'Consumables',
    tableTitle: 'Consumables',
    empty: 'No consumables yet. Add one to get started.',
    addName: 'Add consumable',
    readyText: 'Total items',
    columns: ['Consumable', 'UOM', 'Branch', 'Stock entries'],
    stats: ['Total items', 'With stock', 'No stock entries', 'Units in use'],
    kind: 'master',
  },
  {
    id: 'CONSUMABLESINVENTORY',
    name: 'Consumables Inventory',
    sidebar: 'Consumables Inventory',
    path: '/consumables/inventory',
    title: 'Consumables inventory',
    tableTitle: 'Stock on hand',
    empty: 'No stock recorded yet.',
    addName: 'Add stock',
    readyText: 'Stock entries',
    columns: ['Consumable', 'Branch', 'On hand', 'Min stock', 'Reorder at', 'Last restocked', 'Status'],
    stats: ['Stock entries', 'Reorder', 'Low stock', 'Out of stock'],
    kind: 'inventory',
  },
  {
    id: 'CONSUMABLESUSAGE',
    name: 'Consumables Usage',
    sidebar: 'Consumables Usage',
    path: '/consumables/usage',
    title: 'Consumables usage',
    tableTitle: 'Allocations',
    empty: 'No allocations recorded yet.',
    addName: 'Allocate',
    readyText: 'Allocations',
    columns: ['Consumable', 'Department', 'Allocated', 'Balance after', 'Date'],
    stats: ['Allocations', 'This month', 'Departments served', 'Items allocated'],
    kind: 'usage',
  },
];
