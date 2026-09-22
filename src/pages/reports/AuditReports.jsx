import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Download, FileText, Settings2 } from 'lucide-react';
import { auditReportService } from '../../services/auditReportService';
import { useAuditLog } from '../../hooks/useAuditLog';
import { REPORTS_APP_IDS } from '../../constants/reportsAuditEvents';
import {
  API_SECTIONS,
  PAGE_SIZE,
  defaultFieldSelection,
} from './auditReports/constants';
import { buildHistoryByAsset, enrichAssets } from './auditReports/utils';
import { useAuditReportPdf, pdfNeedsDocUrlPrep } from './auditReports/useAuditReportPdf';
import ConfigurePanel from './auditReports/ConfigurePanel';
import SummaryStrip from './auditReports/SummaryStrip';
import AuditCharts from './auditReports/AuditCharts';
import AssetResultsTable from './auditReports/AssetResultsTable';
import FieldsDrawer from './auditReports/FieldsDrawer';
import ExportDialog from './auditReports/ExportDialog';

export default function AuditReports() {
  const { recordActionByNameWithFetch } = useAuditLog(REPORTS_APP_IDS.AUDIT_REPORT);

  const [auditTypes, setAuditTypes] = useState([]);
  const [audtpId, setAudtpId] = useState('');
  const [period, setPeriod] = useState('current_year');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [mappedTypes, setMappedTypes] = useState([]);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState([]);
  const [fieldSelection, setFieldSelection] = useState(defaultFieldSelection);
  const [draftFields, setDraftFields] = useState(defaultFieldSelection);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingMapped, setLoadingMapped] = useState(false);
  const [loadingView, setLoadingView] = useState(false);
  const [report, setReport] = useState(null);
  const [assetSearch, setAssetSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedAssetId, setExpandedAssetId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingTypes(true);
        const data = await auditReportService.getAuditTypes();
        if (cancelled) return;
        setAuditTypes(data);
      } catch (err) {
        toast.error(err?.response?.data?.error || 'Failed to load audit types');
      } finally {
        if (!cancelled) setLoadingTypes(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!audtpId) {
      setMappedTypes([]);
      setSelectedAssetTypes([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingMapped(true);
        const data = await auditReportService.getMappedAssetTypes(audtpId);
        if (cancelled) return;
        setMappedTypes(data);
        setSelectedAssetTypes(data.map((d) => d.asset_type_id));
      } catch (err) {
        toast.error(err?.response?.data?.error || 'Failed to load mapped asset types');
        setMappedTypes([]);
        setSelectedAssetTypes([]);
      } finally {
        if (!cancelled) setLoadingMapped(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [audtpId]);

  const assetTypeOptions = useMemo(
    () =>
      mappedTypes.map((m) => ({
        value: m.asset_type_id,
        label: m.asset_type_name || m.asset_type_id,
      })),
    [mappedTypes],
  );

  const selectedAssetTypeChips = useMemo(() => {
    const byId = new Map(
      mappedTypes.map((m) => [m.asset_type_id, m.asset_type_name || m.asset_type_id]),
    );
    return selectedAssetTypes.map((id) => ({ id, label: byId.get(id) || id }));
  }, [mappedTypes, selectedAssetTypes]);

  const canView = useMemo(() => {
    if (!audtpId || selectedAssetTypes.length === 0) return false;
    if (period === 'specific' && (!dateFrom || !dateTo)) return false;
    return true;
  }, [audtpId, selectedAssetTypes, period, dateFrom, dateTo]);

  const handleView = useCallback(async () => {
    if (!canView) {
      toast.error('Select audit type, period, and at least one asset type');
      return;
    }
    try {
      setLoadingView(true);
      const data = await auditReportService.viewReport({
        audtp_id: audtpId,
        period,
        date_from: period === 'specific' ? dateFrom : undefined,
        date_to: period === 'specific' ? dateTo : undefined,
        asset_type_ids: selectedAssetTypes,
        sections: API_SECTIONS,
      });

      // Attach AMC / CMC / warranty rows for assets in this audit (used by PDF + summary).
      try {
        const assetIds = new Set(
          (data?.assets || data?.sections?.assetDetails || []).map((a) => a.asset_id).filter(Boolean),
        );
        const coverageData = await auditReportService.viewCoverageReport({
          coverage_types: ['Warranty', 'AMC', 'CMC'],
          statuses: ['Active', 'Expiring', 'Expired'],
          expiring_days: 30,
        });
        const coverageRows = (coverageData?.rows || []).filter((r) => assetIds.has(r.asset_id));
        data.sections = { ...(data.sections || {}), coverage: coverageRows };
      } catch {
        data.sections = { ...(data.sections || {}), coverage: [] };
      }

      setReport(data);
      setPage(1);
      setAssetSearch('');
      setExpandedAssetId(null);
      setActiveTab('overview');
      await recordActionByNameWithFetch('Generate Report', {
        reportType: 'Audit Reports',
        action: 'Audit report viewed',
        audtp_id: audtpId,
        period,
        assetTypeCount: selectedAssetTypes.length,
      }).catch(() => {});
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || 'Failed to load audit report');
    } finally {
      setLoadingView(false);
    }
  }, [
    canView,
    audtpId,
    period,
    dateFrom,
    dateTo,
    selectedAssetTypes,
    recordActionByNameWithFetch,
  ]);

  const byAsset = useMemo(() => buildHistoryByAsset(report), [report]);
  const enrichedAssets = useMemo(() => enrichAssets(byAsset), [byAsset]);

  const filteredAssets = useMemo(() => {
    const q = assetSearch.trim().toLowerCase();
    if (!q) return enrichedAssets;
    return enrichedAssets.filter((a) => {
      const hay = [
        a.asset_id,
        a.serial_number,
        a.asset_description,
        a.asset_type_name,
        a.branch_name,
        a.department_name,
        a.asset_status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [enrichedAssets, assetSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / PAGE_SIZE));
  const pagedAssets = filteredAssets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const summary = useMemo(() => {
    if (!report) return null;
    return [
      { label: 'Assets', value: enrichedAssets.length },
      { label: 'Maintenance records', value: report.sections?.maintenance?.length || 0 },
      { label: 'Breakdowns', value: report.sections?.breakdown?.length || 0 },
      { label: 'Certifications', value: report.sections?.certifications?.length || 0 },
      { label: 'Invoices', value: report.sections?.invoices?.length || 0 },
      { label: 'Purchase orders', value: report.sections?.purchaseOrders?.length || 0 },
      { label: 'AMC / CMC / Warranty', value: report.sections?.coverage?.length || 0 },
    ];
  }, [report, enrichedAssets.length]);

  const selectedFieldCount = useMemo(
    () => Object.values(fieldSelection).filter(Boolean).length,
    [fieldSelection],
  );

  const buildPdf = useAuditReportPdf({ report, enrichedAssets, fieldSelection });

  const needsDocPrep = useMemo(
    () => pdfNeedsDocUrlPrep(report, fieldSelection),
    [report, fieldSelection],
  );

  const openFieldsDrawer = () => {
    setDraftFields({ ...fieldSelection });
    setFieldsOpen(true);
  };

  const applyFields = () => {
    setFieldSelection({ ...draftFields });
    setFieldsOpen(false);
  };

  const toggleExpand = (assetId) => {
    setExpandedAssetId((prev) => (prev === assetId ? null : assetId));
    setActiveTab('overview');
  };

  const handleExport = async () => {
    const showLoading = needsDocPrep;
    try {
      if (showLoading) setExporting(true);
      await buildPdf();
      setExportOpen(false);
      await recordActionByNameWithFetch('Export Report', {
        reportType: 'Audit Reports',
        action: 'Audit report PDF downloaded',
        audtp_id: report?.auditType?.audtp_id,
      }).catch(() => {});
      toast.success('PDF downloaded');
    } catch (err) {
      toast.error(err?.message || 'Failed to export PDF');
    } finally {
      if (showLoading) setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <ConfigurePanel
          auditTypes={auditTypes}
          audtpId={audtpId}
          setAudtpId={setAudtpId}
          period={period}
          setPeriod={setPeriod}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          loadingTypes={loadingTypes}
          loadingMapped={loadingMapped}
          assetTypeOptions={assetTypeOptions}
          selectedAssetTypes={selectedAssetTypes}
          setSelectedAssetTypes={setSelectedAssetTypes}
          selectedAssetTypeChips={selectedAssetTypeChips}
          canView={canView}
          loadingView={loadingView}
          onView={handleView}
          onClearReport={() => setReport(null)}
        />

        {!report && !loadingView && (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-8 py-16 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800">No report yet</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
              Select an audit type, period, and asset types, then click View report. Summary counts
              and tabs fill from maintenance, breakdowns, documents, invoices, and POs already
              stored on those assets.
            </p>
          </section>
        )}

        {report && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {report.auditType?.description || 'Audit report'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">{report.period?.label}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openFieldsDrawer}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                >
                  <Settings2 className="w-4 h-4" />
                  Select fields
                </button>
                <button
                  type="button"
                  onClick={() => setExportOpen(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
              </div>
            </div>

            <SummaryStrip summary={summary} />
            <AuditCharts assets={enrichedAssets} report={report} />
            <AssetResultsTable
              report={report}
              filteredAssets={filteredAssets}
              pagedAssets={pagedAssets}
              assetSearch={assetSearch}
              setAssetSearch={setAssetSearch}
              page={page}
              setPage={setPage}
              totalPages={totalPages}
              expandedAssetId={expandedAssetId}
              toggleExpand={toggleExpand}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          </section>
        )}
      </div>

      <FieldsDrawer
        open={fieldsOpen}
        draftFields={draftFields}
        setDraftFields={setDraftFields}
        onClose={() => setFieldsOpen(false)}
        onReset={() => setDraftFields(defaultFieldSelection())}
        onApply={applyFields}
      />

      <ExportDialog
        open={exportOpen}
        report={report}
        assetCount={enrichedAssets.length}
        fieldCount={selectedFieldCount}
        loading={exporting}
        onClose={() => {
          if (!exporting) setExportOpen(false);
        }}
        onExport={handleExport}
      />
    </div>
  );
}
