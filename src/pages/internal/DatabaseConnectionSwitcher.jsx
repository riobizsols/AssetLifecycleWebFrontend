import React, { useState, useEffect } from "react";
import {
  Database,
  Shield,
  CheckCircle2,
  LogOut,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Loader2,
} from "lucide-react";
import API from "../../lib/axios";

const DEFAULT_DATABASES = [
  { id: "assetlifecycle", name: "assetLifecycle", description: "Asset Lifecycle" },
  { id: "hospitality", name: "hospitality", description: "Hospitality" },
  { id: "hospital", name: "hospital", description: "Hospital" },
  { id: "automobile", name: "automobile", description: "Automobile" },
  { id: "manufacturing", name: "manufacturing", description: "Manufacturing" },
];

export default function DatabaseConnectionSwitcher() {
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [selectedDbId, setSelectedDbId] = useState("");
  const [currentDbId, setCurrentDbId] = useState("");
  const [isChanging, setIsChanging] = useState(false);
  const [changeSuccess, setChangeSuccess] = useState(false);
  const [changeError, setChangeError] = useState("");

  const fetchDatabases = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setFetchError("");
    try {
      const res = await API.get("/internal/databases");
      const list = res.data?.data ?? [];
      setDatabases(Array.isArray(list) && list.length > 0 ? list : DEFAULT_DATABASES);
      const current = list.find((d) => d.isCurrent);
      setCurrentDbId(current ? current.id : "");
    } catch (err) {
      setFetchError(err?.response?.data?.message || err?.message || "Failed to load databases.");
      setDatabases(DEFAULT_DATABASES);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabases(true);
  }, []);

  const handleChangeDatabase = async () => {
    if (!selectedDbId) return;
    const db = list.find((d) => d.id === selectedDbId);
    if (!db) return;
    setIsChanging(true);
    setChangeError("");
    setChangeSuccess(false);
    try {
      const res = await API.post("/internal/switch-database", { databaseName: db.name });
      if (res.data?.success) {
        setChangeSuccess(true);
        await fetchDatabases(false);
      } else {
        setChangeError(res.data?.message || "Failed to change database.");
      }
    } catch (err) {
      setChangeError(
        err?.response?.data?.message || err?.message || "Failed to change database."
      );
    } finally {
      setIsChanging(false);
    }
  };

  const list = databases.length > 0 ? databases : DEFAULT_DATABASES;
  const selectedDb = list.find((d) => d.id === selectedDbId);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Subtle background pattern */}
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.04) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(34, 197, 94, 0.03) 0%, transparent 50%),
            linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)
          `,
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        aria-hidden
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Header */}
      <header className="relative bg-slate-900 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
        <div className="absolute inset-0 bg-[linear-gradient(1deg,transparent_0%,rgba(255,255,255,0.02)_100%)]" />
        <div className="relative max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 shadow-lg">
              <Database className="w-6 h-6 text-indigo-300" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white">
                Database Connection
              </h1>
              <p className="mt-0.5 text-sm text-slate-400 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-slate-500" strokeWidth={1.5} />
                Internal use only
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative flex-1 flex items-start justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/80 overflow-hidden ring-1 ring-slate-200/50">
            {/* Card header */}
            <div className="px-8 pt-8 pb-6 border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/30">
              <div className="flex items-center gap-2 text-indigo-600 text-sm font-medium mb-2">
                <Database className="w-4 h-4" strokeWidth={2} />
                Active database
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
                Select database
              </h2>
              <p className="mt-2 text-slate-500 text-[15px] leading-relaxed max-w-lg">
                Choose the database to use.
              </p>
            </div>

            {/* Database list */}
            <div className="px-8 py-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                  <p className="text-slate-500 text-sm font-medium">Loading databases…</p>
                </div>
              ) : (
                <>
                  {fetchError && (
                    <div className="mb-4 flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-800" role="alert">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
                      <p className="text-sm font-medium">{fetchError} Using default list.</p>
                    </div>
                  )}
                  <ul className="space-y-3">
                    {list.map((db) => {
                      const isSelected = selectedDbId === db.id;
                      const isCurrent = db.isCurrent === true;
                      return (
                        <li key={db.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedDbId(db.id)}
                            className={`group w-full text-left rounded-xl border-2 px-5 py-4 flex items-center justify-between gap-4 transition-all duration-200 ease-out ${
                              isSelected
                                ? "border-indigo-500 bg-indigo-50/90 text-slate-900 shadow-sm shadow-indigo-100/50"
                                : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100/80 text-slate-700 hover:shadow-sm"
                            }`}
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div
                                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? "border-indigo-500 bg-indigo-500 text-white"
                                    : "border-slate-300 bg-white group-hover:border-slate-400"
                                }`}
                              >
                                {isSelected && (
                                  <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={2.5} />
                                )}
                              </div>
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-200/80 group-hover:bg-slate-300/80 transition-colors">
                                  <Database className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-semibold text-slate-900 block truncate">
                                    {db.name}
                                  </span>
                                  {db.description && (
                                    <span className="text-sm text-slate-500 block truncate mt-0.5">
                                      {db.description}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {isCurrent && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1.5 rounded-lg">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Current
                                </span>
                              )}
                              <ChevronRight
                                className={`w-5 h-5 text-slate-400 transition-transform group-hover:translate-x-0.5 ${
                                  isSelected ? "text-indigo-500" : ""
                                }`}
                              />
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              {/* Change button + selected summary */}
              {!loading && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <button
                      type="button"
                      onClick={handleChangeDatabase}
                      disabled={!selectedDbId || isChanging}
                      className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-500/25 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none transition-all duration-200"
                    >
                      {isChanging ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Changing…
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" strokeWidth={2} />
                          Change database
                        </>
                      )}
                    </button>
                    {selectedDbId && selectedDb && (
                      <p className="text-sm text-slate-500 sm:text-right">
                        Selected:{" "}
                        <span className="font-semibold text-slate-700">{selectedDb.name}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Error message */}
              {changeError && (
                <div
                  className="mt-4 flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-800 animate-in fade-in duration-200"
                  role="alert"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
                  <p className="text-sm font-medium">{changeError}</p>
                </div>
              )}

              {/* Success + logout instruction */}
              {changeSuccess && (
                <div
                  className="mt-4 flex flex-col gap-3 p-5 rounded-xl bg-emerald-50 border border-emerald-100"
                  role="status"
                >
                  <div className="flex items-center gap-2 text-emerald-800">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" strokeWidth={2} />
                    </div>
                    <span className="font-semibold">Database changed successfully</span>
                  </div>
                  <div className="flex items-start gap-3 pl-10 text-emerald-700 text-sm leading-relaxed">
                    <LogOut className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
                    <p>
                      The backend is now using the new database. Log out and log in again in the app.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
