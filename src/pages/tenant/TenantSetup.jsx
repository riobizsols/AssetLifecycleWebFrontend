import { showBackendTextToast } from "../../utils/errorTranslation";
import { rawToast } from "../../utils/mlToastRuntime";
import { useState, useEffect } from "react";
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
  X,
  UserCog,
  Globe,
  Mail,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Hash,
} from "lucide-react";

const BRAND = "#0E2F4B";
const DEFAULT_MAIN_DOMAIN = "rioassetmanagement.net";

/** Strip protocol / path; map web.* platform host → tenant wildcard root domain. */
function resolveMainDomain() {
  const explicit = import.meta.env.VITE_MAIN_DOMAIN?.trim();
  if (explicit) {
    return explicit.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
  const fromFrontend = import.meta.env.VITE_FRONTEND_URL?.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (fromFrontend) {
    if (fromFrontend.startsWith("web.")) return fromFrontend.slice(4);
    return fromFrontend;
  }
  return DEFAULT_MAIN_DOMAIN;
}

const COUNTRY_DIAL_CODES = [
  { dial: "+91", label: "India (+91)" },
  { dial: "+1", label: "United States (+1)" },
  { dial: "+44", label: "United Kingdom (+44)" },
  { dial: "+971", label: "UAE (+971)" },
  { dial: "+65", label: "Singapore (+65)" },
  { dial: "+61", label: "Australia (+61)" },
  { dial: "+49", label: "Germany (+49)" },
  { dial: "+33", label: "France (+33)" },
  { dial: "+81", label: "Japan (+81)" },
  { dial: "+86", label: "China (+86)" },
  { dial: "+966", label: "Saudi Arabia (+966)" },
  { dial: "+974", label: "Qatar (+974)" },
  { dial: "+60", label: "Malaysia (+60)" },
  { dial: "+62", label: "Indonesia (+62)" },
  { dial: "+27", label: "South Africa (+27)" },
];

function buildFullPhone(countryDial, localPhone) {
  const local = String(localPhone || "").trim().replace(/\D/g, "");
  if (!local) return "";
  const dialDigits = String(countryDial || "").replace(/\D/g, "");
  return dialDigits ? `+${dialDigits}${local}` : local;
}

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] transition placeholder:text-slate-400 focus:border-[#0E2F4B] focus:outline-none focus:ring-4 focus:ring-[#0E2F4B]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const labelClass = "block text-sm font-semibold text-slate-800";

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

function FormField({ label, required, hint, error, children }) {
  return (
    <div className="group">
      <label className={labelClass}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-2 text-xs leading-relaxed text-slate-500">{hint}</p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function FormSection({ title, description, icon: Icon, className = "", children }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/60 bg-white p-6 shadow-[0_4px_24px_rgba(14,47,75,0.06)] sm:p-8 ${className}`}
    >
      {(title || description) && (
        <div className="mb-6 flex items-start gap-4 border-b border-slate-100 pb-5">
          {Icon && (
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
              style={{ backgroundColor: BRAND }}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
          )}
          <div>
            {title && <h3 className="text-base font-semibold text-slate-900">{title}</h3>}
            {description && (
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

function PrimaryButton({ children, className = "", disabled, type = "button", onClick }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0E2F4B]/20 transition hover:shadow-xl hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{ backgroundColor: BRAND }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, className = "", disabled, type = "button", onClick }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function ReviewRow({ label, value, mono }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-slate-100 py-3 last:border-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-start sm:gap-3">
      <span className="shrink-0 text-sm text-slate-500">{label}</span>
      <span
        className={`min-w-0 break-words text-sm font-semibold text-slate-900 sm:text-right ${mono ? "font-mono text-xs" : ""}`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

function VerticalStepNav({ steps, currentStep }) {
  return (
    <nav className="space-y-1" aria-label="Registration progress">
      {steps.map((step, index) => {
        const isComplete = currentStep > step.id;
        const isActive = currentStep === step.id;
        const Icon = step.icon;
        return (
          <div key={step.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                  isComplete
                    ? "border-white/40 bg-white text-[#0E2F4B]"
                    : isActive
                      ? "border-white bg-white text-[#0E2F4B] shadow-lg shadow-black/20"
                      : "border-white/20 bg-white/5 text-white/50"
                }`}
              >
                {isComplete ? (
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`my-2 w-px flex-1 min-h-[2rem] transition-colors duration-300 ${
                    isComplete ? "bg-white/50" : "bg-white/15"
                  }`}
                />
              )}
            </div>
            <div className={`pb-8 pt-1.5 transition-opacity duration-300 ${isActive || isComplete ? "opacity-100" : "opacity-45"}`}>
              <p className={`text-sm font-semibold ${isActive ? "text-white" : "text-white/80"}`}>
                {step.title}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-white/50">{step.description}</p>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function MobileStepBar({ steps, currentStep }) {
  const step = steps[currentStep];
  return (
    <div className="border-b border-slate-200/80 bg-white/80 px-4 py-4 backdrop-blur-md sm:px-6 lg:hidden">
      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
        <span>
          Step {currentStep + 1} of {steps.length}
        </span>
        <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${((currentStep + 1) / steps.length) * 100}%`,
            backgroundColor: BRAND,
          }}
        />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-900">{step?.title}</p>
      <p className="text-xs text-slate-500">{step?.description}</p>
    </div>
  );
}

function AmbientBackground() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 animate-gradient-shift"
        style={{
          background:
            "linear-gradient(135deg, #0E2F4B 0%, #1a4a6e 40%, #0a2438 70%, #0E2F4B 100%)",
          backgroundSize: "400% 400%",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(255,255,255,0.14),transparent_55%),radial-gradient(ellipse_at_80%_100%,rgba(120,180,255,0.08),transparent_50%)]" />
      <div className="pointer-events-none absolute -left-40 top-1/4 h-[28rem] w-[28rem] animate-float-slow rounded-full bg-white/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 animate-float-slower rounded-full bg-sky-300/[0.08] blur-3xl" />
    </>
  );
}

function WelcomeScreen({ onStart, onSignIn }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-[#0E2F4B]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(255,255,255,0.07),transparent_55%)]" />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-12">
        <img src="/logo.png" alt="RIO EAM" className="h-9 w-auto brightness-0 invert sm:h-10" />
        <button
          type="button"
          onClick={onSignIn}
          className="rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-medium text-white/90 shadow-[0_4px_24px_rgba(0,0,0,0.12)] backdrop-blur-xl transition hover:border-white/40 hover:bg-white/20 hover:text-white"
        >
          Sign in
        </button>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Welcome to RIO EAM
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-white/55">
          Set up your organization in minutes with a dedicated database and admin access.
        </p>
        <button
          type="button"
          onClick={onStart}
          className="mt-10 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-[#0E2F4B] shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition hover:bg-white/95 active:scale-[0.98]"
        >
          Register your organization
          <ArrowRight className="h-4 w-4" />
        </button>
        <p className="mt-4 text-sm text-white/35">Takes about 3 minutes</p>
      </main>

      <footer className="relative z-10 px-6 py-6 text-center text-xs text-white/30 sm:px-12">
        RIO Asset Lifecycle Management
      </footer>
    </div>
  );
}

export default function TenantSetup() {
  const navigate = useNavigate();
  const [showRegistration, setShowRegistration] = useState(false);
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
    password: "Initial1",
    confirmPassword: "Initial1",
    phone: "",
  });
  const [phoneCountryCode, setPhoneCountryCode] = useState("+91");
  const [createdTenant, setCreatedTenant] = useState(null);
  const [redirectScheduled, setRedirectScheduled] = useState(false);

  const mainDomain = resolveMainDomain();
  const fullPhone = buildFullPhone(phoneCountryCode, adminUser.phone);

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
      title: "Organization",
      description: "Company profile & subdomain",
      icon: Building2,
    },
    {
      id: 1,
      title: "Administrator",
      description: "Primary system admin account",
      icon: UserCog,
    },
    {
      id: 2,
      title: "Review",
      description: "Confirm & provision tenant",
      icon: CheckCircle2,
    },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === "orgId") {
      newValue = value.toUpperCase();
    } else if (name === "subdomain") {
      newValue = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
      setDomainDbAvailable(null);
      setProposedDatabaseName("");
    }
    setForm((prev) => ({ ...prev, [name]: newValue }));
  };

  const checkDomainAndDatabase = async () => {
    if (!form.subdomain || form.subdomain.length < 3) {
      showToast.error("Please enter a valid domain & database name (at least 3 characters)");
      return;
    }

    setCheckingDomainDb(true);
    try {
      const response = await API.post(
        "/tenant-setup/check-subdomain",
        { subdomain: form.subdomain.toLowerCase() },
        { timeout: 60000 },
      );

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
      showToast.error(error.response?.data?.message || "Failed to check domain and database name");
      setDomainDbAvailable(null);
      setProposedDatabaseName("");
    } finally {
      setCheckingDomainDb(false);
    }
  };

  const handleAdminChange = (e) => {
    const { name, value } = e.target;
    const newValue =
      name === "phone" ? value.replace(/[^\d\s\-()]/g, "") : value;
    setAdminUser((prev) => ({ ...prev, [name]: newValue }));
  };

  const handleNext = () => {
    if (currentStep === 0) {
      if (!form.orgId || form.orgId.length < 3) {
        showBackendTextToast({
          toast,
          tmdId: "TMD_ORGANIZATION_ID_IS_REQUIRED_MINIMUM_3_CHARACTERS_29CA119B",
          fallbackText: "Organization ID is required (minimum 3 characters)",
          type: "error",
        });
        return;
      }
      if (!form.orgName) {
        showBackendTextToast({
          toast,
          tmdId: "TMD_ORGANIZATION_NAME_IS_REQUIRED_1149F0F3",
          fallbackText: "Organization Name is required",
          type: "error",
        });
        return;
      }
      if (!form.subdomain || form.subdomain.length < 3) {
        showToast.error("Domain & database name is required (minimum 3 characters)");
        return;
      }
      if (!form.orgCity?.trim()) {
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
      if (!adminUser.email) {
        showBackendTextToast({
          toast,
          tmdId: "TMD_ADMIN_EMAIL_IS_REQUIRED_166924A0",
          fallbackText: "Admin email is required",
          type: "error",
        });
        return;
      }
      if (adminUser.phone.trim() && !isValidPhone(fullPhone)) {
        toast.error("Please enter a valid phone number (10–15 digits after country code)");
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => setCurrentStep(currentStep - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (adminUser.phone.trim() && !isValidPhone(fullPhone)) {
      toast.error("Please enter a valid phone number (10–15 digits after country code)");
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
          phone: fullPhone,
        },
      };

      const response = await API.post("/tenant-setup/create", payload, { timeout: 900000 });
      const tenantData = response.data?.data;

      if (response.data?.success && tenantData?.orgId) {
        completeTenantSetup(tenantData, { alreadyExists: !!tenantData.alreadyExists });
        return;
      }

      toast.error(response.data?.message || "Tenant creation did not complete. Please try again.");
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Failed to create tenant. Please try again.";
      const looksLikeExistingTenant =
        /already exists|already taken/i.test(message) && form.orgId && form.subdomain;

      if (looksLikeExistingTenant) {
        completeTenantSetup(
          {
            orgId: form.orgId.toUpperCase(),
            orgName: form.orgName,
            orgCity: form.orgCity,
            subdomain: form.subdomain.toLowerCase(),
            subdomainUrl: resolveTenantSubdomainUrl(null, form.subdomain.toLowerCase()),
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
        showToast.error(
          "Request timed out. The tenant may still have been created — try tenant login.",
        );
      } else {
        showToast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const previewUrl = form.subdomain
    ? `https://${form.subdomain.toLowerCase()}.${mainDomain}`
    : null;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: showRegistration ? "smooth" : "auto" });
  }, [showRegistration, currentStep]);

  const handleBackToWelcome = () => {
    if (loading || createdTenant) return;
    setShowRegistration(false);
    setCurrentStep(0);
  };

  if (!showRegistration) {
    return (
      <WelcomeScreen
        onStart={() => setShowRegistration(true)}
        onSignIn={() => navigate("/")}
      />
    );
  }

  return (
    <div className="flex min-h-screen animate-in fade-in duration-500">
      {/* Left brand panel */}
      <aside className="relative hidden w-[380px] shrink-0 overflow-hidden bg-[#0E2F4B] xl:w-[420px] lg:flex lg:flex-col">
        <AmbientBackground />
        <div className="relative z-10 flex h-full flex-col p-8 xl:p-10">
          <button
            type="button"
            onClick={handleBackToWelcome}
            disabled={loading || !!createdTenant}
            className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-xl transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <img src="/logo.png" alt="RIO EAM" className="mb-8 h-auto w-36 brightness-0 invert" />

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
            Tenant registration
          </p>
          <h1 className="mt-2 text-2xl font-semibold leading-snug text-white">
            Set up your organization
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/55">
            Complete the steps to provision your dedicated database, master data, and administrator
            account.
          </p>

          <div className="mt-10 flex-1">
            <VerticalStepNav steps={steps} currentStep={currentStep} />
          </div>

          <div className="mt-auto rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl">
            <p className="text-xs leading-relaxed text-white/55">
              Need help? Contact your platform administrator or return to the welcome page anytime
              before provisioning starts.
            </p>
          </div>
        </div>
      </aside>

      {/* Main form area */}
      <div className="flex min-h-screen flex-1 flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <header className="flex items-center justify-between border-b border-slate-200/80 bg-white/70 px-4 py-4 backdrop-blur-xl sm:px-8 lg:hidden">
          <button
            type="button"
            onClick={handleBackToWelcome}
            disabled={loading || !!createdTenant}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <img src="/logo.png" alt="RIO EAM" className="h-7 w-auto" />
          <div className="w-14" />
        </header>

        <MobileStepBar steps={steps} currentStep={currentStep} />

        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-8 sm:py-10">
            <form onSubmit={handleSubmit} className="space-y-8">
              {currentStep === 0 && (
                <div key="step-org" className="animate-in fade-in slide-in-from-bottom-3 duration-400">
                  <div className="mb-6 hidden lg:block">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Step 1 of 3
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold text-slate-900">Organization details</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Tell us about your company and choose your organization URL.
                    </p>
                  </div>

                  <FormSection
                    title="Company profile"
                    description="These details identify your tenant across the platform."
                    icon={Building2}
                  >
                    <div className="space-y-5">
                      <FormField
                        label="Organization ID"
                        required
                        hint="Short unique code (e.g. SKASC). Used internally across assets, users, and branches."
                      >
                        <div className="relative">
                          <Hash className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            name="orgId"
                            value={form.orgId}
                            onChange={handleChange}
                            required
                            placeholder="SKASC"
                            maxLength={10}
                            className={`${inputClass} pl-10 uppercase font-semibold tracking-wide`}
                          />
                        </div>
                      </FormField>

                      <FormField label="Organization name" required>
                        <input
                          type="text"
                          name="orgName"
                          value={form.orgName}
                          onChange={handleChange}
                          required
                          placeholder="Acme Corporation"
                          className={inputClass}
                        />
                      </FormField>

                      <FormField label="City" required>
                        <div className="relative">
                          <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            name="orgCity"
                            value={form.orgCity}
                            onChange={handleChange}
                            required
                            placeholder="New York"
                            className={`${inputClass} pl-10`}
                          />
                        </div>
                      </FormField>
                    </div>
                  </FormSection>

                  <FormSection
                    className="mt-6"
                    title="Domain & database"
                    description="Your team will sign in at this subdomain. A dedicated Postgres database is created automatically."
                    icon={Globe}
                  >
                    <FormField
                      label="Subdomain"
                      required
                      hint={
                        proposedDatabaseName
                          ? `Database: ${proposedDatabaseName}`
                          : "Lowercase letters, numbers, and hyphens only."
                      }
                    >
                      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                        <div className="flex flex-1 overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm focus-within:border-[#0E2F4B] focus-within:ring-4 focus-within:ring-[#0E2F4B]/10">
                          <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-slate-400">
                            <Globe className="h-4 w-4" />
                          </span>
                          <input
                            type="text"
                            name="subdomain"
                            value={form.subdomain}
                            onChange={handleChange}
                            required
                            placeholder="acme"
                            maxLength={63}
                            className="min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-sm lowercase text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                          />
                          <span className="hidden items-center border-l border-slate-200 bg-slate-50 px-3 text-xs text-slate-500 sm:flex">
                            .{mainDomain}
                          </span>
                        </div>
                        <PrimaryButton
                          type="button"
                          onClick={checkDomainAndDatabase}
                          disabled={checkingDomainDb || !form.subdomain || form.subdomain.length < 3}
                          className="shrink-0 sm:px-5"
                        >
                          {checkingDomainDb ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Checking
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4" />
                              Check availability
                            </>
                          )}
                        </PrimaryButton>
                      </div>
                    </FormField>

                    {domainDbAvailable !== null && (
                      <div
                        className={`mt-4 flex items-start gap-3 rounded-xl border px-4 py-3.5 text-sm ${
                          domainDbAvailable
                            ? "border-emerald-200/80 bg-emerald-50/80 text-emerald-800"
                            : "border-red-200/80 bg-red-50/80 text-red-800"
                        }`}
                      >
                        {domainDbAvailable ? (
                          <Check className="mt-0.5 h-4 w-4 shrink-0" />
                        ) : (
                          <X className="mt-0.5 h-4 w-4 shrink-0" />
                        )}
                        <span>
                          {domainDbAvailable
                            ? "Domain and database name are available."
                            : "This domain or database name is already in use."}
                        </span>
                      </div>
                    )}

                    {previewUrl && (
                      <div className="mt-4 rounded-xl border border-[#0E2F4B]/15 bg-[#0E2F4B]/[0.04] px-4 py-3.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#0E2F4B]/70">
                          Your organization URL
                        </p>
                        <p className="mt-1 break-all font-mono text-sm font-medium text-[#0E2F4B]">
                          {previewUrl}
                        </p>
                      </div>
                    )}
                  </FormSection>

                  <div className="flex justify-end pt-2">
                    <PrimaryButton
                      type="button"
                      onClick={handleNext}
                      disabled={
                        !domainDbAvailable ||
                        !form.orgName ||
                        !form.orgId ||
                        !form.orgCity.trim()
                      }
                    >
                      Continue
                      <ChevronRight className="h-4 w-4" />
                    </PrimaryButton>
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div key="step-admin" className="animate-in fade-in slide-in-from-bottom-3 duration-400">
                  <div className="mb-6 hidden lg:block">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Step 2 of 3
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold text-slate-900">Administrator account</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Create the primary System Administrator who will manage your tenant.
                    </p>
                  </div>

                  <FormSection
                    title="Admin credentials"
                    description="This account receives full access. Login credentials are emailed after provisioning."
                    icon={UserCog}
                  >
                    <div className="space-y-5">
                      <FormField label="Full name" required>
                        <input
                          type="text"
                          name="fullName"
                          value={adminUser.fullName}
                          onChange={handleAdminChange}
                          required
                          placeholder="System Administrator"
                          className={inputClass}
                        />
                      </FormField>

                      <FormField
                        label="Work email"
                        required
                        hint="Used for sign-in and account notifications."
                      >
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="email"
                            name="email"
                            value={adminUser.email}
                            onChange={handleAdminChange}
                            required
                            placeholder="admin@company.com"
                            className={`${inputClass} pl-10`}
                          />
                        </div>
                      </FormField>

                      <FormField
                        label="Phone"
                        hint={
                          fullPhone
                            ? `Will be saved as ${fullPhone}`
                            : "Optional — select country code and enter local number."
                        }
                      >
                        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                          <select
                            value={phoneCountryCode}
                            onChange={(e) => setPhoneCountryCode(e.target.value)}
                            className="w-full shrink-0 rounded-xl border border-slate-200/70 bg-white px-3 py-3 text-sm text-slate-900 shadow-sm focus:border-[#0E2F4B] focus:outline-none focus:ring-4 focus:ring-[#0E2F4B]/10 sm:w-48"
                            aria-label="Country code"
                          >
                            {COUNTRY_DIAL_CODES.map(({ dial, label }) => (
                              <option key={dial} value={dial}>
                                {label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="tel"
                            name="phone"
                            value={adminUser.phone}
                            onChange={handleAdminChange}
                            inputMode="numeric"
                            autoComplete="tel-national"
                            placeholder="98765 43210"
                            className={`${inputClass} mt-0 flex-1`}
                          />
                        </div>
                      </FormField>

                      <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3.5">
                        <p className="text-sm text-emerald-800">
                          Initial password is <span className="font-semibold">Initial1</span>, sent via
                          welcome email. User ID <span className="font-semibold">USR001</span> is assigned
                          automatically.
                        </p>
                      </div>
                    </div>
                  </FormSection>

                  <div className="flex justify-between pt-2">
                    <SecondaryButton type="button" onClick={handleBack}>
                      <ChevronLeft className="h-4 w-4" />
                      Back
                    </SecondaryButton>
                    <PrimaryButton type="button" onClick={handleNext} disabled={!adminUser.email}>
                      Continue
                      <ChevronRight className="h-4 w-4" />
                    </PrimaryButton>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div key="step-review" className="animate-in fade-in slide-in-from-bottom-3 duration-400">
                  <div className="mb-6 hidden lg:block">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Step 3 of 3
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold text-slate-900">Review & provision</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Confirm your details before we create your tenant environment.
                    </p>
                  </div>

                  {!createdTenant && (
                    <div className="mb-6 rounded-2xl border border-blue-200/70 bg-blue-50/80 p-5 backdrop-blur-sm">
                      <div className="flex gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                          <Database className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-blue-900">What happens next</p>
                          <ul className="mt-2 space-y-1.5 text-sm text-blue-800/90">
                            <li>Dedicated PostgreSQL database is created</li>
                            <li>Schema, master data, and navigation are provisioned</li>
                            <li>Administrator account is activated in your tenant</li>
                            <li>You are redirected to your organization sign-in URL</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid min-w-0 gap-5 lg:grid-cols-2">
                    <FormSection title="Organization" icon={Building2}>
                      <ReviewRow label="Organization ID" value={form.orgId} mono />
                      <ReviewRow label="Name" value={form.orgName} />
                      <ReviewRow label="Subdomain" value={form.subdomain} mono />
                      <ReviewRow
                        label="Database"
                        value={proposedDatabaseName || `${form.subdomain}_db`}
                        mono
                      />
                      <ReviewRow label="City" value={form.orgCity} />
                    </FormSection>

                    <FormSection title="Administrator" icon={UserCog}>
                      <ReviewRow label="Full name" value={adminUser.fullName} />
                      <ReviewRow label="Email" value={adminUser.email} />
                      <ReviewRow label="Phone" value={fullPhone || "—"} mono />
                    </FormSection>
                  </div>

                  {createdTenant && (
                    <div className="mt-6 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 p-6">
                      <div className="flex gap-4">
                        <CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-600" />
                        <div className="flex-1 space-y-4">
                          <div>
                            <h3 className="text-lg font-semibold text-emerald-900">
                              {createdTenant.alreadyExists
                                ? "Tenant already provisioned"
                                : "Tenant created successfully"}
                            </h3>
                            <p className="mt-1 text-sm text-emerald-800/90">
                              Redirecting to your organization login in a few seconds.
                            </p>
                          </div>

                          <div className="rounded-xl border border-emerald-200/80 bg-white p-4 text-sm">
                            <p className="font-semibold text-slate-900">Sign-in credentials</p>
                            <p className="mt-2 text-slate-600">
                              Email:{" "}
                              <span className="font-medium text-slate-900">
                                {createdTenant.adminCredentials?.email}
                              </span>
                            </p>
                            <p className="text-slate-600">
                              Password:{" "}
                              <span className="font-mono font-medium text-slate-900">
                                {createdTenant.adminCredentials?.password}
                              </span>
                            </p>
                          </div>

                          {createdTenant.subdomainUrl && (
                            <div className="rounded-xl border border-emerald-200/80 bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Organization URL
                              </p>
                              <a
                                href={createdTenant.subdomainUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-flex items-center gap-1 break-all text-sm font-medium text-[#0E2F4B] hover:underline"
                              >
                                {createdTenant.subdomainUrl}
                                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                              </a>
                            </div>
                          )}

                          <PrimaryButton type="button" onClick={() => goToTenantLogin(createdTenant)}>
                            Go to login now
                            <ArrowRight className="h-4 w-4" />
                          </PrimaryButton>
                        </div>
                      </div>
                    </div>
                  )}

                  {loading && (
                    <div className="mt-6 rounded-2xl border border-amber-200/80 bg-amber-50/90 p-5 text-sm text-amber-900">
                      <div className="flex items-start gap-3">
                        <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin" />
                        <div>
                          <p className="font-semibold">Provisioning in progress</p>
                          <p className="mt-1 text-amber-800/90">
                            Database creation can take several minutes. Keep this tab open. If it
                            times out, try tenant login with org ID{" "}
                            <strong>{form.orgId.toUpperCase()}</strong>.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between pt-4">
                    <SecondaryButton type="button" onClick={handleBack} disabled={loading}>
                      <ChevronLeft className="h-4 w-4" />
                      Back
                    </SecondaryButton>
                    <PrimaryButton type="submit" disabled={loading || createdTenant} className="min-w-[180px]">
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Provisioning…
                        </>
                      ) : createdTenant ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Complete
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4" />
                          Create tenant
                        </>
                      )}
                    </PrimaryButton>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E2F4B]/40 backdrop-blur-md">
          <div className="mx-4 max-w-sm rounded-2xl border border-white/30 bg-white/95 p-8 text-center shadow-2xl backdrop-blur-xl">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#0E2F4B]" />
            <p className="mt-4 text-base font-semibold text-slate-900">Creating your tenant</p>
            <p className="mt-2 text-sm text-slate-500">
              Setting up database, schema, and administrator access. This may take a few minutes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
