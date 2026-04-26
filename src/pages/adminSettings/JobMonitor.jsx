import { showBackendTextToast } from '../../utils/errorTranslation';
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Play, Edit2, Save, X, Copy, Loader2 } from "lucide-react";
import API from "../../lib/axios";
import { toast } from "react-hot-toast";

const JobMonitor = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [runningJobId, setRunningJobId] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editJobId, setEditJobId] = useState(null);
  const [editState, setEditState] = useState({ frequency: "", status: "DISABLED" });
  const [expandedJsonRows, setExpandedJsonRows] = useState({});
  const [historyDateText, setHistoryDateText] = useState("");
  const [historyDatePicker, setHistoryDatePicker] = useState("");
  const historyDatePickerRef = useRef(null);
  const [isCleaningWarranty, setIsCleaningWarranty] = useState(false);

  const selectedJob = useMemo(
    () => jobs.find((j) => j.job_id === selectedJobId) || null,
    [jobs, selectedJobId],
  );

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await API.get("/job-monitor/jobs");
      const rows = res.data?.data || [];
      setJobs(rows);
      if (!selectedJobId && rows.length > 0) {
        setSelectedJobId(rows[0].job_id);
      }
    } catch (err) {
      console.error("Failed to fetch jobs", err);
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_FETCH_JOBS_5407363E', fallbackText: 'Failed to fetch jobs', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (jobId) => {
    if (!jobId) return;
    setHistoryLoading(true);
    try {
      const res = await API.get(`/job-monitor/jobs/${jobId}/history`);
      setHistory(res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch history", err);
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_FETCH_JOB_HISTORY_68A8BFB7', fallbackText: 'Failed to fetch job history', type: 'error' });
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (selectedJobId) fetchHistory(selectedJobId);
  }, [selectedJobId]);

  const onRunJob = async (job) => {
    setRunningJobId(job.job_id);
    try {
      await API.post(`/job-monitor/jobs/${job.job_id}/run`);
      showBackendTextToast({ toast, tmdId: 'TMD_JOB_TRIGGERED_SUCCESSFULLY_6107414D', fallbackText: 'Job triggered successfully', type: 'success' });
      await fetchHistory(job.job_id);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to run job";
      toast.error(msg);
      await fetchHistory(job.job_id);
    } finally {
      setRunningJobId(null);
    }
  };

  const onStartEdit = (job) => {
    setEditJobId(job.job_id);
    setEditState({
      frequency: job.frequency || "",
      status: String(job.status || "DISABLED").toUpperCase(),
    });
  };

  const onCancelEdit = () => {
    setEditJobId(null);
    setEditState({ frequency: "", status: "DISABLED" });
  };

  const onSaveEdit = async (jobId) => {
    try {
      await API.put(`/job-monitor/jobs/${jobId}`, {
        frequency: editState.frequency,
        status: editState.status,
      });
      showBackendTextToast({ toast, tmdId: 'TMD_JOB_UPDATED_59AD4CC8', fallbackText: 'Job updated', type: 'success' });
      onCancelEdit();
      await fetchJobs();
    } catch (err) {
      console.error("Failed to update job", err);
      toast.error(err.response?.data?.message || "Failed to update job");
    }
  };

  const frequencyPresets = [
    { label: "Every 5 minutes", value: "*/5 * * * *" },
    { label: "Every 15 minutes", value: "*/15 * * * *" },
    { label: "Every 30 minutes", value: "*/30 * * * *" },
    { label: "Every hour", value: "0 * * * *" },
    { label: "Daily at 12:00 AM", value: "0 0 * * *" },
    { label: "Daily at 8:00 AM", value: "0 8 * * *" },
  ];

  const onCleanupWarrantyNotifications = async () => {
    setIsCleaningWarranty(true);
    try {
      const res = await API.post("/job-monitor/warranty-notifications/cleanup", { limit: 100 });
      const deletedCount = res?.data?.data?.deletedCount ?? 0;
      toast.success(`Deleted oldest ${deletedCount} warranty notifications`);
      await fetchJobs();
      if (selectedJobId) await fetchHistory(selectedJobId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to clean warranty notifications");
    } finally {
      setIsCleaningWarranty(false);
    }
  };

  const formatDate = (ts) => {
    try {
      const dt = new Date(ts);
      return dt.toLocaleDateString("en-GB");
    } catch (_) {
      return "-";
    }
  };

  const formatTime = (ts) => {
    try {
      const dt = new Date(ts);
      return dt.toLocaleTimeString();
    } catch (_) {
      return "-";
    }
  };

  const copyJson = async (value) => {
    const text = JSON.stringify(value || {}, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      showBackendTextToast({ toast, tmdId: 'TMD_JSON_COPIED_0E52DB04', fallbackText: 'JSON copied', type: 'success' });
    } catch (_) {
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_COPY_1A2BD537', fallbackText: 'Failed to copy', type: 'error' });
    }
  };

  const getJsonPreview = (value) => {
    const text = JSON.stringify(value || {});
    if (text.length <= 160) return text;
    return `${text.slice(0, 160)}...`;
  };

  const actionBtnBase =
    "h-9 w-9 inline-flex items-center justify-center rounded-full border border-slate-300/80 bg-slate-100/90 backdrop-blur-sm shadow-sm transition-all duration-200 ease-out hover:bg-slate-200 hover:border-slate-400 hover:shadow active:scale-95 active:shadow-inner disabled:opacity-50 disabled:cursor-not-allowed";

  const formatDateInputWithSlashes = (value) => {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const handleHistoryDateTextChange = (value) => {
    const formatted = formatDateInputWithSlashes(value);
    setHistoryDateText(formatted);
    if (formatted.length === 10) {
      const [dd, mm, yyyy] = formatted.split("/");
      if (dd && mm && yyyy) {
        setHistoryDatePicker(`${yyyy}-${mm}-${dd}`);
      }
    } else if (!formatted) {
      setHistoryDatePicker("");
    }
  };

  const handleHistoryDatePickerChange = (value) => {
    setHistoryDatePicker(value);
    if (!value) {
      setHistoryDateText("");
      return;
    }
    const [yyyy, mm, dd] = value.split("-");
    setHistoryDateText(`${dd}/${mm}/${yyyy}`);
  };

  const filteredHistory = useMemo(() => {
    if (!historyDateText || historyDateText.length !== 10) return history;
    return history.filter((h) => formatDate(h.execution_timestamp) === historyDateText);
  }, [history, historyDateText]);

  const formatJobFrequency = (frequency) => {
    const raw = String(frequency || "").trim();
    if (!raw) return { label: "-", raw: "" };

    const lowered = raw.toLowerCase();

    // Common readable values first
    if (lowered === "on demand" || lowered === "ondemand") {
      return { label: "On demand", raw };
    }
    if (lowered === "daily") return { label: "Daily", raw };
    if (lowered === "weekly") return { label: "Weekly", raw };
    if (lowered === "monthly") return { label: "Monthly", raw };

    const formatHour12 = (hour24, minute = 0) => {
      const h = Number(hour24);
      const m = Number(minute);
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      const suffix = h >= 12 ? "PM" : "AM";
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      const min = String(m).padStart(2, "0");
      return `${hour12}:${min} ${suffix}`;
    };

    // Cron patterns (minute hour day month weekday)
    const cronParts = raw.split(/\s+/).filter(Boolean);
    if (cronParts.length === 5) {
      const [minute, hour, dayOfMonth, month, dayOfWeek] = cronParts;

      // Every N minutes
      if (/^\*\/\d+$/.test(minute) && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
        const n = Number(minute.replace("*/", ""));
        return { label: `Every ${n} minutes`, raw };
      }

      // Every hour at mm minutes
      if (/^\d+$/.test(minute) && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
        const mm = String(Number(minute)).padStart(2, "0");
        return { label: `Every hour at :${mm}`, raw };
      }

      // Daily at hh:mm
      if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
        const time = formatHour12(hour, minute);
        return { label: time ? `Daily at ${time}` : "Daily", raw };
      }

      // Weekly at hh:mm (specific weekday 0-6)
      if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && dayOfMonth === "*" && month === "*" && /^[0-6]$/.test(dayOfWeek)) {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const dayName = days[Number(dayOfWeek)];
        const time = formatHour12(hour, minute);
        return { label: `${dayName}${time ? ` at ${time}` : ""}`, raw };
      }

      // Monthly (specific day of month) at hh:mm
      if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && /^\d+$/.test(dayOfMonth) && month === "*" && dayOfWeek === "*") {
        const dayNum = Number(dayOfMonth);
        const time = formatHour12(hour, minute);
        return { label: `Monthly on day ${dayNum}${time ? ` at ${time}` : ""}`, raw };
      }
    }

    // Milliseconds/seconds fallback (some jobs store interval values)
    if (/^\d+$/.test(raw)) {
      const value = Number(raw);
      if (value >= 60000) {
        const mins = Math.round(value / 60000);
        return { label: `Every ${mins} minute${mins === 1 ? "" : "s"}`, raw };
      }
      if (value >= 1000) {
        const secs = Math.round(value / 1000);
        return { label: `Every ${secs} second${secs === 1 ? "" : "s"}`, raw };
      }
      return { label: `Every ${value} ms`, raw };
    }

    return { label: raw, raw };
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Job Monitor</h1>
        <p className="text-sm text-gray-600 mt-1">
          Monitor cron jobs, edit frequency/status, trigger runs, and inspect last 100 history rows.
        </p>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 font-semibold text-gray-800">
          Job List
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#0E2F4B] text-white">
              <tr>
                <th className="px-4 py-3 text-left">Job Name</th>
                <th className="px-4 py-3 text-left">Frequency</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-600">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Loading jobs...
                  </td>
                </tr>
              ) : (
                jobs.map((job, idx) => {
                  const isEditing = editJobId === job.job_id;
                  const isSelected = selectedJobId === job.job_id;
                  const isRunning = runningJobId === job.job_id;
                  return (
                    <tr
                      key={job.job_id}
                      className={`border-b cursor-pointer ${idx % 2 ? "bg-gray-50" : "bg-white"} ${isSelected ? "ring-1 ring-blue-400" : ""}`}
                      onClick={() => setSelectedJobId(job.job_id)}
                    >
                      <td className="px-4 py-3">{job.job_name}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              value={editState.frequency}
                              onChange={(e) => setEditState((p) => ({ ...p, frequency: e.target.value }))}
                              className="px-2 py-1 border rounded w-52"
                              placeholder="Enter cron or use preset"
                            />
                            <select
                              value=""
                              onChange={(e) => {
                                if (!e.target.value) return;
                                setEditState((p) => ({ ...p, frequency: e.target.value }));
                              }}
                              className="px-2 py-1 border rounded w-52 text-xs bg-white"
                            >
                              <option value="">Select preset...</option>
                              {frequencyPresets.map((preset) => (
                                <option key={preset.value} value={preset.value}>
                                  {preset.label}
                                </option>
                              ))}
                            </select>
                            <p className="text-[11px] text-gray-500">
                              Tip: use preset if you do not know cron format.
                            </p>
                          </div>
                        ) : (() => {
                          const formatted = formatJobFrequency(job.frequency);
                          return <span className="font-medium text-gray-900">{formatted.label}</span>;
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            value={editState.status}
                            onChange={(e) => setEditState((p) => ({ ...p, status: e.target.value }))}
                            className="px-2 py-1 border rounded"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="ENABLED">ENABLED</option>
                            <option value="DISABLED">DISABLED</option>
                          </select>
                        ) : isRunning ? (
                          <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">RUNNING</span>
                        ) : (
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              String(job.status).toUpperCase() === "ENABLED"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {String(job.status || "DISABLED").toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSaveEdit(job.job_id);
                                }}
                                className={`${actionBtnBase} text-green-700 hover:text-green-800`}
                                title="Save"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCancelEdit();
                                }}
                                className={`${actionBtnBase} text-gray-700 hover:text-gray-900`}
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onStartEdit(job);
                                }}
                                className={`${actionBtnBase} text-blue-700 hover:text-blue-900`}
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRunJob(job);
                                }}
                                disabled={isRunning}
                                className={`${actionBtnBase} text-[#0E2F4B] hover:text-[#143d65]`}
                                title="Run"
                              >
                                {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                              </button>
                              {job.job_id === "JOB006" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCleanupWarrantyNotifications();
                                  }}
                                  disabled={isCleaningWarranty}
                                  className="h-9 px-3 inline-flex items-center justify-center rounded-full border border-red-300 bg-red-50 text-red-700 text-xs font-semibold transition-all duration-200 hover:bg-red-100 disabled:opacity-60"
                                  title="Clear 100 oldest notifications"
                                >
                                  {isCleaningWarranty ? "Cleaning..." : "Clear Oldest 100"}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between gap-3">
          <div className="font-semibold text-gray-800 truncate">
            Job History {selectedJob ? `- ${selectedJob.job_name}` : ""}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                placeholder="DD/MM/YYYY"
                value={historyDateText}
                onChange={(e) => handleHistoryDateTextChange(e.target.value)}
                className="pl-3 pr-10 py-1.5 border rounded text-xs w-32 sm:w-36"
              />
              <button
                onClick={() => historyDatePickerRef.current?.showPicker?.()}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 text-gray-600"
                title="Open calendar"
                type="button"
              >
                📅
              </button>
              <input
                ref={historyDatePickerRef}
                type="date"
                value={historyDatePicker}
                onChange={(e) => handleHistoryDatePickerChange(e.target.value)}
                className="absolute opacity-0 pointer-events-none h-0 w-0"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
            <button
              onClick={() => {
                setHistoryDateText("");
                setHistoryDatePicker("");
              }}
              className="px-2.5 py-1.5 border rounded text-xs hover:bg-gray-100"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="max-h-[460px] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#0E2F4B] text-white">
              <tr>
                <th className="px-4 py-3 text-left">Date Executed</th>
                <th className="px-4 py-3 text-left">Time Taken (ms)</th>
                <th className="px-4 py-3 text-left">Output JSON</th>
                <th className="px-4 py-3 text-left">Error</th>
              </tr>
            </thead>
            <tbody>
              {historyLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-600">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Loading history...
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-600">
                    No history found
                  </td>
                </tr>
              ) : (
                filteredHistory.map((h, idx) => (
                  <tr key={h.jh_id} className={`border-b align-top ${idx % 2 ? "bg-gray-50" : "bg-white"}`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>{formatDate(h.execution_timestamp)}</div>
                      <div className="text-xs text-gray-500">{formatTime(h.execution_timestamp)}</div>
                    </td>
                    <td className="px-4 py-3">{h.duration_ms ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">JSON</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setExpandedJsonRows((prev) => ({
                                ...prev,
                                [h.jh_id]: !prev[h.jh_id],
                              }))
                            }
                            className="px-2 py-1 rounded border text-xs hover:bg-gray-100"
                            title={expandedJsonRows[h.jh_id] ? "Collapse JSON" : "Expand JSON"}
                          >
                            {expandedJsonRows[h.jh_id] ? "Collapse" : "Expand"}
                          </button>
                          <button
                            onClick={() => copyJson(h.output_json)}
                            className="p-1 rounded border hover:bg-gray-100"
                            title="Copy JSON"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {!expandedJsonRows[h.jh_id] ? (
                        <div className="bg-gray-100 rounded p-2 text-xs text-gray-700 break-all">
                          {getJsonPreview(h.output_json)}
                        </div>
                      ) : (
                        <pre className="max-h-40 overflow-auto bg-gray-100 rounded p-2 text-xs whitespace-pre-wrap">
                          {JSON.stringify(h.output_json || {}, null, 2)}
                        </pre>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {h.is_error ? (
                        <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">ERROR</span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">OK</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default JobMonitor;

