import { useEffect, useMemo, useState, useRef } from "react";
import { toast } from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Copy,
  Database,
  Download,
  ExternalLink,
  Loader2,
  ServerCog,
  Settings2,
  ShieldCheck,
  Upload,
  CheckSquare,
  Plus,
  Trash2,
} from "lucide-react";
import {
  fetchSetupCatalog,
  testSetupConnection,
  runSetupWizard,
  syncDatabaseKeys,
} from "../../services/setupWizardService";

const wizardSteps = [
  { id: "db", title: "Database Connection", description: "Connect to your PostgreSQL instance" },
  { id: "master", title: "Master Data", description: "Select baseline master data" },
  { id: "org", title: "Organization Profile", description: "Brand, compliance & audit info" },
  { id: "structure", title: "Branches & Departments", description: "Model your organization hierarchy" },
  { id: "admin", title: "Admin & Security", description: "Create the primary admin & employee" },
  { id: "review", title: "Review & Launch", description: "Verify choices and run the wizard" },
];

const createDefaultBranch = (city) => ({
  tempId: uuidv4(),
  name: "Head Office",
  code: "HO",
  city: city || "Head Office",
  departments: [
    { tempId: uuidv4(), name: "Operations", code: "OPS" },
    { tempId: uuidv4(), name: "IT", code: "IT" },
    { tempId: uuidv4(), name: "Finance", code: "FIN" },
  ],
});

const createEmptyBranch = () => ({
  tempId: uuidv4(),
  name: "",
  code: "",
  city: "",
  departments: [],
});

const initialDbConfig = {
  host: "",
  port: 5432,
  database: "",
  user: "postgres",
  password: "",
};

const buildInitialOrgState = () => {
  const branch = createDefaultBranch("");
  return {
    name: "",
    code: "ORG001",
    city: "",
    address: "",
    gstNumber: "",
    cinNumber: "",
    auditEmail: "",
    logo: null,
    branches: [branch],
  };
};

const buildInitialAdminState = (org) => {
  const firstBranch = org.branches[0];
  const firstDept = firstBranch?.departments?.[0];
  return {
    fullName: "System Administrator",
    email: "",
    phone: "",
    username: "USR001",
    employeeCode: "EMP001",
    departmentTempId: firstDept?.tempId || null,
  };
};

const buildInitialStates = () => {
  const org = buildInitialOrgState();
  return {
    org,
    admin: buildInitialAdminState(org),
  };
};

