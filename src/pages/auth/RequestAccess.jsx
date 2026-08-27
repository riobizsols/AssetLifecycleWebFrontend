import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import API from "../../lib/axios";
import { Building2, Loader2, Check, X } from "lucide-react";

export default function RequestAccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const claim = searchParams.get("claim") || "";

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [orgCity, setOrgCity] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [subdomainStatus, setSubdomainStatus] = useState(null);
  const [subdomainMessage, setSubdomainMessage] = useState("");
  const checkTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!claim) {
        setError("Missing Zoho verification. Open RIO EAM from Zoho to request access.");
        setLoading(false);
        return;
      }
      try {
        const res = await API.get("/access-requests/claim-preview", {
          params: { claim },
        });
        if (cancelled) return;
        setEmail(res.data.email || "");
        setFullName(res.data.fullName || "");
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
              "Zoho session expired. Open RIO EAM from Zoho again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [claim]);

  useEffect(() => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    const value = subdomain.trim().toLowerCase();
    if (!value || value.length < 2) {
      setSubdomainStatus(null);
      setSubdomainMessage("");
      return undefined;
    }
    setSubdomainStatus("checking");
    checkTimer.current = setTimeout(async () => {
      try {
        const res = await API.post("/access-requests/check-subdomain", {
          subdomain: value,
        });
        if (res.data?.available) {
          setSubdomainStatus("ok");
          setSubdomainMessage(res.data.message || "Available");
        } else {
          setSubdomainStatus("taken");
          setSubdomainMessage(res.data?.message || "Subdomain is not available");
        }
      } catch (err) {
        setSubdomainStatus("taken");
        setSubdomainMessage(err?.response?.data?.message || "Could not check subdomain");
      }
    }, 400);
    return () => {
      if (checkTimer.current) clearTimeout(checkTimer.current);
    };
  }, [subdomain]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (subdomainStatus === "taken" || subdomainStatus === "checking") {
      setError(subdomainMessage || "Choose an available subdomain");
      return;
    }
    setSubmitting(true);
    try {
      await API.post("/access-requests/request", {
        claim,
        fullName,
        companyName,
        subdomain: subdomain.trim().toLowerCase(),
        orgCity,
        phone,
        notes,
      });
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not submit request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#0E2F4B]" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white shadow-sm border border-slate-200 p-8 text-center">
          <Building2 className="mx-auto h-10 w-10 text-[#0E2F4B] mb-4" />
          <h1 className="text-xl font-semibold text-[#0E2F4B]">Request submitted</h1>
          <p className="mt-3 text-sm text-slate-600">
            We will review your request and email <strong>{email}</strong> when your
            organization is ready. Then open <strong>RIO EAM</strong> from Zoho to sign in.
          </p>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mt-6 w-full py-2.5 bg-[#0E2F4B] text-white text-sm font-medium"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="max-w-lg w-full bg-white shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="h-8 w-8 text-[#0E2F4B]" />
          <div>
            <h1 className="text-xl font-semibold text-[#0E2F4B]">Request ALM access</h1>
            <p className="text-sm text-slate-500">
              Your Zoho account is verified. Tell us about your organization.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 px-3 py-2">
            {error}{" "}
            {!claim && (
              <Link className="underline" to="/login">
                Go to login
              </Link>
            )}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Zoho email</label>
            <input
              value={email}
              readOnly
              className="mt-1 w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Your name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Company / organization name *
            </label>
            <input
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Desired subdomain *
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                required
                value={subdomain}
                onChange={(e) =>
                  setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                }
                placeholder="acme"
                className="flex-1 px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
              />
              <span className="text-sm text-slate-500 whitespace-nowrap">
                .rioassetmanagement.net
              </span>
            </div>
            {subdomainStatus === "checking" && (
              <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Checking availability…
              </p>
            )}
            {subdomainStatus === "ok" && (
              <p className="mt-1 text-xs text-green-700 flex items-center gap-1">
                <Check className="h-3 w-3" /> {subdomainMessage}
              </p>
            )}
            {subdomainStatus === "taken" && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <X className="h-3 w-3" /> {subdomainMessage}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">City</label>
              <input
                value={orgCity}
                onChange={(e) => setOrgCity(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
            />
          </div>
          <button
            type="submit"
            disabled={
              submitting || !claim || subdomainStatus === "taken" || subdomainStatus === "checking"
            }
            className="w-full py-2.5 bg-[#0E2F4B] text-white text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit request
          </button>
        </form>
      </div>
    </div>
  );
}
