import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { breakdownHistoryService } from "../../services/breakdownHistoryService";
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

const statusLabel = (s) => {
  if (!s) return "—";
  const map = {
    CR: "Created",
    IN: "Initiated",
    CO: "Completed",
    CF: "Confirmed",
    AP: "Approved",
    IP: "In Progress",
    Reopened: "Reopened",
  };
  return map[s] || s;
};

const formatDate = (d) => (d ? new Date(d).toLocaleString() : "—");

export default function BreakdownReopenDetails() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await breakdownHistoryService.getReopenedMultiple();
        if (!cancelled && res?.success && Array.isArray(res?.data)) {
          setData(res.data);
        } else if (!cancelled) {
          setData([]);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err.response?.data?.message ||
              t("reports.breakdownReopenDetails.loadFailed") ||
              "Failed to load reopen details"
          );
          setData([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <div className="min-h-screen bg-white p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate("/reports/breakdown-history")}
          className="flex items-center gap-2 text-slate-600 hover:text-[#143d65] font-medium"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          {t("reports.breakdownReopenDetails.backToHistory")}
        </button>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ExclamationTriangleIcon className="w-7 h-7 text-amber-500" />
          {t("reports.breakdownReopenDetails.title")}
        </h1>
      </div>

      <p className="text-slate-600 mb-6">
        {t("reports.breakdownReopenDetails.subtitle")}
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#143d65]" />
        </div>
      ) : data.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
          <DocumentTextIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">
            {t("reports.breakdownReopenDetails.noData")}
          </p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t("reports.breakdownReopenDetails.breakdownId")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t("reports.breakdownReopenDetails.serialNumber")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t("reports.breakdownReopenDetails.assetType")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t("reports.breakdownReopenDetails.description")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t("reports.breakdownReopenDetails.status")}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t("reports.breakdownReopenDetails.reopenCount")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t("reports.breakdownReopenDetails.reportedBy")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t("reports.breakdownReopenDetails.createdOn")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {data.map((row) => (
                  <tr
                    key={row.abr_id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() =>
                      navigate(`/reports/breakdown-history/${row.abr_id}`)
                    }
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[#143d65] font-medium hover:underline">
                        {row.abr_id}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {row.serial_number || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {row.asset_type_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs truncate">
                      {row.description || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          row.breakdown_status === "Reopened"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {statusLabel(row.breakdown_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-semibold text-sm">
                        {row.reopen_count ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {row.reported_by_name || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 text-sm">
                      {formatDate(row.created_on)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && data.length > 0 && (
        <p className="mt-4 text-sm text-slate-500">
          {t("reports.breakdownReopenDetails.footer")}
        </p>
      )}
    </div>
  );
}
