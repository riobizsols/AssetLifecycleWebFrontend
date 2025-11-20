import API from "../lib/axios";

export const fetchSetupCatalog = async () => {
  const response = await API.get("/setup/catalog");
  return response.data?.data || {
    assetTypes: [],
    prodServices: [],
    orgSettings: [],
    auditEvents: [],
  };
};

export const testSetupConnection = async (dbConfig) => {
  const response = await API.post("/setup/test-connection", { db: dbConfig });
  return response.data;
};

export const runSetupWizard = async (payload) => {
  const response = await API.post("/setup/run", payload, {
    timeout: 600000, // allow up to 10 minutes for schema creation + seeding
  });
  return response.data;
};

