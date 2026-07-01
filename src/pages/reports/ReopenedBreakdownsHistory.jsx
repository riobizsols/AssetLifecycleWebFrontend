import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { reopenedBreakdownsService } from "../../services/reopenedBreakdownsService";
import { useRevalidateOnFocus } from "../../hooks/useRevalidateOnFocus";
import { buildCacheKey, peekCache } from "../../utils/apiCache";
import { REPORT_CACHE_TTL_MS } from "../../utils/reportCache";
import toast from "react-hot-toast";
import RouteDataLoading from "../../components/loading/RouteDataLoading";

const formatDt = (d) => (d ? new Date(d).toLocaleString() : "—");
const statusLabel = (s) => {
  if (!s) return "—";
  const map = {
    CR: "Created",
    IN: "Initiated",
    IP: "In Progress",
    CO: "Completed",
    CF: "Confirmed",
    AP: "Approved",
    RO: "Reopened",
    RJ: "Rejected",
    CN: "Cancelled",
  };
  return map[s] || s;
};

export default function ReopenedBreakdownsHistory() {
  const { amsId } = useParams();
  const { t } = useLanguage();
  const orgId = localStorage.getItem("org_id") || "ORG001";
  const cacheKey = buildCacheKey(["report", "reopened-breakdowns", "hist", orgId, amsId]);
  const cachedRows = amsId ? peekCache(cacheKey, REPORT_CACHE_TTL_MS)?.data : null;
  const [rows, setRows] = useState(Array.isArray(cachedRows) ? cachedRows : []);
  const [loading, setLoading] = useState(!cachedRows);

  const loadHistory = async ({ revalidate = true } = {}) => {
    if (!amsId) {
      setRows([]);
      setLoading(false);
      return;
    }
    try {
      const res = await reopenedBreakdownsService.getBrHistForAmsId(amsId, { revalidate });
      const data = Array.isArray(res?.data) ? res.data : [];
      setRows(data);
    } catch (err) {
      toast.error(
        err.response?.data?.message || t("reports.reopenedBreakdownsHistory.loadFailed"),
      );
      if (!peekCache(cacheKey, REPORT_CACHE_TTL_MS)) {
        setRows([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory({ revalidate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amsId]);

  useRevalidateOnFocus(() => {
    if (amsId) {
      reopenedBreakdownsService.getBrHistForAmsId(amsId, { revalidate: true }).then((res) => {
        setRows(Array.isArray(res?.data) ? res.data : []);
      }).catch(() => {});
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6 max-w-6xl mx-auto">
      <p className="text-xs text-slate-600 mb-6">
        {t("reports.reopenedBreakdownsHistory.subtitle", { id: amsId || "—" })}
      </p>

      {loading && rows.length === 0 ? (
        <RouteDataLoading
          variant="fullscreen"
          message={t("reports.reopenedBreakdownsHistory.loading")}
        />
      ) : rows.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-600">
          {t("reports.reopenedBreakdownsHistory.empty")}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    {t("reports.reopenedBreakdownsHistory.status")}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    {t("reports.reopenedBreakdownsHistory.createdOn")}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    {t("reports.reopenedBreakdownsHistory.createdBy")}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    {t("reports.reopenedBreakdownsHistory.notes")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.amsbr_id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {statusLabel(row.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {formatDt(row.created_on)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {row.created_by_name || row.created_by || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-md break-words">
                      {row.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
