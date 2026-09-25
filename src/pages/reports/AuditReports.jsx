import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ChevronDown, Download, FileText, Settings2 } from 'lucide-react';
import { auditReportService } from '../../services/auditReportService';
import { useAuditLog } from '../../hooks/useAuditLog';
import { REPORTS_APP_IDS } from '../../constants/reportsAuditEvents';
import {
  applyAdvancedFilters,
  ReportPreviewModal,
  useReportColumns,
} from '../../components/reportModels/ReportExtras';
import {
  API_SECTIONS,
  PAGE_SIZE,
  CURRENT_YEAR,
  defaultFieldSelection,
} from './auditReports/constants';
import { buildHistoryByAsset, enrichAssets } from './auditReports/utils';
import { useAuditReportPdf, pdfNeedsDocUrlPrep } from './auditReports/useAuditReportPdf';
import ConfigurePanel from './auditReports/ConfigurePanel';
import SummaryStrip from './auditReports/SummaryStrip';
import AuditCharts from './auditReports/AuditCharts';
import AssetResultsTable from './auditReports/AssetResultsTable';
import FieldsDrawer from './auditReports/FieldsDrawer';
import { exportAuditReportExcel } from './auditReports/exportAuditReport';
import {
  AUDIT_REPORT_COLUMNS,
  AUDIT_REPORT_FIELD_ACCESSORS,
  getAuditReportCellValue,
} from './newReportExtrasConfig';

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
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);
  const [advanced, setAdvanced] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { columns } = useReportColumns(
    AUDIT_REPORT_COLUMNS.default,
    AUDIT_REPORT_COLUMNS.all,
  );

  const loadAuditTypes = useCallback(async ({ preserveSelection = true } = {}) => {
    try {
      setLoadingTypes(true);
      const data = await auditReportService.getAuditTypes();
      setAuditTypes(data);
      if (preserveSelection) {
        setAudtpId((prev) => {
          if (prev && data.some((t) => t.audtp_id === prev)) return prev;
          return data[0]?.audtp_id || '';
        });
      }
      return data;
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to load audit types');
      return [];
    } finally {
      setLoadingTypes(false);
    }
  }, []);

  const loadMappedTypes = useCallback(async (id, { resetSelection = true } = {}) => {
    if (!id) {
      setMappedTypes([]);
      setSelectedAssetTypes([]);
      return [];
    }
    try {
      setLoadingMapped(true);
      const data = await auditReportService.getMappedAssetTypes(id);
      setMappedTypes(data);
      const mappedIds = data.map((d) => d.asset_type_id);
      if (resetSelection) {
        setSelectedAssetTypes(mappedIds);
      } else {
        setSelectedAssetTypes((prev) => {
          const allowed = new Set(mappedIds);
          const kept = prev.filter((x) => allowed.has(x));
          if (kept.length) return kept;
          return mappedIds;
        });
      }
      return data;
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to load mapped asset types');
      setMappedTypes([]);
      setSelectedAssetTypes([]);
      return [];
    } finally {
      setLoadingMapped(false);
    }
  }, []);

  useEffect(() => {
    loadAuditTypes();
  }, [loadAuditTypes]);

  useEffect(() => {
    loadMappedTypes(audtpId, { resetSelection: true });
  }, [audtpId, loadMappedTypes]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState && document.visibilityState !== 'visible') return;
      loadAuditTypes({ preserveSelection: true }).then(() => {
        if (audtpId) loadMappedTypes(audtpId, { resetSelection: false });
      });
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [audtpId, loadAuditTypes, loadMappedTypes]);

  useEffect(() => {
    if (!exportMenuOpen) return undefined;
    const onDocClick = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [exportMenuOpen]);

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

  const statusDomain = useMemo(() => {
    const set = new Set();
    enrichedAssets.forEach((a) => {
      if (a.asset_status) set.add(String(a.asset_status));
    });
    return Array.from(set).sort();
  }, [enrichedAssets]);

  const advancedFilteredAssets = useMemo(
    () => applyAdvancedFilters(enrichedAssets, advanced, AUDIT_REPORT_FIELD_ACCESSORS),
    [enrichedAssets, advanced],
  );

  const filteredAssets = useMemo(() => {
    const q = assetSearch.trim().toLowerCase();
    if (!q) return advancedFilteredAssets;
    return advancedFilteredAssets.filter((a) => {
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
  }, [advancedFilteredAssets, assetSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / PAGE_SIZE));
  const pagedAssets = filteredAssets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [advanced]);

  const summary = useMemo(() => {
    if (!report) return null;
    return [
      { label: 'Assets', value: filteredAssets.length },
      { label: 'Maintenance records', value: report.sections?.maintenance?.length || 0 },
      { label: 'Breakdowns', value: report.sections?.breakdown?.length || 0 },
      { label: 'Certifications', value: report.sections?.certifications?.length || 0 },
      { label: 'Invoices', value: report.sections?.invoices?.length || 0 },
      { label: 'Purchase orders', value: report.sections?.purchaseOrders?.length || 0 },
      { label: 'AMC / CMC / Warranty', value: report.sections?.coverage?.length || 0 },
    ];
  }, [report, filteredAssets.length]);

  const previewSummaryItems = useMemo(() => {
    if (!summary) return [];
    return summary.map((s) => ({ label: s.label, value: String(s.value ?? 0) }));
  }, [summary]);

  const filterSummary = useMemo(() => {
    const items = [];
    const auditType = auditTypes.find((t) => t.audtp_id === audtpId);
    items.push({
      label: 'Audit type',
      value: auditType?.description || audtpId || '—',
    });

    let periodLabel = report?.period?.label;
    if (!periodLabel) {
      if (period === 'current_year') periodLabel = `Current year (${CURRENT_YEAR})`;
      else if (period === 'last_year') periodLabel = `Last year (${CURRENT_YEAR - 1})`;
      else if (period === 'specific') periodLabel = `${dateFrom || '—'} → ${dateTo || '—'}`;
      else periodLabel = period;
    }
    items.push({ label: 'Period', value: periodLabel });

    const typeLabels = selectedAssetTypeChips.map((c) => c.label);
    items.push({
      label: 'Asset types',
      value: typeLabels.length ? typeLabels.join(', ') : '—',
    });

    if (assetSearch?.trim()) items.push({ label: 'Search', value: assetSearch.trim() });
    if (advanced?.length) {
      items.push({
        label: 'Advanced',
        value: `${advanced.length} condition${advanced.length === 1 ? '' : 's'}`,
      });
    }
    return items;
  }, [
    auditTypes,
    audtpId,
    report,
    period,
    dateFrom,
    dateTo,
    selectedAssetTypeChips,
    assetSearch,
    advanced,
  ]);

  const selectedFieldCount = useMemo(
    () => Object.values(fieldSelection).filter(Boolean).length,
    [fieldSelection],
  );

  const buildPdf = useAuditReportPdf({ report, enrichedAssets: filteredAssets, fieldSelection });

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

  const handleExport = useCallback(async (format) => {
    if (!report) {
      toast.error('View the report first');
      return;
    }
    try {
      setExportMenuOpen(false);
      setExporting(true);
      if (format === 'pdf') {
        await buildPdf();
        await recordActionByNameWithFetch('Export Report', {
          reportType: 'Audit Reports',
          action: 'Audit report PDF downloaded',
          audtp_id: report?.auditType?.audtp_id,
          format: 'pdf',
        }).catch(() => {});
        toast.success('PDF downloaded');
      } else {
        exportAuditReportExcel({
          report,
          assets: filteredAssets,
          columns,
          filterSummary,
          summaryItems: previewSummaryItems,
        });
        await recordActionByNameWithFetch('Export Report', {
          reportType: 'Audit Reports',
          action: 'Audit report Excel downloaded',
          audtp_id: report?.auditType?.audtp_id,
          format: 'xlsx',
        }).catch(() => {});
        toast.success('Excel downloaded');
      }
    } catch (err) {
      toast.error(err?.message || `Failed to export ${format === 'pdf' ? 'PDF' : 'Excel'}`);
    } finally {
      setExporting(false);
    }
  }, [
    report,
    buildPdf,
    filteredAssets,
    columns,
    filterSummary,
    previewSummaryItems,
    recordActionByNameWithFetch,
  ]);

  const openPreview = () => {
    if (!report) {
      toast.error('View the report first');
      return;
    }
    setPreviewOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-5">
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
          advanced={advanced}
          setAdvanced={setAdvanced}
          statusDomain={statusDomain}
          onPreview={openPreview}
          previewDisabled={!report || loadingView}
        />

        {!report && !loadingView && (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-8 py-16 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800">No report yet</h3>
          </section>
        )}

        {report && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {report.auditType?.description || 'Audit report'}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">{report.period?.label}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={openFieldsDrawer}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Fields
                  <span className="text-slate-400">({selectedFieldCount})</span>
                </button>
                <div className="relative" ref={exportMenuRef}>
                  <button
                    type="button"
                    onClick={() => setExportMenuOpen((v) => !v)}
                    disabled={exporting}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {exporting
                      ? needsDocPrep
                        ? 'Preparing…'
                        : 'Exporting…'
                      : 'Export'}
                    <ChevronDown className={`h-3 w-3 text-slate-400 transition ${exportMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {exportMenuOpen && !exporting && (
                    <div className="absolute right-0 z-30 mt-1.5 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => handleExport('xlsx')}
                        className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Excel (.xlsx)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExport('pdf')}
                        className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                      >
                        PDF (.pdf)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <SummaryStrip summary={summary} />
            <AuditCharts assets={filteredAssets} report={report} />
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

      <ReportPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Audit report preview"
        columns={columns}
        rows={filteredAssets}
        getCellValue={getAuditReportCellValue}
        filterSummary={filterSummary}
        summaryItems={previewSummaryItems}
        emptyLabel="No assets to preview — View the report first."
      />
    </div>
  );
}
