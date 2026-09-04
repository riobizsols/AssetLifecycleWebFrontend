import { useCallback, useEffect, useState } from "react";
import API from "../../lib/axios";
import { Loader2, CheckCircle2, XCircle, Lock } from "lucide-react";

const OPS_TOKEN_KEY = "alm_access_request_ops_token";

export default function OpsAccessRequests() {
  const [opsToken, setOpsToken] = useState(() => sessionStorage.getItem(OPS_TOKEN_KEY) || "");
  const [password, setPassword] = useState("");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const authHeaders = useCallback(
    () => ({ Authorization: `Bearer ${opsToken}` }),
    [opsToken]
  );

  const load = useCallback(async (token = opsToken) => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await API.get("/access-requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(res.data?.requests || []);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        sessionStorage.removeItem(OPS_TOKEN_KEY);
        setOpsToken("");
        setError("Ops session expired. Sign in again.");
      } else {
        setError(err?.response?.data?.message || "Failed to load requests");
      }
    } finally {
      setLoading(false);
    }
  }, [opsToken]);

  useEffect(() => {
    if (opsToken) load(opsToken);
  }, [opsToken, load]);

  const login = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    setError("");
    try {
      const res = await API.post("/access-requests/ops-login", { password });
      const token = res.data?.token;
      if (!token) throw new Error("No ops token returned");
      sessionStorage.setItem(OPS_TOKEN_KEY, token);
      setOpsToken(token);
      setPassword("");
    } catch (err) {
      setError(err?.response?.data?.message || "Ops login failed");
    } finally {
      setLoggingIn(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem(OPS_TOKEN_KEY);
    setOpsToken("");
    setRequests([]);
  };

  const approve = async (id) => {
    if (!window.confirm("Approve and auto-create this organization?")) return;
    setBusyId(id);
    setError("");
    try {
      await API.post(
        `/access-requests/${id}/approve`,
        {},
        { headers: authHeaders(), timeout: 900000 }
      );
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Approve failed");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id) => {
    const reason = window.prompt("Rejection reason (optional)") || "";
    setBusyId(id);
    setError("");
    try {
      await API.post(
        `/access-requests/${id}/reject`,
        { reason },
        { headers: authHeaders() }
      );
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Reject failed");
    } finally {
      setBusyId(null);
    }
  };

  if (!opsToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
        <form
          onSubmit={login}
          className="w-full max-w-sm bg-white border border-slate-200 shadow-sm p-8"
        >
          <div className="flex items-center gap-2 mb-2 text-[#0E2F4B]">
            <Lock className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Company ops — access requests</h1>
          </div>
          <p className="text-xs text-slate-500 mb-6">
            Internal RIO screen only. Not available to tenant users.
          </p>
          {error && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 px-3 py-2">
              {error}
            </div>
          )}
          <label className="block text-sm font-medium text-slate-700">Ops password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
            autoComplete="current-password"
          />
          <button
            type="submit"
            disabled={loggingIn}
            className="mt-4 w-full py-2.5 bg-[#0E2F4B] text-white text-sm font-medium disabled:opacity-60 flex justify-center gap-2"
          >
            {loggingIn && <Loader2 className="h-4 w-4 animate-spin" />}
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#0E2F4B]">Zoho access requests</h1>
          <p className="text-xs text-slate-500">Company ops — approve creates the organization</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => load()}
            className="px-3 py-2 text-sm border border-slate-300"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={logout}
            className="px-3 py-2 text-sm border border-slate-300 text-slate-600"
          >
            Lock
          </button>
        </div>
      </header>

      <div className="p-6">
        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 px-3 py-2">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#0E2F4B]" />
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Company</th>
                  <th className="px-3 py-2 font-medium">Subdomain</th>
                  <th className="px-3 py-2 font-medium">Requested</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                      No access requests yet.
                    </td>
                  </tr>
                )}
                {requests.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2 capitalize">{r.status}</td>
                    <td className="px-3 py-2">
                      <div>{r.email_normalized}</div>
                      <div className="text-xs text-slate-500">{r.full_name || ""}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div>{r.company_name}</div>
                      <div className="text-xs text-slate-500">{r.org_city || ""}</div>
                      {r.notes && (
                        <div className="text-xs text-slate-400 mt-1 max-w-xs">{r.notes}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.subdomain}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {r.status === "pending" ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => approve(r.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#0E2F4B] text-white text-xs disabled:opacity-60"
                          >
                            {busyId === r.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => reject(r.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-300 text-xs disabled:opacity-60"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">
                          {r.created_subdomain ? `→ ${r.created_subdomain}` : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
