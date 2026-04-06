import React, { useState } from "react";
import { Clock, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import API from "../../lib/axios";
import { useLanguage } from "../../contexts/LanguageContext";

/**
 * Manual triggers for workflow backfill jobs (same logic as scheduled crons).
 */
const OneTimeCron = () => {
  const { t } = useLanguage();
  const [runningMaintenance, setRunningMaintenance] = useState(false);
  const [runningScrap, setRunningScrap] = useState(false);
  const [maintenanceResult, setMaintenanceResult] = useState(null);
  const [scrapResult, setScrapResult] = useState(null);
  const [maintenanceError, setMaintenanceError] = useState("");
  const [scrapError, setScrapError] = useState("");

  const runMaintenanceWfatBackfill = async () => {
    if (runningMaintenance || runningScrap) return;
    setRunningMaintenance(true);
    setMaintenanceError("");
    setMaintenanceResult(null);
    try {
      const response = await API.post(
        "/cron-jobs/one-time/set-default-workflow-sequence",
      );
      setMaintenanceResult(response.data?.result || null);
      toast.success(
        t("oneTimeCron.maintenanceSuccess") ||
          "Maintenance workflow backfill completed",
      );
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Request failed";
      setMaintenanceError(msg);
      toast.error(msg);
    } finally {
      setRunningMaintenance(false);
    }
  };

  const runScrapWfSeqBackfill = async () => {
    if (runningMaintenance || runningScrap) return;
    setRunningScrap(true);
    setScrapError("");
    setScrapResult(null);
    try {
      const response = await API.post(
        "/cron-jobs/one-time/set-default-scrap-workflow-sequence",
      );
      setScrapResult(response.data?.result || null);
      toast.success(
        t("oneTimeCron.scrapSuccess") || "Scrap workflow backfill completed",
      );
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Request failed";
      setScrapError(msg);
      toast.error(msg);
    } finally {
      setRunningScrap(false);
    }
  };

  const renderResult = (result) => {
    if (!result) return null;
    return (
      <div className="mt-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">
        {t("oneTimeCron.scanned") || "Scanned"}: {result.scanned ?? 0},{" "}
        {t("oneTimeCron.inserted") || "Inserted"}: {result.inserted ?? 0},{" "}
        {t("oneTimeCron.skippedMissingStep") || "Skipped (missing WF step)"}:{" "}
        {result.skipped ?? 0}
        {(result.skippedAlreadyHasSeq ?? 0) > 0
          ? `, ${t("oneTimeCron.skippedAlreadyExists") || "Skipped (already exists)"}: ${result.skippedAlreadyHasSeq}`
          : ""}
        , {t("oneTimeCron.errors") || "Errors"}: {result.errors ?? 0}
      </div>
    );
  };

  return (
    <div className="min-w-0 bg-gray-50 px-2 py-4 sm:px-4 lg:px-6">
      <div className="mb-6 flex items-start gap-3">
        <div className="rounded-lg bg-[#0E2F4B] p-3 text-white">
          <Clock className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("oneTimeCron.pageTitle") || "One time cron"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {t("oneTimeCron.pageSubtitle") ||
              "Run workflow backfill jobs manually. Scheduled jobs also run daily at different times."}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("oneTimeCron.maintenanceTitle") || "Maintenance workflow"}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {t("oneTimeCron.maintenanceDesc") ||
              "Adds default maintenance approval sequence (e.g. WFS-06, sequence 10) for each asset type that has no maintenance workflow sequence configured. Cron: daily 1:00 AM IST."}
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={runMaintenanceWfatBackfill}
              disabled={runningMaintenance || runningScrap}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
                runningMaintenance || runningScrap
                  ? "cursor-not-allowed bg-gray-300 text-gray-600"
                  : "bg-[#0E2F4B] text-white hover:bg-[#14395c]"
              }`}
            >
              {runningMaintenance ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {t("oneTimeCron.running") || "Running…"}
                </>
              ) : (
                t("oneTimeCron.runMaintenanceBackfill") ||
                "Run maintenance workflow backfill"
              )}
            </button>
          </div>
          {maintenanceError && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {maintenanceError}
            </div>
          )}
          {renderResult(maintenanceResult)}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("oneTimeCron.scrapTitle") || "Scrap workflow"}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {t("oneTimeCron.scrapDesc") ||
              "Adds one-level scrap approval (WFS-02, sequence 10) for each asset type that has no scrap workflow sequence configured. Cron: daily 3:30 AM IST."}
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={runScrapWfSeqBackfill}
              disabled={runningMaintenance || runningScrap}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
                runningMaintenance || runningScrap
                  ? "cursor-not-allowed bg-gray-300 text-gray-600"
                  : "bg-emerald-800 text-white hover:bg-emerald-900"
              }`}
            >
              {runningScrap ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {t("oneTimeCron.running") || "Running…"}
                </>
              ) : (
                t("oneTimeCron.runScrapBackfill") ||
                "Run scrap workflow backfill"
              )}
            </button>
          </div>
          {scrapError && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {scrapError}
            </div>
          )}
          {renderResult(scrapResult)}
        </section>
      </div>
    </div>
  );
};

export default OneTimeCron;
