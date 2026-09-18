import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { ExternalLink, Loader2 } from 'lucide-react';
import API from '../../../lib/axios';
import { ASSET_TABS } from './constants';
import { formatDate, MiniTable, StatusPill } from './utils';

function fileLabelFromPath(path) {
  if (!path) return 'View document';
  const parts = String(path).split('/');
  return parts[parts.length - 1] || 'View document';
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

export default function AssetDetailTabs({ asset, report, activeTab, setActiveTab }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5">
      <div>
        <h4 className="text-lg font-semibold text-slate-900">
          {asset.asset_type_name || 'Asset'} {asset.serial_number || asset.asset_id}
        </h4>
        <p className="text-sm text-slate-500 mt-1">
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

      <div onClick={(e) => e.stopPropagation()}>
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
              <div key={label}>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {label}
                </div>
                <div className="mt-1 text-sm text-slate-800">
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
              { key: 'maintenance_type_name', label: 'Type' },
              { key: 'notes', label: 'Description' },
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
          <MiniTable
            emptyLabel="breakdown history"
            columns={[
              {
                key: 'breakdown_date',
                label: 'Date',
                render: (r) => formatDate(r.breakdown_date),
              },
              { key: 'breakdown_description', label: 'Issue' },
              { key: 'breakdown_reason', label: 'Reason' },
              {
                key: 'breakdown_status',
                label: 'Status',
                render: (r) => <StatusPill value={r.breakdown_status} />,
              },
              { key: 'reported_by_name', label: 'Reported by' },
              { key: 'decision_code', label: 'Decision' },
            ]}
            rows={asset.history.breakdown}
          />
        )}

        {activeTab === 'certifications' && (
          <MiniTable
            emptyLabel="certifications"
            columns={[
              { key: 'document_type', label: 'Certification' },
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
              { key: 'invoice_no', label: 'Invoice number' },
              { key: 'vendor_name', label: 'Vendor' },
              {
                key: 'purchased_on',
                label: 'Date',
                render: (r) => formatDate(r.purchased_on),
              },
              { key: 'purchased_cost', label: 'Amount' },
              { key: 'source', label: 'Source', render: (r) => {
                const map = { asset: 'Asset record', maintenance: 'Maintenance record', document: 'Document' };
                return map[String(r.source || '').toLowerCase()] || r.source || '—';
              }},
            ]}
            rows={asset.history.invoices}
          />
        )}

        {activeTab === 'purchaseOrders' && (
          <MiniTable
            emptyLabel="purchase orders"
            columns={[
              { key: 'po_number', label: 'Purchase order number' },
              { key: 'vendor_name', label: 'Vendor' },
              {
                key: 'po_date',
                label: 'Date',
                render: (r) => formatDate(r.po_date),
              },
              { key: 'source', label: 'Source', render: (r) => {
                const map = { asset: 'Asset record', maintenance: 'Maintenance record', document: 'Document' };
                return map[String(r.source || '').toLowerCase()] || r.source || '—';
              }},
            ]}
            rows={asset.history.purchaseOrders}
          />
        )}
      </div>
    </div>
  );
}
