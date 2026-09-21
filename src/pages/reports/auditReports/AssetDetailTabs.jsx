import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { ExternalLink, Loader2 } from 'lucide-react';
import API from '../../../lib/axios';
import { auditReportService } from '../../../services/auditReportService';
import { ASSET_TABS } from './constants';
import { EmptyHistory, formatDate, formatHours, MiniTable, StatusPill } from './utils';
import PmComplianceDialog from './PmComplianceDialog';
import CalibrationDetailDialog from './CalibrationDetailDialog';

function fileLabelFromPath(path) {
  if (!path) return 'View document';
  const parts = String(path).split('/');
  return parts[parts.length - 1] || 'View document';
}

function isPreventiveMaintenance(row) {
  if (!row) return false;
  if (String(row.maint_type_id || '').toUpperCase() === 'MT006') return true;
  return /prevent/i.test(String(row.maintenance_type_name || ''));
}

function isCalibrationMaintenance(row) {
  if (!row) return false;
  if (String(row.maint_type_id || '').toUpperCase() === 'MT017') return true;
  return /calibrat/i.test(String(row.maintenance_type_name || ''));
}

function DocumentLink({ docId, path, label }) {
  const [loading, setLoading] = useState(false);

  if (!docId) {
    return <span className="text-slate-400">—</span>;
  }

  const openDoc = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    try {
      setLoading(true);
      const res = await API.get(`/asset-docs/${docId}/download-url?mode=view`);
      if (res.data?.url) {
        window.open(res.data.url, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error('No URL returned');
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err.message ||
          'Document file is missing in storage',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={openDoc}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-[#143d65] hover:underline font-medium disabled:opacity-60"
      title={path || 'Open document'}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <ExternalLink className="w-3.5 h-3.5" />
      )}
      <span className="truncate max-w-[220px]">{label || fileLabelFromPath(path)}</span>
    </button>
  );
}

function repeatLabel(r) {
  if (!r.is_repeat_problem) return 'No';
  const parts = [];
  if (Number(r.reopen_count) > 0) parts.push(`${r.reopen_count} reopen`);
  if (Number(r.same_cause_count_in_period) > 1) {
    parts.push(`${r.same_cause_count_in_period}× same cause`);
  }
  return parts.join(' · ') || 'Yes';
}

function BreakdownHistory({ asset, rows }) {
  if (!rows?.length) return <EmptyHistory label="breakdown history" />;

  return (
    <div className="space-y-3 min-w-0">
      {rows.map((r, idx) => (
        <article
          key={r.abr_id || idx}
          className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 min-w-0"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 justify-between">
            <div className="text-sm font-medium text-slate-900">
              {formatDate(r.breakdown_date)}
            </div>
            <StatusPill value={r.breakdown_status} />
          </div>

          <p className="text-sm text-slate-700 break-words whitespace-normal">
            {r.breakdown_description || '—'}
          </p>

          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
            {[
              ['Cause', r.breakdown_reason || '—'],
              [
                'Affected dept',
                r.affected_department_name || asset.department_name || '—',
              ],
              ['Expected DT', formatHours(r.expected_downtime_hours)],
              ['Actual DT', formatHours(r.actual_downtime_hours)],
              ['Repeat', repeatLabel(r)],
              ['Reported by', r.reported_by_name || '—'],
              ['Decision', r.decision_code || '—'],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {label}
                </dt>
                <dd className="mt-0.5 text-sm text-slate-800 break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
    </div>
  );
}

export default function AssetDetailTabs({ asset, report, activeTab, setActiveTab }) {
  const [pmOpen, setPmOpen] = useState(false);
  const [pmLoading, setPmLoading] = useState(false);
  const [pmData, setPmData] = useState(null);
  const [pmError, setPmError] = useState('');

  const [calOpen, setCalOpen] = useState(false);
  const [calLoading, setCalLoading] = useState(false);
  const [calData, setCalData] = useState(null);
  const [calError, setCalError] = useState('');

  const openPmCompliance = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setPmOpen(true);
    setPmLoading(true);
    setPmError('');
    setPmData(null);
    try {
      const data = await auditReportService.getPmCompliance({
        audtp_id: report?.auditType?.audtp_id,
        period: report?.period?.type || 'current_year',
        date_from: report?.period?.from,
        date_to: report?.period?.to,
        asset_type_ids: report?.assetTypeIds || [],
      });
      setPmData(data);
    } catch (err) {
      setPmError(
        err?.response?.data?.error ||
          err?.message ||
          'Failed to load preventive maintenance compliance',
      );
    } finally {
      setPmLoading(false);
    }
  };

  const openCalibrationDetail = async (e, row) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!row?.ams_id) {
      toast.error('Calibration work order id is missing');
      return;
    }
    setCalOpen(true);
    setCalLoading(true);
    setCalError('');
    setCalData(null);
    try {
      const data = await auditReportService.getCalibrationDetail({
        ams_id: row.ams_id,
      });
      setCalData(data);
    } catch (err) {
      setCalError(
        err?.response?.data?.error ||
          err?.message ||
          'Failed to load calibration detail',
      );
    } finally {
      setCalLoading(false);
    }
  };

  return (
    <>
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5 min-w-0 max-w-full overflow-hidden">
      <div className="min-w-0">
        <h4 className="text-lg font-semibold text-slate-900 break-words">
          {asset.asset_type_name || 'Asset'} {asset.serial_number || asset.asset_id}
        </h4>
        <p className="text-sm text-slate-500 mt-1 break-words">
          <StatusPill value={asset.asset_status} />
          <span className="mx-2 text-slate-300">·</span>
          {asset.branch_name || 'No location'}
          <span className="mx-2 text-slate-300">·</span>
          {report.auditType?.description}
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {ASSET_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab(tab.id);
            }}
            className={`px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-[#143d65] text-[#143d65]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-w-0" onClick={(e) => e.stopPropagation()}>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
            {[
              ['Asset ID', asset.asset_id],
              ['Asset type', asset.asset_type_name],
              ['Location', asset.branch_name],
              ['Department', asset.department_name],
              ['Serial number', asset.serial_number],
              ['Status', asset.asset_status],
              ['Purchase date', formatDate(asset.purchased_on)],
              ['Purchase cost', asset.purchased_cost],
              ['Invoice no.', asset.invoice_no],
              ['Purchase vendor', asset.purchase_vendor_name],
              ['Service vendor', asset.service_vendor_name],
              ['Description', asset.asset_description],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {label}
                </div>
                <div className="mt-1 text-sm text-slate-800 break-words">
                  {value == null || value === '' ? '—' : String(value)}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'maintenance' && (
          <MiniTable
            emptyLabel="maintenance history"
            columns={[
              {
                key: 'act_maint_st_date',
                label: 'Date',
                render: (r) => formatDate(r.act_maint_st_date),
              },
              {
                key: 'maintenance_type_name',
                label: 'Type',
                wrap: true,
                render: (r) => {
                  const label = r.maintenance_type_name || '—';
                  if (isPreventiveMaintenance(r)) {
                    return (
                      <button
                        type="button"
                        onClick={openPmCompliance}
                        className="text-left text-[#143d65] font-medium hover:underline"
                        title="View preventive maintenance compliance"
                      >
                        {label}
                      </button>
                    );
                  }
                  if (isCalibrationMaintenance(r)) {
                    return (
                      <button
                        type="button"
                        onClick={(e) => openCalibrationDetail(e, r)}
                        className="text-left text-[#143d65] font-medium hover:underline"
                        title="View calibration checklist and certificate"
                      >
                        {label}
                      </button>
                    );
                  }
                  return label;
                },
              },
              { key: 'notes', label: 'Description', wrap: true },
              {
                key: 'vendor_name',
                label: 'Technician / vendor',
                render: (r) => r.technician_name || r.vendor_name || '—',
              },
              { key: 'wo_id', label: 'Work order' },
              {
                key: 'status',
                label: 'Status',
                render: (r) => <StatusPill value={r.status} />,
              },
            ]}
            rows={asset.history.maintenance}
          />
        )}

        {activeTab === 'breakdowns' && (
          <BreakdownHistory asset={asset} rows={asset.history.breakdown} />
        )}

        {activeTab === 'certifications' && (
          <MiniTable
            emptyLabel="certifications"
            columns={[
              { key: 'document_type', label: 'Certification', wrap: true },
              {
                key: 'doc_path',
                label: 'Document',
                render: (r) => (
                  <DocumentLink
                    docId={r.a_d_id}
                    path={r.doc_path}
                    label={r.document_type ? `View ${r.document_type}` : 'View document'}
                  />
                ),
              },
            ]}
            rows={asset.history.certifications}
          />
        )}

        {activeTab === 'invoices' && (
          <MiniTable
            emptyLabel="invoices"
            columns={[
              { key: 'invoice_no', label: 'Invoice number', wrap: true },
              { key: 'vendor_name', label: 'Vendor', wrap: true },
              {
                key: 'purchased_on',
                label: 'Date',
                render: (r) => formatDate(r.purchased_on),
              },
              { key: 'purchased_cost', label: 'Amount' },
              {
                key: 'source',
                label: 'Source',
                render: (r) => {
                  const map = {
                    asset: 'Asset record',
                    maintenance: 'Maintenance record',
                    document: 'Document',
                  };
                  return map[String(r.source || '').toLowerCase()] || r.source || '—';
                },
              },
            ]}
            rows={asset.history.invoices}
          />
        )}

        {activeTab === 'purchaseOrders' && (
          <MiniTable
            emptyLabel="purchase orders"
            columns={[
              { key: 'po_number', label: 'PO number', wrap: true },
              { key: 'vendor_name', label: 'Vendor', wrap: true },
              {
                key: 'po_date',
                label: 'Date',
                render: (r) => formatDate(r.po_date),
              },
              {
                key: 'source',
                label: 'Source',
                render: (r) => {
                  const map = {
                    asset: 'Asset record',
                    maintenance: 'Maintenance record',
                    document: 'Document',
                  };
                  return map[String(r.source || '').toLowerCase()] || r.source || '—';
                },
              },
            ]}
            rows={asset.history.purchaseOrders}
          />
        )}
      </div>
    </div>
    <PmComplianceDialog
      open={pmOpen}
      loading={pmLoading}
      data={pmData}
      error={pmError}
      onClose={() => setPmOpen(false)}
    />
    <CalibrationDetailDialog
      open={calOpen}
      loading={calLoading}
      data={calData}
      error={calError}
      onClose={() => setCalOpen(false)}
    />
    </>
  );
}