const SetupWizard = () => {
  const initialStates = useMemo(buildInitialStates, []);
  const [catalog, setCatalog] = useState({
    assetTypes: [],
    prodServices: [],
    orgSettings: [],
    auditEvents: [],
  });
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [dbConfig, setDbConfig] = useState(initialDbConfig);
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState([]);
  const [selectedOrgSettings, setSelectedOrgSettings] = useState([]);
  const [selectedAuditEvents, setSelectedAuditEvents] = useState([]);
  const [selectedProdServices, setSelectedProdServices] = useState([]);
  const [organization, setOrganization] = useState(initialStates.org);
  const [adminUser, setAdminUser] = useState(initialStates.admin);
  const [options, setOptions] = useState({ createSchema: true, seedMasterData: true });
  const [bootstrappedSelections, setBootstrappedSelections] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runLogs, setRunLogs] = useState([]);
  const [setupSummary, setSetupSummary] = useState(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState(null);
  const [lastAddedBranchId, setLastAddedBranchId] = useState(null);
  const [isSyncingKeys, setIsSyncingKeys] = useState(false);
  const [keysSyncResult, setKeysSyncResult] = useState(null);
  const branchRefs = useRef({});

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        setLoadingCatalog(true);
        const data = await fetchSetupCatalog();
        console.log("Loaded catalog:", data);
        console.log("Org Settings count:", data.orgSettings?.length);
        setCatalog(data);
      } catch (error) {
        console.error("Failed to fetch setup catalog", error);
        toast.error("Unable to load default catalog. Please retry.");
      } finally {
        setLoadingCatalog(false);
      }
    };
    loadCatalog();
  }, []);

  useEffect(() => {
    if (!loadingCatalog && !bootstrappedSelections && catalog) {
      setSelectedAssetTypes((catalog.assetTypes || []).map((asset) => asset.id));
      setSelectedOrgSettings((catalog.orgSettings || []).map((setting) => setting.key));
      setSelectedAuditEvents((catalog.auditEvents || []).map((event) => event.id));
      setSelectedProdServices((catalog.prodServices || []).map((item) => item.id));
      setBootstrappedSelections(true);
    }
  }, [loadingCatalog, bootstrappedSelections, catalog]);

  useEffect(() => {
    const availableDeptIds = organization.branches.flatMap((branch) =>
      branch.departments.map((dept) => dept.tempId)
    );
    if (
      availableDeptIds.length &&
      (!adminUser.departmentTempId || !availableDeptIds.includes(adminUser.departmentTempId))
    ) {
      setAdminUser((prev) => ({
        ...prev,
        departmentTempId: availableDeptIds[0],
      }));
    }
  }, [organization.branches, adminUser.departmentTempId]);

  // Auto-scroll to newly added branch
  useEffect(() => {
    if (lastAddedBranchId && branchRefs.current[lastAddedBranchId]) {
      const branchElement = branchRefs.current[lastAddedBranchId];
      // Use setTimeout to ensure the DOM has updated
      setTimeout(() => {
        const rect = branchElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const elementHeight = rect.height;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // Check if there's enough space to center the element
        const spaceToCenter = Math.max(spaceAbove, spaceBelow);
        const canCenter = spaceToCenter >= elementHeight / 2;
        
        if (canCenter) {
          // Try to center the element
          branchElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        } else {
          // Ensure the element is fully visible
          // If element is near bottom, scroll to show it fully
          if (spaceBelow < elementHeight) {
            branchElement.scrollIntoView({
              behavior: "smooth",
              block: "end",
              inline: "nearest",
            });
          } else if (spaceAbove < 0) {
            // If element is above viewport, scroll to show it fully
            branchElement.scrollIntoView({
              behavior: "smooth",
              block: "start",
              inline: "nearest",
            });
          } else {
            // Element is visible, just ensure it's fully in view
            branchElement.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
              inline: "nearest",
            });
          }
        }
        setLastAddedBranchId(null); // Reset after scrolling
      }, 100);
    }
  }, [lastAddedBranchId, organization.branches]);

  const allDepartments = useMemo(
    () =>
      organization.branches.flatMap((branch) =>
        branch.departments.map((dept) => ({
          ...dept,
          branchLabel: branch.name,
        }))
      ),
    [organization.branches]
  );

  const selectedDept =
    allDepartments.find((dept) => dept.tempId === adminUser.departmentTempId) || allDepartments[0];

  const handleDbChange = (field, value) => {
    setDbConfig((prev) => ({
      ...prev,
      [field]: field === "port" ? Number(value) || 0 : value,
    }));
  };

  const handleToggleAssetType = (id) => {
    setSelectedAssetTypes((prev) =>
      prev.includes(id) ? prev.filter((assetId) => assetId !== id) : [...prev, id]
    );
  };

  const handleToggleOrgSetting = (key) => {
    setSelectedOrgSettings((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const handleToggleAuditEvent = (id) => {
    setSelectedAuditEvents((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleProdService = (id) => {
    setSelectedProdServices((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBranchChange = (index, field, value) => {
    setOrganization((prev) => {
      const updated = [...prev.branches];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return { ...prev, branches: updated };
    });
  };

  const addBranch = () => {
    const newBranch = createEmptyBranch();
    setLastAddedBranchId(newBranch.tempId);
    setOrganization((prev) => ({
      ...prev,
      branches: [...prev.branches, newBranch],
    }));
  };

  const removeBranch = (index) => {
    setOrganization((prev) => {
      if (prev.branches.length === 1) return prev;
      const updated = prev.branches.filter((_, idx) => idx !== index);
      return { ...prev, branches: updated };
    });
  };

  const handleDepartmentChange = (branchIndex, deptIndex, field, value) => {
    setOrganization((prev) => {
      const updatedBranches = [...prev.branches];
      const branch = updatedBranches[branchIndex];
      const updatedDepartments = [...branch.departments];
      updatedDepartments[deptIndex] = {
        ...updatedDepartments[deptIndex],
        [field]: value,
      };
      updatedBranches[branchIndex] = {
        ...branch,
        departments: updatedDepartments,
      };
      return { ...prev, branches: updatedBranches };
    });
  };

  const addDepartment = (branchIndex) => {
    setOrganization((prev) => {
      const updated = [...prev.branches];
      const branch = updated[branchIndex];
      updated[branchIndex] = {
        ...branch,
        departments: [
          ...branch.departments,
          { tempId: uuidv4(), name: "New Department", code: "DEPT" },
        ],
      };
      return { ...prev, branches: updated };
    });
  };

  const removeDepartment = (branchIndex, deptIndex) => {
    setOrganization((prev) => {
      const updated = [...prev.branches];
      const branch = updated[branchIndex];
      if (branch.departments.length === 1) {
        toast.error("Each branch must have at least one department.");
        return prev;
      }
      const deptToRemove = branch.departments[deptIndex];
      branch.departments = branch.departments.filter((_, idx) => idx !== deptIndex);
      updated[branchIndex] = { ...branch };
      if (deptToRemove.tempId === adminUser.departmentTempId) {
        const remaining = branch.departments[0];
        setAdminUser((prevAdmin) => ({
          ...prevAdmin,
          departmentTempId: remaining.tempId,
        }));
      }
      return { ...prev, branches: updated };
    });
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Logo must be smaller than 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setOrganization((prev) => ({
        ...prev,
        logo: {
          data: reader.result,
          fileName: file.name,
          mimeType: file.type,
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testSetupConnection(dbConfig);
      setTestResult(result);
      toast.success(`Connected to PostgreSQL ${result.serverVersion}`);
    } catch (error) {
      console.error("Connection test failed", error);
      setTestResult({ connected: false });
      toast.error(error.response?.data?.message || error.message || "Unable to connect to database.");
    } finally {
      setIsTesting(false);
    }
  };

  const buildPayload = () => {
    const selectedDepartment = organization.branches
      .flatMap((branch) =>
        branch.departments.map((dept) => ({
          ...dept,
          branchTempId: branch.tempId,
        }))
      )
      .find((dept) => dept.tempId === adminUser.departmentTempId);

    return {
      db: dbConfig,
      organization,
      adminUser: {
        ...adminUser,
        branchTempId: selectedDepartment?.branchTempId || organization.branches[0]?.tempId,
      },
      selections: {
        assetTypes: [], // Removed from UI
        prodServices: [], // Removed from UI
        orgSettings: selectedOrgSettings,
        auditEvents: selectedAuditEvents,
      },
      options,
    };
  };

  const handleRunSetup = async () => {
    if (!testResult?.connected) {
      toast.error("Please test and confirm the database connection before running the wizard.");
      setCurrentStep(0);
      return;
    }

    setIsRunning(true);
    setRunLogs([]);
    setSetupSummary(null);

    try {
      const payload = buildPayload();
      const result = await runSetupWizard(payload);

      if (!result.success) {
        throw new Error(result.message || "Setup wizard failed.");
      }

      setRunLogs(result.logs || []);
      setSetupSummary(result.summary || null);
      setAdminCredentials({
        username: result.adminUser?.username || 'rioadmin',
        email: adminUser.email,
        password: 'Initial1', // Default password (or from org settings)
      });
      setSetupComplete(true);
      setCurrentStep(wizardSteps.length); // Move to completion screen
      toast.success(`Setup completed successfully for ${result.orgId}`);
    } catch (error) {
      console.error("Setup wizard failed", error);
      toast.error(error.response?.data?.message || error.message || "Setup wizard failed.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === wizardSteps.length - 1) {
      await handleRunSetup();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep === 0) return;
    setCurrentStep((prev) => prev - 1);
  };

  const dbFieldsValid =
    dbConfig.host && dbConfig.database && dbConfig.user && dbConfig.password && dbConfig.port > 0;

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0:
        return dbFieldsValid && testResult?.connected;
      case 1:
        return true; // Master data step - no specific validation needed
      case 2:
        return organization.name.trim() && organization.code.trim() && organization.city.trim();
      case 3:
        return organization.branches.every(
          (branch) => branch.name.trim() && branch.departments.length > 0
        );
      case 4:
        return (
          adminUser.fullName.trim() &&
          adminUser.email.trim() &&
          adminUser.username.trim() &&
          !!adminUser.departmentTempId
        );
      case 5:
        return !isRunning;
      default:
        return true;
    }
  }, [
    currentStep,
    dbFieldsValid,
    testResult,
    organization,
    adminUser,
    isRunning,
  ]);

  const generateEnvFile = () => {
    const dbUrl = `postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port || 5432}/${dbConfig.database}`;
    return `# Database Configuration (Generated by Setup Wizard)
DATABASE_URL=${dbUrl}

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret_here_change_this_in_production

# Frontend URL (for CORS and email links)
FRONTEND_URL=http://localhost:5173

# Backend URL (for internal API calls)
BACKEND_URL=http://localhost:5000

# API Base URL
API_BASE_URL=http://localhost:5000/api
`;
  };

  const handleCopyEnv = () => {
    const envContent = generateEnvFile();
    navigator.clipboard.writeText(envContent);
    toast.success("Environment file copied to clipboard!");
  };

  const handleDownloadEnv = () => {
    const envContent = generateEnvFile();
    const blob = new Blob([envContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ".env";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Environment file downloaded!");
  };

  const handleCopyCredentials = (field) => {
    const value = adminCredentials[field];
    navigator.clipboard.writeText(value);
    toast.success(`${field === "password" ? "Password" : field === "username" ? "Username" : "Email"} copied to clipboard!`);
  };

  const handleSyncDatabaseKeys = async () => {
    if (!dbConfig.host || !dbConfig.database || !dbConfig.user || !dbConfig.password) {
      toast.error("Database configuration is missing. Cannot sync keys.");
      return;
    }

    setIsSyncingKeys(true);
    setKeysSyncResult(null);

    try {
      const result = await syncDatabaseKeys(dbConfig);
      
      if (result.success) {
        setKeysSyncResult({
          success: true,
          message: result.message || "Database keys synchronized successfully",
          summary: result.summary || {},
        });
        toast.success("Foreign and primary key relationships generated successfully!");
      } else {
        throw new Error(result.message || "Failed to synchronize database keys");
      }
    } catch (error) {
      console.error("Sync keys failed", error);
      setKeysSyncResult({
        success: false,
        message: error.response?.data?.message || error.message || "Failed to synchronize database keys",
      });
      toast.error(error.response?.data?.message || error.message || "Failed to synchronize database keys");
    } finally {
      setIsSyncingKeys(false);
    }
  };

  const renderStep = () => {
    // Completion screen
    if (setupComplete && currentStep >= wizardSteps.length) {
      return (
        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              <div>
                <h3 className="text-xl font-semibold text-emerald-900">Setup Complete!</h3>
                <p className="text-sm text-emerald-700">Your Asset Lifecycle Management system is ready to use.</p>
              </div>
            </div>
            {setupSummary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="bg-white rounded-lg p-3">
                  <div className="font-semibold text-emerald-900">{setupSummary.auditRules}</div>
                  <div className="text-emerald-600">Audit Rules</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="font-semibold text-emerald-900">{setupSummary.branches}</div>
                  <div className="text-emerald-600">Branches</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="font-semibold text-emerald-900">{setupSummary.departments}</div>
                  <div className="text-emerald-600">Departments</div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              Admin Credentials
            </h3>
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-amber-900 mb-2">⚠️ Save these credentials now!</p>
                <p className="text-xs text-amber-700">You won't be able to see the password again. Make sure to save it securely.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Username</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={adminCredentials?.username || ""}
                      className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono"
                    />
                    <button
                      onClick={() => handleCopyCredentials("username")}
                      className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50"
                      title="Copy username"
                    >
                      <Copy className="h-4 w-4 text-slate-600" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={adminCredentials?.email || ""}
                      className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => handleCopyCredentials("email")}
                      className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50"
                      title="Copy email"
                    >
                      <Copy className="h-4 w-4 text-slate-600" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Password</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={adminCredentials?.password || ""}
                      className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono"
                    />
                    <button
                      onClick={() => handleCopyCredentials("password")}
                      className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50"
                      title="Copy password"
                    >
                      <Copy className="h-4 w-4 text-slate-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <ServerCog className="h-5 w-5 text-indigo-600" />
              Configure Backend
            </h3>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                To access your system, you need to configure the backend server to use the database you just set up.
              </p>
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-2">Step 1: Update Backend Environment File</p>
                  <p className="text-xs text-slate-600 mb-3">
                    Copy or download the environment configuration file and place it in the <code className="bg-white px-1 py-0.5 rounded text-xs">AssetLifecycleBackend</code> directory as <code className="bg-white px-1 py-0.5 rounded text-xs">.env</code>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyEnv}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Copy className="h-4 w-4" />
                      Copy .env Content
                    </button>
                    <button
                      onClick={handleDownloadEnv}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="h-4 w-4" />
                      Download .env File
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-2">Step 2: Start Backend Server</p>
                  <div className="bg-slate-900 rounded-lg p-3 font-mono text-sm text-green-400">
                    <div>cd AssetLifecycleBackend</div>
                    <div>npm install  # if not already done</div>
                    <div>npm run dev</div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-2">Step 3: Start Frontend</p>
                  <div className="bg-slate-900 rounded-lg p-3 font-mono text-sm text-green-400">
                    <div>cd AssetLifecycleWebFrontend</div>
                    <div>npm install  # if not already done</div>
                    <div>npm run dev</div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-2">Step 4: Access the System</p>
                  <p className="text-xs text-slate-600 mb-2">
                    Once both servers are running, open your browser and navigate to:
                  </p>
                  <div className="bg-slate-900 rounded-lg p-3 font-mono text-sm text-green-400 mb-2">
                    http://localhost:5173
                  </div>
                  <p className="text-xs text-slate-600">
                    Login using the admin credentials shown above.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo-600" />
              Database Relationships
            </h3>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Generate foreign key and primary key relationships from the source database to your newly created database.
                This will ensure proper data integrity and relationships between tables.
              </p>
              
              {keysSyncResult && (
                <div className={`rounded-lg p-4 ${
                  keysSyncResult.success 
                    ? "bg-emerald-50 border border-emerald-200" 
                    : "bg-red-50 border border-red-200"
                }`}>
                  <div className="flex items-start gap-2">
                    {keysSyncResult.success ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${
                        keysSyncResult.success ? "text-emerald-900" : "text-red-900"
                      }`}>
                        {keysSyncResult.success ? "Success!" : "Error"}
                      </p>
                      <p className={`text-xs mt-1 ${
                        keysSyncResult.success ? "text-emerald-700" : "text-red-700"
                      }`}>
                        {keysSyncResult.message}
                      </p>
                      {keysSyncResult.summary && keysSyncResult.summary.primaryKeysApplied !== undefined && (
                        <div className="mt-2 text-xs text-emerald-700">
                          <p>Primary Keys Applied: {keysSyncResult.summary.primaryKeysApplied || 0}</p>
                          <p>Foreign Keys Applied: {keysSyncResult.summary.foreignKeysApplied || 0}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleSyncDatabaseKeys}
                disabled={isSyncingKeys}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSyncingKeys ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Relationships...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    Generate Foreign & Primary Key Relationships
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700"
            >
              Go to Login
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      );
    }

    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-600" />
                PostgreSQL Connection Details
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Provide the credentials for the target asset lifecycle database. We recommend using
                a dedicated database with owner privileges.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Host / IP Address</label>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. 10.20.30.40"
                  value={dbConfig.host}
                  onChange={(e) => handleDbChange("host", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Port</label>
                <input
                  type="number"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={dbConfig.port}
                  onChange={(e) => handleDbChange("port", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Database Name</label>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="asset_lifecycle"
                  value={dbConfig.database}
                  onChange={(e) => handleDbChange("database", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Username</label>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="postgres"
                  value={dbConfig.user}
                  onChange={(e) => handleDbChange("user", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Password</label>
                <input
                  type="password"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={dbConfig.password}
                  onChange={(e) => handleDbChange("password", e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleTestConnection}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 focus:outline-none disabled:opacity-60"
                disabled={isTesting || !dbFieldsValid}
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Testing...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" /> Test Connection
                  </>
                )}
              </button>

              {testResult && (
                <div
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                    testResult.connected
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {testResult.connected ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Connected (schema{" "}
                      {testResult.hasSchema ? "detected" : "pending"})
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4" /> Connection failed
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-10">
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Org Settings</h3>
                    <p className="text-sm text-slate-500">
                      Toggle the baseline organization settings that the wizard should pre-create.
                    </p>
                  </div>
                  {loadingCatalog ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  ) : (
                    <button
                      className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100 hover:border-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => setSelectedOrgSettings((catalog.orgSettings || []).map((item) => item.key))}
                      disabled={!catalog.orgSettings || catalog.orgSettings.length === 0}
                    >
                      <CheckSquare className="h-3 w-3" />
                      Select All
                    </button>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {loadingCatalog ? (
                    <p className="text-sm text-slate-500">Loading organization settings...</p>
                  ) : catalog.orgSettings && catalog.orgSettings.length > 0 ? (
                    catalog.orgSettings.map((setting) => (
                      <button
                        key={setting.key}
                        onClick={() => handleToggleOrgSetting(setting.key)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          selectedOrgSettings.includes(setting.key)
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {setting.key} · {setting.value}
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No organization settings available</p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Audit Log Coverage</h3>
                    <p className="text-sm text-slate-500">
                      Choose which audit log configurations should be enabled by default.
                    </p>
                  </div>
                  {loadingCatalog ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  ) : (
                    <button
                      className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100 hover:border-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => setSelectedAuditEvents((catalog.auditEvents || []).map((item) => item.id))}
                      disabled={!catalog.auditEvents || catalog.auditEvents.length === 0}
                    >
                      <CheckSquare className="h-3 w-3" />
                      Select All
                    </button>
                  )}
                </div>
                <div className="mt-4 space-y-3">
                  {loadingCatalog ? (
                    <p className="text-sm text-slate-500">Loading audit log events...</p>
                  ) : catalog.auditEvents && catalog.auditEvents.length > 0 ? (
                    catalog.auditEvents.map((event) => (
                      <label
                        key={event.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                          selectedAuditEvents.includes(event.id)
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAuditEvents.includes(event.id)}
                          onChange={() => handleToggleAuditEvent(event.id)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="font-semibold text-slate-900">
                            {event.description || event.id}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            App: {event.appId} · Event: {event.eventId}
                          </p>
                        </div>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No audit log events available</p>
                  )}
                </div>
              </div>
            </section>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Organization Identity</h3>
              <p className="text-sm text-slate-500">
                These values appear throughout the web, mobile and document templates. You can edit
                them later from Master Data → Organization.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Legal Name</label>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={organization.name}
                  onChange={(e) => setOrganization((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Organization Code</label>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={organization.code}
                  onChange={(e) =>
                    setOrganization((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Primary City</label>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={organization.city}
                  onChange={(e) => setOrganization((prev) => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Audit Notification Email</label>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="compliance@example.com"
                  value={organization.auditEmail}
                  onChange={(e) => setOrganization((prev) => ({ ...prev, auditEmail: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Registered Address</label>
                <textarea
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={organization.address}
                  onChange={(e) => setOrganization((prev) => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">GST Number</label>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={organization.gstNumber}
                  onChange={(e) =>
                    setOrganization((prev) => ({ ...prev, gstNumber: e.target.value.toUpperCase() }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">CIN Number</label>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={organization.cinNumber}
                  onChange={(e) =>
                    setOrganization((prev) => ({ ...prev, cinNumber: e.target.value.toUpperCase() }))
                  }
                />
              </div>
            </div>

            {/* Logo upload hidden for now */}
            <div className="hidden flex-col md:flex-row md:items-center gap-4 border border-dashed border-slate-300 rounded-xl p-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Upload className="h-4 w-4 text-indigo-600" />
                  Logo (PNG/SVG, max 3 MB)
                </label>
                <p className="text-xs text-slate-500 mt-1">
                  The logo appears on printed reports, login screens and the mobile app splash
                  screen.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Upload Logo
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
                {organization.logo?.data && (
                  <img
                    src={organization.logo.data}
                    alt="Organization logo preview"
                    className="h-12 rounded border border-slate-200 bg-white p-2"
                  />
                )}
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Branches & Departments</h3>
                <p className="text-sm text-slate-500">
                  Define at least one branch and the departments under it. Departments drive access
                  control, workflows and reporting.
                </p>
              </div>
              <button
                onClick={addBranch}
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                + Add Branch
              </button>
            </div>
            <div className="space-y-4">
              {organization.branches.map((branch, branchIndex) => (
                <div 
                  key={branch.tempId}
                  ref={(el) => {
                    if (el) {
                      branchRefs.current[branch.tempId] = el;
                    }
                  }}
                  className="rounded-2xl border border-purple-400 p-4 shadow-sm bg-white"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-3 w-full">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="Branch Name"
                          value={branch.name}
                          onChange={(e) => handleBranchChange(branchIndex, "name", e.target.value)}
                        />
                        <input
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="Code"
                          value={branch.code}
                          onChange={(e) =>
                            handleBranchChange(branchIndex, "code", e.target.value.toUpperCase())
                          }
                        />
                        <input
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="City"
                          value={branch.city}
                          onChange={(e) => handleBranchChange(branchIndex, "city", e.target.value)}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-semibold text-slate-800">Departments</h4>
                        <div className="flex items-center gap-2">
                          <button
                            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 hover:border-indigo-300"
                            onClick={() => addDepartment(branchIndex)}
                          >
                            <Plus className="h-3 w-3" />
                            Add Department
                          </button>
                          {organization.branches.length > 1 && (
                            <button
                              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 hover:border-rose-300"
                              onClick={() => removeBranch(branchIndex)}
                            >
                              <Trash2 className="h-3 w-3" />
                              Remove Branch
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {branch.departments.map((dept, deptIndex) => (
                          <div
                            key={dept.tempId}
                            className="flex flex-col md:flex-row items-start md:items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          >
                            <input
                              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              placeholder="Department Name"
                              value={dept.name}
                              onChange={(e) =>
                                handleDepartmentChange(branchIndex, deptIndex, "name", e.target.value)
                              }
                            />
                            <div className="flex items-center gap-3">
                              <input
                                className="w-32 rounded-lg border border-slate-200 px-3 py-2 uppercase focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="Code"
                                value={dept.code}
                                onChange={(e) =>
                                  handleDepartmentChange(
                                    branchIndex,
                                    deptIndex,
                                    "code",
                                    e.target.value.toUpperCase()
                                  )
                                }
                              />
                              <button
                                className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-100 hover:border-rose-300"
                                onClick={() => removeDepartment(branchIndex, deptIndex)}
                              >
                                <Trash2 className="h-3 w-3" />
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Administrator & Employee</h3>
              <p className="text-sm text-slate-500">
                The wizard creates a master employee record and pairs it with the administrator user
                account. You can add more users after signing in.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Full Name</label>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={adminUser.fullName}
                  onChange={(e) => setAdminUser((prev) => ({ ...prev, fullName: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={adminUser.email}
                  onChange={(e) => setAdminUser((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Phone</label>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={adminUser.phone}
                  onChange={(e) => setAdminUser((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Username / User ID</label>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={adminUser.username}
                  onChange={(e) =>
                    setAdminUser((prev) => ({ ...prev, username: e.target.value.toUpperCase() }))
                  }
                />
                <p className="text-xs text-slate-500 mt-1">
                  Note: The default password will be "Initial1" (or as configured in org settings). You'll be prompted to change it on first login.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Employee Code</label>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={adminUser.employeeCode}
                  onChange={(e) =>
                    setAdminUser((prev) => ({ ...prev, employeeCode: e.target.value.toUpperCase() }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Primary Department</label>
                <select
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={adminUser.departmentTempId || ""}
                  onChange={(e) =>
                    setAdminUser((prev) => ({ ...prev, departmentTempId: e.target.value }))
                  }
                >
                  {allDepartments.map((dept) => (
                    <option key={dept.tempId} value={dept.tempId}>
                      {dept.branchLabel} · {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Review & Launch</h3>
              <p className="text-sm text-slate-500">
                Double-check the summary below. The wizard will create tables, foreign keys and seed
                master data. This process may take a few minutes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Database</p>
                <h4 className="mt-2 text-base font-semibold text-slate-900">{dbConfig.database}</h4>
                <p className="text-sm text-slate-500 truncate">
                  {dbConfig.user}@{dbConfig.host}:{dbConfig.port}
                </p>
                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                  <ServerCog className="h-4 w-4 text-slate-400" />
                  {testResult?.connected
                    ? `Verified (${testResult.serverVersion})`
                    : "Not verified"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Master Data Preview</p>
                <h4 className="mt-2 text-base font-semibold text-slate-900">
                  {selectedAuditEvents.length} Audit Events
                </h4>
                <p className="text-sm text-slate-500">
                  {selectedOrgSettings.length} Org Settings
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Admin Account</p>
                <h4 className="mt-2 text-base font-semibold text-slate-900">{adminUser.username}</h4>
                <p className="text-sm text-slate-500">{adminUser.email || "Email pending"}</p>
                <p className="text-xs text-slate-400 mt-2">
                  Department: {selectedDept ? `${selectedDept.branchLabel} · ${selectedDept.name}` : "N/A"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={options.createSchema}
                  onChange={(e) => setOptions((prev) => ({ ...prev, createSchema: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700">
                  Create / refresh all tables, indexes and foreign keys before seeding data
                </span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={options.seedMasterData}
                  onChange={(e) => setOptions((prev) => ({ ...prev, seedMasterData: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700">
                  Insert default master data (org settings, audit config)
                </span>
              </label>
            </div>

            {setupSummary && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                <p className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" /> Setup complete
                </p>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-emerald-800">
                  <div>{setupSummary.auditRules} audit rules</div>
                  <div>{setupSummary.branches} branches</div>
                  <div>{setupSummary.departments} departments</div>
                </div>
              </div>
            )}

            {runLogs.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Execution log</h4>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm space-y-2 max-h-64 overflow-y-auto">
                  {runLogs.map((log, index) => (
                    <div key={`${log.message}-${index}`} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                      <div>
                        <p className="font-medium text-slate-900">{log.message}</p>
                        {log.scope && (
                          <p className="text-xs text-slate-500 uppercase tracking-wide">
                            {log.scope}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
                ALM Setup
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                Zero-touch provisioning for Asset Lifecycle Manager
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                The wizard creates the full database schema, seeds master data and provisions the
                primary admin user in a single guided flow.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <Settings2 className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="font-semibold text-slate-900">Progress</p>
                <p>
                  {setupComplete ? (
                    <span className="text-emerald-600">Complete ✓</span>
                  ) : (
                    `Step ${currentStep + 1} of ${wizardSteps.length}`
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <aside className="lg:col-span-3">
              <ol className="space-y-4">
                {wizardSteps.map((step, index) => {
                  const isCompleted = index < currentStep;
                  const isCurrent = index === currentStep;

                  return (
                    <li
                      key={step.id}
                      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
                        isCurrent
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : isCompleted
                          ? "border-emerald-200 bg-white text-emerald-700"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      <div className="mt-1">
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{step.title}</p>
                        <p className="text-xs">{step.description}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </aside>

            <section className="lg:col-span-9">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm min-h-[520px]">
                {loadingCatalog && currentStep > 0 ? (
                  <div className="flex h-64 items-center justify-center">
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                      Loading catalog...
                    </div>
                  </div>
                ) : (
                  renderStep()
                )}

                {!setupComplete && (
                  <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-4">
                    <button
                      onClick={handlePrev}
                      disabled={currentStep === 0 || isRunning}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={!canProceed}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow disabled:opacity-50"
                    >
                      {currentStep === wizardSteps.length - 1 ? (
                        isRunning ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Running setup...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4" />
                            Run Setup
                          </>
                        )
                      ) : (
                        <>
                          Next Step
                          <ChevronRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;

