import { showBackendTextToast } from '../../utils/errorTranslation';
import { rawToast } from '../../utils/mlToastRuntime';
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import API from "../../lib/axios";
import { 
  Building2, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  Loader2,
  Database,
  Check,
  X
} from "lucide-react";

const sanitizePhoneInput = (raw) => raw.replace(/[^\d+\s\-().]/g, "");

const isValidPhone = (phone) => {
  const trimmed = phone.trim();
  if (!trimmed) return true;

  if (!/^[+]?[\d\s\-().]+$/.test(trimmed)) return false;

  const digitCount = trimmed.replace(/\D/g, "").length;
  return digitCount >= 10 && digitCount <= 15;
};

const resolveTenantSubdomainUrl = (url, subdomain) => {
  if (typeof window !== "undefined" && window.location.port) {
    if (url?.includes(".localhost")) {
      return url.replace(/\.localhost:\d+/, `.localhost:${window.location.port}`);
    }
    if (subdomain) {
      return `http://${subdomain}.localhost:${window.location.port}`;
    }
  }
  return url;
};

export default function TenantSetup() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checkingDomainDb, setCheckingDomainDb] = useState(false);
  const [domainDbAvailable, setDomainDbAvailable] = useState(null);
  const [proposedDatabaseName, setProposedDatabaseName] = useState("");
  const [form, setForm] = useState({
    orgId: "",
    orgName: "",
    subdomain: "",
    orgCity: "",
  });
  const [adminUser, setAdminUser] = useState({
    fullName: "System Administrator",
    email: "",
    // Fixed initial password; user does not type this
    password: "Initial1",
    confirmPassword: "Initial1",
    username: "USR001",
    phone: "",
  });
  const [createdTenant, setCreatedTenant] = useState(null);
  const [redirectScheduled, setRedirectScheduled] = useState(false);

  const goToTenantLogin = (tenantData) => {
    const subdomainUrl = resolveTenantSubdomainUrl(
      tenantData?.subdomainUrl,
      tenantData?.subdomain || form.subdomain.toLowerCase(),
    );

    if (subdomainUrl) {
      window.location.href = subdomainUrl;
      return;
    }

    navigate("/", {
      state: {
        message: "Tenant is ready. Please login with your credentials.",
        orgId: tenantData?.orgId || form.orgId.toUpperCase(),
        email: tenantData?.adminCredentials?.email || adminUser.email,
      },
    });
  };

  const completeTenantSetup = (tenantData, { alreadyExists = false } = {}) => {
    setCreatedTenant(tenantData);
    toast.success(
      alreadyExists
        ? "This tenant is already set up. Taking you to login..."
        : "Tenant created successfully!",
    );

    if (!redirectScheduled) {
      setRedirectScheduled(true);
      setTimeout(() => goToTenantLogin(tenantData), 3000);
    }
  };

  const showToast = {
    success: (message) => (rawToast.success || toast.success)(message),
    error: (message) => (rawToast.error || toast.error)(message),
  };

  const steps = [
    {
      id: 0,
      title: "Organization Details",
      description: "Enter your organization information",
    },
    {
      id: 1,
      title: "Admin User",
      description: "Create your admin account",
    },
    {
      id: 2,
      title: "Review & Create",
      description: "Review and create tenant",
    },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === 'orgId') {
      newValue = value.toUpperCase();
    } else if (name === 'subdomain') {
      newValue = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
      setDomainDbAvailable(null);
      setProposedDatabaseName("");
    }
    setForm((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const checkDomainAndDatabase = async () => {
    if (!form.subdomain || form.subdomain.length < 3) {
      showToast.error("Please enter a valid domain & database name (at least 3 characters)");
      return;
    }

    setCheckingDomainDb(true);
    try {
      const response = await API.post("/tenant-setup/check-subdomain", {
        subdomain: form.subdomain.toLowerCase(),
      }, { timeout: 60000 });

      if (response.data.success) {
        setDomainDbAvailable(response.data.available);
        setProposedDatabaseName(response.data.databaseName || `${form.subdomain.toLowerCase()}_db`);
        if (response.data.available) {
          showToast.success(response.data.message);
        } else {
          showToast.error(response.data.message);
        }
      }
    } catch (error) {
      showToast.error(
        error.response?.data?.message || "Failed to check domain and database name",
      );
      setDomainDbAvailable(null);
      setProposedDatabaseName("");
    } finally {
      setCheckingDomainDb(false);
    }
  };

  const handleAdminChange = (e) => {
    const { name, value } = e.target;
    const newValue = name === "phone" ? sanitizePhoneInput(value) : value;
    setAdminUser((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleNext = () => {
    if (currentStep === 0) {
      // Validate step 1
      if (!form.orgId || form.orgId.length < 3) {
        showBackendTextToast({ toast, tmdId: 'TMD_ORGANIZATION_ID_IS_REQUIRED_MINIMUM_3_CHARACTERS_29CA119B', fallbackText: 'Organization ID is required (minimum 3 characters)', type: 'error' });
        return;
      }
      if (!form.orgName) {
        showBackendTextToast({ toast, tmdId: 'TMD_ORGANIZATION_NAME_IS_REQUIRED_1149F0F3', fallbackText: 'Organization Name is required', type: 'error' });
        return;
      }
      if (!form.subdomain || form.subdomain.length < 3) {
        showToast.error("Domain & database name is required (minimum 3 characters)");
        return;
      }
      if (!form.orgCity || !form.orgCity.trim()) {
        showToast.error("City is required");
        return;
      }
      if (domainDbAvailable === null) {
        showToast.error("Please check that the domain and database name are available");
        return;
      }
      if (!domainDbAvailable) {
        showToast.error("Domain or database name is not available. Please choose a different one.");
        return;
      }
    } else if (currentStep === 1) {
      // Validate step 2 (Admin User)
      if (!adminUser.email) {
        showBackendTextToast({ toast, tmdId: 'TMD_ADMIN_EMAIL_IS_REQUIRED_166924A0', fallbackText: 'Admin email is required', type: 'error' });
        return;
      }
      if (adminUser.phone.trim() && !isValidPhone(adminUser.phone)) {
        toast.error("Please enter a valid phone number (10–15 digits, optional country code)");
        return;
      }
      // Password is fixed as "Initial1" and not editable,
      // so no need to validate password/confirm password here.
    }
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (adminUser.phone.trim() && !isValidPhone(adminUser.phone)) {
      toast.error("Please enter a valid phone number (10–15 digits, optional country code)");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        orgId: form.orgId.toUpperCase(),
        orgName: form.orgName,
        subdomain: form.subdomain.toLowerCase(),
        orgCity: form.orgCity.trim(),
        adminUser: {
          fullName: adminUser.fullName,
          email: adminUser.email,
          password: adminUser.password,
          username: adminUser.username.toUpperCase(),
          phone: adminUser.phone,
        },
      };

      const response = await API.post("/tenant-setup/create", payload, {
        timeout: 900000,
      });

      const tenantData = response.data?.data;
      if (response.data?.success && tenantData?.orgId) {
        completeTenantSetup(tenantData, { alreadyExists: !!tenantData.alreadyExists });
        return;
      }

      toast.error(response.data?.message || "Tenant creation did not complete. Please try again.");
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Failed to create tenant. Please try again.";
      const looksLikeExistingTenant =
        /already exists|already taken/i.test(message) &&
        form.orgId &&
        form.subdomain;

      if (looksLikeExistingTenant) {
        completeTenantSetup(
          {
            orgId: form.orgId.toUpperCase(),
            orgName: form.orgName,
            orgCity: form.orgCity,
            subdomain: form.subdomain.toLowerCase(),
            subdomainUrl: resolveTenantSubdomainUrl(
              null,
              form.subdomain.toLowerCase(),
            ),
            database: `${form.subdomain.toLowerCase()}_db`,
            alreadyExists: true,
            adminCredentials: {
              email: adminUser.email,
              password: adminUser.password,
            },
          },
          { alreadyExists: true },
        );
        return;
      }

      if (error.code === "ECONNABORTED") {
        showToast.error("Request timed out. The tenant may still have been created — try tenant login.");
      } else {
        showToast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
            <Building2 className="h-8 w-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Multi-Tenant Setup</h1>
          <p className="text-gray-600">
            Create a new organization tenant with its own database
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      currentStep >= step.id
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      step.id + 1
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p
                      className={`text-sm font-medium ${
                        currentStep >= step.id ? "text-indigo-600" : "text-gray-500"
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 transition-all ${
                      currentStep > step.id ? "bg-indigo-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Organization Setup */}
            {currentStep === 0 && (
              <div className="p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Organization Details
                  </h2>
                  <p className="text-gray-600">
                    Enter your organization information to get started
                  </p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Organization ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="orgId"
                      value={form.orgId}
                      onChange={handleChange}
                      required
                      placeholder="e.g., SKASC, HONDA"
                      maxLength={10}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase font-medium"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Internal code stored in your tenant&apos;s database records (e.g. on assets, users, branches).
                      Other organizations on the platform can use the same code in their own isolated database.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Organization Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="orgName"
                      value={form.orgName}
                      onChange={handleChange}
                      required
                      placeholder="e.g., Acme Corporation"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Domain &amp; Database Name <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          name="subdomain"
                          value={form.subdomain}
                          onChange={handleChange}
                          required
                          placeholder="e.g., acme"
                          maxLength={63}
                          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent lowercase"
                        />
                        <button
                          type="button"
                          onClick={checkDomainAndDatabase}
                          disabled={checkingDomainDb || !form.subdomain || form.subdomain.length < 3}
                          className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium whitespace-nowrap"
                        >
                          {checkingDomainDb ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Checking...
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4" />
                              Check
                            </>
                          )}
                        </button>
                      </div>
                      {domainDbAvailable !== null && (
                        <p className={`mt-2 text-sm flex items-center gap-1 ${
                          domainDbAvailable ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {domainDbAvailable ? (
                            <>
                              <Check className="h-4 w-4" />
                              Domain and database name are available
                            </>
                          ) : (
                            <>
                              <X className="h-4 w-4" />
                              Domain or database name is not available
                            </>
                          )}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Must be globally unique. Used for your login URL (
                        <span className="font-medium">https://your-name.yourdomain.com</span>
                        ) and Postgres database (
                        <span className="font-medium">your-name_db</span>
                        {proposedDatabaseName ? (
                          <> → <span className="font-semibold">{proposedDatabaseName}</span></>
                        ) : null}
                        ).
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="orgCity"
                        value={form.orgCity}
                        onChange={handleChange}
                        required
                        placeholder="e.g., New York"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!domainDbAvailable || !form.orgName || !form.orgId || !form.orgCity.trim()}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                  >
                    Next
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Admin User Setup */}
            {currentStep === 1 && (
              <div className="p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Admin User Setup
                  </h2>
                  <p className="text-gray-600">
                    Create the administrator account. This user will be added to tblUsers in your tenant database.
                  </p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={adminUser.fullName}
                      onChange={handleAdminChange}
                      required
                      placeholder="e.g., John Doe"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={adminUser.email}
                      onChange={handleAdminChange}
                      required
                      placeholder="e.g., admin@example.com"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      This will be used for login
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        name="username"
                        value={adminUser.username}
                        onChange={handleAdminChange}
                        placeholder="USR001"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={adminUser.phone}
                        onChange={handleAdminChange}
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="+1 234 567 8900"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Optional. Use 10–15 digits; country code and spaces are allowed.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Password
                      </label>
                      <input
                        type="password"
                        name="password"
                        value="Initial1"
                        readOnly
                        disabled
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value="Initial1"
                        readOnly
                        disabled
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    The initial password will be set to <span className="font-semibold">Initial1</span> and emailed to the admin user.
                  </p>
                </div>

                <div className="flex justify-between pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2 font-medium"
                  >
                    <ChevronLeft className="h-5 w-5" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!adminUser.email}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                  >
                    Next
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review & Create */}
            {currentStep === 2 && (
              <div className="p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Review & Create
                  </h2>
                  <p className="text-gray-600">
                    Review your information before creating the tenant
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                  <div className="pb-4 border-b border-gray-300">
                    <h3 className="font-semibold text-gray-900 mb-3">Organization Details</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">Organization ID:</span>
                        <span className="font-semibold text-gray-900">{form.orgId}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">Organization Name:</span>
                        <span className="font-semibold text-gray-900">{form.orgName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">Domain &amp; Database Name:</span>
                        <span className="font-semibold text-gray-900">{form.subdomain}</span>
                      </div>
                      {proposedDatabaseName && (
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700">Postgres Database:</span>
                          <span className="font-semibold text-gray-900">{proposedDatabaseName}</span>
                        </div>
                      )}
                      {form.orgCity && (
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700">City:</span>
                          <span className="font-semibold text-gray-900">{form.orgCity}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Admin User Details</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">Full Name:</span>
                        <span className="font-semibold text-gray-900">{adminUser.fullName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">Email:</span>
                        <span className="font-semibold text-gray-900">{adminUser.email}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">Username:</span>
                        <span className="font-semibold text-gray-900">{adminUser.username}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {createdTenant ? (
                  <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-green-900 mb-3">
                          {createdTenant.alreadyExists
                            ? "Tenant Already Set Up"
                            : "Tenant Created Successfully! 🎉"}
                        </h3>
                        <div className="space-y-3 text-sm text-green-800">
                          <div className="bg-white rounded-lg p-4 border border-green-200">
                            <p className="font-semibold mb-2">Your Login Credentials:</p>
                            <div className="space-y-1">
                              <p>
                                <strong>Email:</strong> {createdTenant.adminCredentials?.email}
                              </p>
                              <p>
                                <strong>Password:</strong> {createdTenant.adminCredentials?.password}
                              </p>
                            </div>
                          </div>
                          {createdTenant.subdomainUrl && (
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                              <p className="font-semibold mb-2 text-blue-900">Your Organization URL:</p>
                              <p className="text-blue-800 break-all">
                                <a 
                                  href={createdTenant.subdomainUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline font-medium"
                                >
                                  {createdTenant.subdomainUrl}
                                </a>
                              </p>
                              <p className="text-xs text-blue-700 mt-2">
                                Redirecting in a few seconds. You can also continue now with the button below.
                              </p>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => goToTenantLogin(createdTenant)}
                            className="mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                          >
                            Go to login now
                          </button>
                          <p>
                            <strong>Database:</strong> {createdTenant.database}
                          </p>
                          {createdTenant.subdomain && (
                            <p>
                              <strong>Subdomain:</strong> {createdTenant.subdomain}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <Database className="h-6 w-6 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-blue-900 mb-2">
                          What happens next?
                        </h3>
                        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                          <li>A new database will be created automatically</li>
                          <li>All tables, constraints, and relationships will be set up</li>
                          <li>Menu groups are created in navigation only — screen apps are linked to submenus</li>
                          <li>You'll be redirected to the login page</li>
                          <li>Use your Organization ID to access your tenant</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {loading && (
                  <p className="text-sm text-amber-700 mt-4">
                    Creating the database and tables can take several minutes on a remote server. Do not close this tab.
                    If it seems stuck, refresh and try{" "}
                    <a href="/tenant-login" className="text-indigo-600 underline font-medium">
                      tenant login
                    </a>{" "}
                    with org ID <strong>{form.orgId.toUpperCase()}</strong>.
                  </p>
                )}

                <div className="flex justify-between pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={loading}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                  >
                    <ChevronLeft className="h-5 w-5" />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || createdTenant}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Creating Tenant...
                      </>
                    ) : createdTenant ? (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        Created
                      </>
                    ) : (
                      <>
                        <Database className="h-5 w-5" />
                        Create Tenant
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
