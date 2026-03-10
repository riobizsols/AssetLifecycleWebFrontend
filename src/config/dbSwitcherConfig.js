/**
 * Database Switcher – allowed database names for the internal DB connection screen.
 * Only the database name in the connection URL is changed; host, port, user, etc. stay the same.
 *
 * Replace this list with an API call later if you want to fetch from backend.
 */
export const DB_SWITCHER_DATABASES = [
  { id: "asset_lifecycle_dev", name: "asset_lifecycle_dev", description: "Development" },
  { id: "asset_lifecycle_staging", name: "asset_lifecycle_staging", description: "Staging" },
  { id: "asset_lifecycle_prod", name: "asset_lifecycle_prod", description: "Production" },
];
