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

export default function TenantSetup() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checkingOrgId, setCheckingOrgId] = useState(false);
  const [orgIdAvailable, setOrgIdAvailable] = useState(null);
  const [form, setForm] = useState({
    orgId: "",
    orgName: "",
    orgCode: "",
    orgCity: "",
  });
  const [adminUser, setAdminUser] = useState({
    fullName: "System Administrator",
    email: "",
    password: "",
    confirmPassword: "",
    username: "USR001",
    phone: "",
  });
  const [createdTenant, setCreatedTenant] = useState(null);

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
    const newValue = name === 'orgId' || name === 'orgCode' ? value.toUpperCase() : value;
    setForm((prev) => ({
      ...prev,
      [name]: newValue,
    }));
    
    // Reset availability check when orgId changes
    if (name === 'orgId') {
      setOrgIdAvailable(null);
    }
  };

  const checkOrgId = async () => {
    if (!form.orgId || form.orgId.length < 3) {
      toast.error("Please enter a valid Organization ID (at least 3 characters)");
      return;
    }

    setCheckingOrgId(true);
    try {
      const response = await API.post("/tenant-setup/check-org-id", {
        orgId: form.orgId.toUpperCase(),
      });

      if (response.data.success) {
        setOrgIdAvailable(response.data.available);
        if (response.data.available) {
          toast.success(response.data.message);
        } else {
          toast.error(response.data.message);
        }
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to check organization ID"
      );
      setOrgIdAvailable(false);
    } finally {
      setCheckingOrgId(false);
    }
  };

  const handleAdminChange = (e) => {
    const { name, value } = e.target;
    setAdminUser((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNext = () => {
    if (currentStep === 0) {
      // Validate step 1
      if (!form.orgId || form.orgId.length < 3) {
        toast.error("Organization ID is required (minimum 3 characters)");
        return;
      }
      if (!form.orgName) {
        toast.error("Organization Name is required");
        return;
      }
      if (orgIdAvailable === null) {
        toast.error("Please check if Organization ID is available");
        return;
      }
      if (!orgIdAvailable) {
        toast.error("Organization ID is not available. Please choose a different one.");
        return;
      }
    } else if (currentStep === 1) {
      // Validate step 2 (Admin User)
      if (!adminUser.email) {
        toast.error("Admin email is required");
        return;
      }
      if (!adminUser.password || adminUser.password.length < 6) {
        toast.error("Password is required (minimum 6 characters)");
        return;
      }
      if (adminUser.password !== adminUser.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setCreatedTenant(null);

    try {
      const payload = {
        orgId: form.orgId.toUpperCase(),
        orgName: form.orgName,
        orgCode: form.orgCode.toUpperCase(),
        orgCity: form.orgCity,
        adminUser: {
          fullName: adminUser.fullName,
          email: adminUser.email,
          password: adminUser.password,
          username: adminUser.username.toUpperCase(),
          phone: adminUser.phone,
        },
      };

      const response = await API.post("/tenant-setup/create", payload);

      if (response.data.success) {
        toast.success("Tenant created successfully!");
        setCreatedTenant(response.data.data);
        
        // Redirect to subdomain URL after 5 seconds (give user time to see credentials)
        setTimeout(() => {
          const subdomainUrl = response.data.data.subdomainUrl;
          if (subdomainUrl) {
            // Navigate to the subdomain URL
            window.location.href = subdomainUrl;
          } else {
            // Fallback: navigate to login page if subdomain URL not available
            navigate("/", { 
              state: { 
                message: "Tenant created successfully! Please login with your credentials.",
                orgId: response.data.data.orgId,
                email: response.data.data.adminCredentials?.email
              } 
            });
          }
        }, 5000);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to create tenant. Please try again."
      );
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
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="orgId"
                        value={form.orgId}
                        onChange={handleChange}
                        required
                        placeholder="e.g., ACME, COMPANY123"
                        maxLength={20}
                        className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase font-medium"
                      />
                      <button
                        type="button"
                        onClick={checkOrgId}
                        disabled={checkingOrgId || !form.orgId || form.orgId.length < 3}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                      >
                        {checkingOrgId ? (
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
                    {orgIdAvailable !== null && (
                      <div className={`mt-2 flex items-center gap-2 text-sm ${
                        orgIdAvailable ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {orgIdAvailable ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Organization ID is available</span>
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4" />
                            <span>Organization ID is already taken</span>
                          </>
                        )}
                      </div>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      This will be used for tenant identification and login. Must be unique and 3-20 characters. A separate organization ID will be generated for internal use.
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
                        Organization Code
                      </label>
                      <input
                        type="text"
                        name="orgCode"
                        value={form.orgCode}
                        onChange={handleChange}
                        placeholder="e.g., ACME"
                        maxLength={10}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Used for database naming
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        name="orgCity"
                        value={form.orgCity}
                        onChange={handleChange}
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
                    disabled={!orgIdAvailable || !form.orgName}
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
                        placeholder="e.g., +1234567890"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={adminUser.password}
                        onChange={handleAdminChange}
                        required
                        placeholder="Minimum 6 characters"
                        minLength={6}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={adminUser.confirmPassword}
                        onChange={handleAdminChange}
                        required
                        placeholder="Re-enter password"
                        minLength={6}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  {adminUser.password && adminUser.confirmPassword && adminUser.password !== adminUser.confirmPassword && (
                    <p className="text-sm text-red-600">Passwords do not match</p>
                  )}
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
                    disabled={!adminUser.email || !adminUser.password || adminUser.password !== adminUser.confirmPassword}
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
                      {form.orgCode && (
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700">Organization Code:</span>
                          <span className="font-semibold text-gray-900">{form.orgCode}</span>
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
                          Tenant Created Successfully! 🎉
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
                                You will be redirected to this URL in a few seconds. Use your email and password to login.
                              </p>
                            </div>
                          )}
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
                          <li>You'll be redirected to the login page</li>
                          <li>Use your Organization ID to access your tenant</li>
                        </ul>
                      </div>
                    </div>
                  </div>
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
