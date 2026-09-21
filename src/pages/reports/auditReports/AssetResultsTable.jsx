import React from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { PAGE_SIZE } from './constants';
import { formatDate, StatusPill } from './utils';
import AssetDetailTabs from './AssetDetailTabs';

export default function AssetResultsTable({
  report,
  filteredAssets,
  pagedAssets,
  assetSearch,
  setAssetSearch,
  page,
  setPage,
  totalPages,
  expandedAssetId,
  toggleExpand,
  activeTab,
  setActiveTab,
}) {
  return (
    <div className="px-6 py-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">Selected assets</h3>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            value={assetSearch}
            onChange={(e) => {
              setAssetSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search assets"
            className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#143d65]/40"
          />
        </div>
      </div>

      <div className="w-full max-w-full overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-10 px-3 py-3" />
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 w-[16%]">
                Asset
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 w-[14%]">
                Asset type
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 w-[16%]">
                Location
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 w-[12%]">
                Department
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 w-[10%]">
                Status
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 w-[10%]">
                Invoice
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 w-[12%]">
                Certification
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 w-[10%]">
                Last maintenance
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {pagedAssets.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                  No assets match your search.
                </td>
              </tr>
            ) : (
              pagedAssets.map((asset) => {
                const open = expandedAssetId === asset.asset_id;
                return (
                  <React.Fragment key={asset.asset_id}>
                    <tr
                      className={`cursor-pointer hover:bg-slate-50 ${open ? 'bg-slate-50' : ''}`}
                      onClick={() => toggleExpand(asset.asset_id)}
                    >
                      <td className="px-3 py-3 text-slate-400">
                        {open ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </td>
                      <td className="px-3 py-3 align-top min-w-0">
                        <div className="font-medium text-slate-900 break-words">
                          {asset.serial_number || asset.asset_id}
                        </div>
                        <div className="text-xs text-slate-500 break-words">{asset.asset_id}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-700 align-top break-words">
                        {asset.asset_type_name || '—'}
                      </td>
                      <td className="px-3 py-3 text-slate-700 align-top break-words">
                        {asset.branch_name || '—'}
                      </td>
                      <td className="px-3 py-3 text-slate-700 align-top break-words">
                        {asset.department_name || '—'}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <StatusPill value={asset.asset_status} />
                      </td>
                      <td className="px-3 py-3 text-slate-700 align-top break-words">
                        {asset.invoice_no || '—'}
                      </td>
                      <td className="px-3 py-3 text-slate-700 align-top break-words">
                        {asset.certification_summary}
                      </td>
                      <td className="px-3 py-3 text-slate-700 align-top break-words">
                        {formatDate(asset.last_maintenance)}
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={9} className="bg-slate-50/80 px-3 py-5 max-w-0">
                          <div className="min-w-0 max-w-full overflow-hidden">
                            <AssetDetailTabs
                              asset={asset}
                              report={report}
                              activeTab={activeTab}
                              setActiveTab={setActiveTab}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filteredAssets.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filteredAssets.length)} of {filteredAssets.length}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
