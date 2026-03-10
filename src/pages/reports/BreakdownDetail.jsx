import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { breakdownHistoryService } from "../../services/breakdownHistoryService";
import API from "../../lib/axios";
import toast from "react-hot-toast";
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  PhotoIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

const formatDate = (d) => (d ? new Date(d).toLocaleString() : "—");
const formatDateOnly = (d) => (d ? new Date(d).toLocaleDateString() : "—");
const statusLabel = (s) => {
  if (!s) return "—";
  const map = { CR: "Created", IN: "Initiated", CO: "Completed", CF: "Confirmed", AP: "Approved", IP: "In Progress", Reopened: "Reopened" };
  return map[s] || s;
};

export default function BreakdownDetail() {
  const { breakdownId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDoc, setLoadingDoc] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await breakdownHistoryService.getBreakdownById(breakdownId);
        if (!cancelled && res?.success && res?.data) {
          setData(res.data);
        } else if (!cancelled && !res?.success) {
          toast.error(res?.message || t("reports.breakdownDetail.notFound"));
          navigate("/reports/breakdown-history");
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err.response?.data?.message || t("reports.breakdownDetail.loadFailed"));
          navigate("/reports/breakdown-history");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [breakdownId, navigate, t]);

  const openDoc = async (amdId, mode = "view") => {
    setLoadingDoc(amdId);
    try {
      const res = await API.get(`/asset-maint-docs/${amdId}/download?mode=${mode}`);
      if (res?.data?.url) window.open(res.data.url, "_blank");
      else toast.error(t("reports.breakdownDetail.noUrl"));
    } catch (e) {
      toast.error(e.response?.data?.message || t("reports.breakdownDetail.openFailed"));
    } finally {
      setLoadingDoc(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#143d65]" />
      </div>
    );
  }

  if (!data) return null;

  const beforeImages = data.before_images || [];
  const afterImages = data.after_images || [];
  const supportingDocs = data.supporting_documents || [];

  return (
    <div className="min-h-screen bg-white p-6 max-w-6xl mx-auto">
      {/* Header & Back */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate("/reports/breakdown-history")}
          className="flex items-center gap-2 text-slate-600 hover:text-[#143d65] font-medium"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          {t("reports.breakdownDetail.backToHistory")}
        </button>
        <h1 className="text-2xl font-bold text-slate-900">
          {t("reports.breakdownDetail.title")}: {data.breakdown_id}
        </h1>
      </div>

      {/* Breakdown details (maintenance-list style) */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <ClipboardDocumentListIcon className="w-5 h-5" />
          {t("reports.breakdownDetail.breakdownDetails")}
        </h2>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 p-6">
            <DetailRow label={t("reports.columnHeaders.breakdownId")} value={data.breakdown_id} />
            <DetailRow label={t("reports.columnHeaders.assetId")} value={data.asset_id} />
            <DetailRow label={t("reports.columnHeaders.assetName")} value={data.asset_description || data.serial_number} />
            <DetailRow label={t("reports.columnHeaders.breakdownDate")} value={formatDate(data.breakdown_date)} />
            <DetailRow label={t("reports.columnHeaders.description")} value={data.breakdown_description} />
            <DetailRow label={t("reports.columnHeaders.reportedBy")} value={data.reported_by_name} />
            <DetailRow label={t("reports.columnHeaders.vendorId")} value={data.vendor_id} />
            <DetailRow label={t("reports.columnHeaders.vendorName")} value={data.vendor_name} />
            <DetailRow label={t("reports.columnHeaders.workOrderStatus")} value={statusLabel(data.maintenance_status)} />
            <DetailRow label={t("reports.columnHeaders.breakdownStatus")} value={statusLabel(data.breakdown_status)} />
            <DetailRow label={t("reports.columnHeaders.breakdownReason")} value={data.breakdown_reason} />
            <DetailRow label={t("reports.columnHeaders.assetType")} value={data.asset_type_name} />
            <DetailRow label={t("reports.columnHeaders.department")} value={data.department_name} />
            <DetailRow label={t("reports.columnHeaders.branch")} value={data.branch_name} />
            <DetailRow label={t("reports.columnHeaders.serialNumber")} value={data.serial_number} />
            <DetailRow label={t("reports.columnHeaders.assetStatus")} value={data.asset_status} />
            <DetailRow label={t("reports.columnHeaders.purchasedOn")} value={formatDateOnly(data.purchased_on)} />
            <DetailRow label={t("reports.columnHeaders.purchasedCost")} value={data.purchased_cost != null ? `₹${data.purchased_cost}` : "—"} />
            <DetailRow label={t("reports.columnHeaders.reportedByEmail")} value={data.reported_by_email} />
            <DetailRow label={t("reports.columnHeaders.reportedByPhone")} value={data.reported_by_phone} />
            <DetailRow label={t("reports.columnHeaders.vendorContact")} value={data.vendor_contact_person} />
            <DetailRow label={t("reports.columnHeaders.vendorEmail")} value={data.vendor_email} />
            <DetailRow label={t("reports.columnHeaders.vendorPhone")} value={data.vendor_phone} />
            <DetailRow label={t("reports.columnHeaders.vendorAddress")} value={data.vendor_address} />
          </div>
        </div>
      </section>

      {/* Invoice information */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <DocumentTextIcon className="w-5 h-5" />
          {t("reports.breakdownDetail.invoiceInformation")}
        </h2>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 p-6">
            <DetailRow label={t("reports.breakdownDetail.workOrderId")} value={data.work_order_id} />
            <DetailRow label={t("reports.breakdownDetail.poNumber")} value={data.po_number} />
            <DetailRow label={t("reports.breakdownDetail.invoice")} value={data.invoice} />
            <DetailRow label={t("reports.breakdownDetail.maintenanceStartDate")} value={formatDate(data.maintenance_start_date)} />
            <DetailRow label={t("reports.breakdownDetail.maintenanceEndDate")} value={formatDate(data.maintenance_end_date)} />
            <DetailRow label={t("reports.breakdownDetail.maintenanceType")} value={data.maintenance_type_name} />
            <DetailRow label={t("reports.breakdownDetail.maintainedBy")} value={data.maintained_by} />
            <DetailRow label={t("reports.breakdownDetail.technicianName")} value={data.technician_name} />
            <DetailRow label={t("reports.breakdownDetail.technicianEmail")} value={data.technician_email} />
            <DetailRow label={t("reports.breakdownDetail.technicianPhone")} value={data.technician_phone} />
            <DetailRow label={t("reports.breakdownDetail.maintenanceNotes")} value={data.maintenance_notes} className="md:col-span-2" />
          </div>
        </div>
      </section>

      {/* Before, After, Other documents — sections full width so doc cards can use min 620px */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        {/* Before images */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <PhotoIcon className="w-5 h-5" />
            {t("reports.breakdownDetail.beforeImages")}
          </h2>
          {beforeImages.length === 0 ? (
            <p className="text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm">{t("reports.breakdownDetail.noBeforeImages")}</p>
          ) : (
            <div className="grid gap-2 sm:gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(620px, 1fr))' }}>
              {beforeImages.map((img) => (
                <DocCard key={img.amd_id} item={img} onView={() => openDoc(img.amd_id, "view")} onDownload={() => openDoc(img.amd_id, "download")} loading={loadingDoc === img.amd_id} compact={beforeImages.length > 3} />
              ))}
            </div>
          )}
        </section>

        {/* After images */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <PhotoIcon className="w-5 h-5" />
            {t("reports.breakdownDetail.afterImages")}
          </h2>
          {afterImages.length === 0 ? (
            <p className="text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm">{t("reports.breakdownDetail.noAfterImages")}</p>
          ) : (
            <div className="grid gap-2 sm:gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(620px, 1fr))' }}>
              {afterImages.map((img) => (
                <DocCard key={img.amd_id} item={img} onView={() => openDoc(img.amd_id, "view")} onDownload={() => openDoc(img.amd_id, "download")} loading={loadingDoc === img.amd_id} compact={afterImages.length > 3} />
              ))}
            </div>
          )}
        </section>

        {/* Other documents */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <PhotoIcon className="w-5 h-5" />
            {t("reports.breakdownDetail.supportingDocuments")}
          </h2>
          {supportingDocs.length === 0 ? (
            <p className="text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm">{t("reports.breakdownDetail.noSupportingDocuments")}</p>
          ) : (
            <div className="grid gap-2 sm:gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(620px, 1fr))' }}>
              {supportingDocs.map((doc) => (
                <DocCard key={doc.amd_id} item={doc} onView={() => openDoc(doc.amd_id, "view")} onDownload={() => openDoc(doc.amd_id, "download")} loading={loadingDoc === doc.amd_id} compact={supportingDocs.length > 3} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function DetailRow({ label, value, className = "" }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value ?? "—"}</dd>
    </div>
  );
}

function DocCard({ item, onView, onDownload, loading, compact }) {
  const { t } = useLanguage();
  const label = item.doc_type_text || "Document";
  if (compact) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-2 shadow-sm min-w-[620px] w-full">
        <div className="font-medium text-slate-800 truncate text-xs" title={label}>{label}</div>
        <div className="mt-2 flex gap-1 flex-wrap">
          <button type="button" onClick={onView} disabled={loading} className="text-xs px-2 py-1 rounded bg-[#143d65] text-white hover:bg-[#1e5a8a] disabled:opacity-50 whitespace-nowrap">
            {t("reports.breakdownDetail.view")}
          </button>
          <button type="button" onClick={onDownload} disabled={loading} className="text-xs px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap">
            {t("reports.breakdownDetail.download")}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm min-w-[620px] w-full">
      <div className="font-medium text-slate-800 truncate text-sm" title={label}>{label}</div>
      <div className="mt-2 flex gap-2 flex-wrap">
        <button type="button" onClick={onView} disabled={loading} className="text-sm px-2.5 py-1.5 rounded-lg bg-[#143d65] text-white hover:bg-[#1e5a8a] disabled:opacity-50 whitespace-nowrap">
          {t("reports.breakdownDetail.view")}
        </button>
        <button type="button" onClick={onDownload} disabled={loading} className="text-sm px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap">
          {t("reports.breakdownDetail.download")}
        </button>
      </div>
    </div>
  );
}
