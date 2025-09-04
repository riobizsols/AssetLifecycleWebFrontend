import React, { useState } from 'react';
import { Download, FileText, BarChart3, Filter, Calendar, User, Building2 } from 'lucide-react';

/**
 * Comprehensive Report Display Component
 * Shows the generated report with header, filters, summary, and detailed data
 */
export default function ReportDisplay({ reportData, onClose }) {
  const [activeTab, setActiveTab] = useState('summary');

  if (!reportData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold mb-4">No Report Data</h3>
          <p className="text-gray-600 mb-4">No report data available to display.</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const { header, filters, summary, data } = reportData;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#143d65] to-[#1e5a8a] text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">{header.title}</h2>
              <p className="text-blue-100">{header.description}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
          
          {/* Report Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
            <div className="flex items-center">
              <Building2 className="w-4 h-4 mr-2" />
              <span>Org ID: {header.organization.id}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{header.generationInfo.date}</span>
            </div>
            <div className="flex items-center">
              <User className="w-4 h-4 mr-2" />
              <span>{header.generatedBy.name}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'summary', label: 'Summary', icon: BarChart3 },
              { id: 'filters', label: 'Applied Filters', icon: Filter },
              { id: 'data', label: 'Detailed Data', icon: FileText }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-[#143d65] text-[#143d65]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'summary' && <SummaryTab summary={summary} header={header} />}
          {activeTab === 'filters' && <FiltersTab filters={filters} />}
          {activeTab === 'data' && <DataTab data={data} />}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Total Records: {header.generationInfo.totalRecords} | 
              Generated: {header.generationInfo.date}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Summary Tab Component
 */
function SummaryTab({ summary, header }) {
  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg">
          <div className="flex items-center">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-600">Total Records</p>
              <p className="text-2xl font-bold text-blue-900">{summary.totalRecords}</p>
            </div>
          </div>
        </div>

        {summary.statistics.totalValue && (
          <div className="bg-green-50 p-6 rounded-lg">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-green-600">Total Value</p>
                <p className="text-2xl font-bold text-green-900">
                  ${summary.statistics.totalValue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {summary.statistics.averageValue && (
          <div className="bg-purple-50 p-6 rounded-lg">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-600">Average Value</p>
                <p className="text-2xl font-bold text-purple-900">
                  ${summary.statistics.averageValue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Statistics Breakdown */}
      {summary.statistics.statusBreakdown && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Status Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(summary.statistics.statusBreakdown).map(([status, count]) => (
              <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-600">{status}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.statistics.departmentBreakdown && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Department Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(summary.statistics.departmentBreakdown).map(([dept, count]) => (
              <div key={dept} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-600">{dept}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.statistics.valuationBreakdown && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Valuation Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-900">
                ${summary.statistics.valuationBreakdown.inUse.toLocaleString()}
              </p>
              <p className="text-sm text-green-600">In Use</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-900">
                ${summary.statistics.valuationBreakdown.scrap.toLocaleString()}
              </p>
              <p className="text-sm text-red-600">Scrap</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-900">
                ${summary.statistics.valuationBreakdown.total.toLocaleString()}
              </p>
              <p className="text-sm text-blue-600">Total</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-900">
                ${summary.statistics.valuationBreakdown.average.toLocaleString()}
              </p>
              <p className="text-sm text-purple-600">Average</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Filters Tab Component
 */
function FiltersTab({ filters }) {
  return (
    <div className="space-y-6">
      {!filters.hasFilters ? (
        <div className="text-center py-12">
          <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Filters Applied</h3>
          <p className="text-gray-600">This report shows all available data without any filters.</p>
        </div>
      ) : (
        <>
          {/* Quick Filters */}
          {filters.quickFilters.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Filters Applied</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filters.quickFilters.map((filter, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{filter.field}</p>
                        <p className="text-sm text-gray-600">{filter.value}</p>
                      </div>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {filter.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Advanced Conditions */}
          {filters.advancedConditions.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Advanced Conditions Applied</h3>
              <div className="space-y-3">
                {filters.advancedConditions.map((condition) => (
                  <div key={condition.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{condition.field}</p>
                        <p className="text-sm text-gray-600">
                          {condition.operator} {condition.value}
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Advanced
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <Filter className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-blue-800 font-medium">
                Total Filters Applied: {filters.totalFilters}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Data Tab Component
 */
function DataTab({ data }) {
  if (!data.rows || data.rows.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-600">No records match the applied filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Detailed Data ({data.totalRows} records)</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              {data.headers.map((header) => (
                <th
                  key={header.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200"
                >
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.rows.map((row, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {data.headers.map((header) => (
                  <td
                    key={header.key}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {row[header.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


