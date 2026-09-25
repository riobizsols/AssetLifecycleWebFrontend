import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import ReportLayout from '../../components/reportModels/ReportLayout';
import { useReportState } from '../../components/reportModels/useReportState';
import { REPORTS } from '../../components/reportModels/ReportConfig';
import { sparePartsReportService } from '../../services/sparePartsReportService';
import { useAuditLog } from '../../hooks/useAuditLog';
import { REPORTS_APP_IDS } from '../../constants/reportsAuditEvents';
import { useLanguage } from '../../contexts/LanguageContext';
import { showBackendTextToast } from '../../utils/errorTranslation';

function applyClientAdvanced(rows, advanced) {
  const conditions = (advanced || []).filter(
    (c) => c.field && c.val != null && String(c.val).trim() !== '',
  );
  if (!conditions.length) return rows;

  return rows.filter((row) =>
    conditions.every((c) => {
      const map = {
        partCode: row['Part Code'],
        invoiceNumber: row['Invoice Number'],
        vendor: row.Vendor,
        onHand: row['On Hand'],
      };
      const leftRaw = map[c.field] ?? row[c.field] ?? '';
      const right = String(c.val).trim().toLowerCase();
      const left = String(leftRaw ?? '').toLowerCase();
      const leftNum = Number(leftRaw);
      const rightNum = Number(c.val);
      switch (c.op) {
        case 'contains':
          return left.includes(right);
        case 'starts with':
          return left.startsWith(right);
        case 'ends with':
          return left.endsWith(right);
        case '!=':
          return left !== right;
        case '>=':
          return Number.isFinite(leftNum) && Number.isFinite(rightNum) && leftNum >= rightNum;
        case '<=':
          return Number.isFinite(leftNum) && Number.isFinite(rightNum) && leftNum <= rightNum;
        case '=':
        default:
          return left === right;
      }
    }),
  );
}

export default function SparePartsReport() {
  const { t } = useLanguage();
  const selectedReportId = 'spare-parts-report';
  const report = useMemo(
    () => REPORTS.find((r) => r.id === selectedReportId),
    [],
  );
  const { recordActionByNameWithFetch } = useAuditLog(
    REPORTS_APP_IDS.SPARE_PARTS_REPORT || 'SPAREPARTMGMT',
  );

  const [reportConfig, setReportConfig] = useState(report);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const {
    quick,
    setQuick,
    advanced,
    setAdvanced,
    columns,
    setColumns,
    views,
    setViews,
    setQuickField,
  } = useReportState(selectedReportId, reportConfig || report);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await sparePartsReportService.getFilterOptions();
        if (cancelled || !response?.success) return;
        const data = response.data || {};
        const next = structuredClone(report);
        next.quickFields = (next.quickFields || []).map((field) => {
          if (field.key === 'category') {
            return {
              ...field,
              domain: (data.categories || []).map((c) => ({
                value: c.id,
                label: c.label || c.id,
              })),
            };
          }
          if (field.key === 'brand') {
            return {
              ...field,
              domain: (data.brands || []).map((b) => ({
                value: b.id,
                label: b.label || b.id,
              })),
            };
          }
          if (field.key === 'currentStatus') {
            return {
              ...field,
              domain: (data.statuses || []).map((s) => s.label || s.id),
            };
          }
          return field;
        });
        setReportConfig(next);
      } catch (err) {
        showBackendTextToast({
          toast,
          fallbackText: 'Failed to load spare parts filter options',
          type: 'error',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [report]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response = await sparePartsReportService.getReport(quick || {});
        if (cancelled) return;
        setRows(response?.data?.rows || []);
      } catch (err) {
        if (!cancelled) {
          showBackendTextToast({
            toast,
            fallbackText: 'Failed to load spare parts report',
            type: 'error',
          });
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quick]);

  const filteredRows = useMemo(
    () => applyClientAdvanced(rows, advanced),
    [rows, advanced],
  );

  const handleGenerateReport = async () => {
    await recordActionByNameWithFetch(t('reports.auditActions.generateReport'), {
      reportType: 'Spare Parts Report',
      action: t('reports.auditActions.reportGenerated'),
    }).catch(() => {});
  };

  const handleExportReport = async (exportType = 'pdf') => {
    await recordActionByNameWithFetch(t('reports.auditActions.exportReport'), {
      reportType: 'Spare Parts Report',
      exportFormat: exportType,
      action: t('reports.auditActions.reportExported', {
        format: String(exportType).toUpperCase(),
      }),
    }).catch(() => {});
  };

  return (
    <ReportLayout
      report={reportConfig || report}
      selectedReportId={selectedReportId}
      allRows={rows}
      filteredRows={filteredRows}
      quick={quick}
      setQuick={setQuick}
      setQuickField={setQuickField}
      advanced={advanced}
      setAdvanced={setAdvanced}
      columns={columns}
      setColumns={setColumns}
      views={views}
      setViews={setViews}
      apiData={{ loading }}
      onGenerateReport={handleGenerateReport}
      onExportReport={handleExportReport}
    />
  );
}
