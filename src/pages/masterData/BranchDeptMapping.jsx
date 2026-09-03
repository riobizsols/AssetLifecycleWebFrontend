import { showBackendTextToast } from '../../utils/errorTranslation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X, Search, Filter } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../lib/axios';
import { useNavigation } from '../../hooks/useNavigation';
import { useLanguage } from '../../contexts/LanguageContext';

const BranchDeptMapping = () => {
  const { t } = useLanguage();
  const { hasEditAccess } = useNavigation();
  const canEdit = hasEditAccess('BRANCHDEPTMAPPING');

  const [mappings, setMappings] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [branchId, setBranchId] = useState('');
  const [deptId, setDeptId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const loadMappings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/branch-dept-mappings');
      setMappings(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error(err);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_FAILED_TO_LOAD_BRANCH_DEPT_MAPPINGS',
        fallbackText: t('branchDeptMapping.failedToLoad', { defaultValue: 'Failed to load branch-department mappings' }),
        type: 'error',
      });
      setMappings([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadLookups = useCallback(async () => {
    try {
      const [branchRes, deptRes] = await Promise.all([
        API.get('/branches'),
        API.get('/departments'),
      ]);
      const branchList = Array.isArray(branchRes.data)
        ? branchRes.data
        : Array.isArray(branchRes.data?.data)
          ? branchRes.data.data
          : [];
      const deptList = Array.isArray(deptRes.data)
        ? deptRes.data
        : Array.isArray(deptRes.data?.data)
          ? deptRes.data.data
          : [];
      setBranches(branchList.filter((b) => b.int_status !== 0 && b.int_status !== false));
      setDepartments(deptList.filter((d) => d.int_status !== 0 && d.int_status !== false));
    } catch (err) {
      console.error(err);
      setBranches([]);
      setDepartments([]);
    }
  }, []);

  useEffect(() => {
    loadMappings();
    loadLookups();
  }, [loadMappings, loadLookups]);

  const selectedBranch = useMemo(
    () => branches.find((b) => b.branch_id === branchId) || null,
    [branches, branchId]
  );

  const departmentsForBranch = useMemo(() => {
    if (!selectedBranch) return departments;
    return departments.filter((d) => !d.org_id || d.org_id === selectedBranch.org_id);
  }, [departments, selectedBranch]);

  const filteredMappings = useMemo(() => {
    if (!searchTerm.trim()) return mappings;
    const q = searchTerm.toLowerCase();
    return mappings.filter((m) =>
      [m.branch_id, m.branch_name, m.dept_id, m.dept_name, m.org_id, m.org_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [mappings, searchTerm]);

  const resetCreateForm = () => {
    setBranchId('');
    setDeptId('');
    setShowCreate(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!branchId || !deptId) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_BRANCH_AND_DEPT_REQUIRED',
        fallbackText: t('branchDeptMapping.branchAndDeptRequired', {
          defaultValue: 'Branch and department are required',
        }),
        type: 'error',
      });
      return;
    }

    setSaving(true);
    try {
      await API.post('/branch-dept-mappings', { branch_id: branchId, dept_id: deptId });
      showBackendTextToast({
        toast,
        tmdId: 'TMD_BRANCH_DEPT_MAPPING_SAVED',
        fallbackText: t('branchDeptMapping.saved', { defaultValue: 'Mapping saved successfully' }),
        type: 'success',
      });
      resetCreateForm();
      await loadMappings();
    } catch (err) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_FAILED_TO_SAVE_BRANCH_DEPT_MAPPING',
        fallbackText:
          err.response?.data?.message ||
          t('branchDeptMapping.failedToSave', { defaultValue: 'Failed to save mapping' }),
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!canEdit) return;
    const ok = window.confirm(
      t('branchDeptMapping.confirmDelete', {
        defaultValue: 'Remove mapping between {{branch}} and {{dept}}?',
        branch: row.branch_name || row.branch_id,
        dept: row.dept_name || row.dept_id,
      })
    );
    if (!ok) return;

    try {
      await API.delete('/branch-dept-mappings', {
        params: { branch_id: row.branch_id, dept_id: row.dept_id },
      });
      showBackendTextToast({
        toast,
        tmdId: 'TMD_BRANCH_DEPT_MAPPING_REMOVED',
        fallbackText: t('branchDeptMapping.removed', { defaultValue: 'Mapping removed' }),
        type: 'success',
      });
      await loadMappings();
    } catch (err) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_FAILED_TO_REMOVE_BRANCH_DEPT_MAPPING',
        fallbackText:
          err.response?.data?.message ||
          t('branchDeptMapping.failedToRemove', { defaultValue: 'Failed to remove mapping' }),
        type: 'error',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0E2F4B]">
            {t('branchDeptMapping.title', { defaultValue: 'Branch – Department Mapping' })}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {t('branchDeptMapping.subtitle', {
              defaultValue: 'Map departments to branches. A department can belong to multiple branches.',
            })}
          </p>
        </div>

        <div className="mb-6 flex justify-between items-center gap-3">
          <div className="flex gap-3 items-center relative">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`w-10 h-10 ${searchTerm ? 'bg-yellow-500' : 'bg-[#0E2F4B]'} text-white rounded flex items-center justify-center hover:opacity-90`}
              title="Filter"
            >
              <Filter size={20} />
            </button>
            {showFilters && (
              <div className="absolute left-0 top-12 z-40 bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-[300px]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700">Search</h3>
                  <button type="button" onClick={() => setShowFilters(false)} className="text-gray-500">
                    <X size={18} />
                  </button>
                </div>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Branch, department, org..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
                    autoFocus
                  />
                </div>
              </div>
            )}
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="w-10 h-10 bg-[#0E2F4B] text-white rounded flex items-center justify-center hover:bg-[#143d65]"
              title={t('branchDeptMapping.addMapping', { defaultValue: 'Add mapping' })}
            >
              <Plus size={20} />
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-gray-500">
              {t('common.loading', { defaultValue: 'Loading...' })}
            </div>
          ) : filteredMappings.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              {t('branchDeptMapping.noMappings', { defaultValue: 'No branch-department mappings found' })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Org</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Branch</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
                    {canEdit && (
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMappings.map((row) => (
                    <tr key={`${row.branch_id}__${row.dept_id}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-800">
                        <div className="font-medium">{row.org_name || row.org_id || '—'}</div>
                        <div className="text-xs text-gray-500">{row.org_id}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        <div className="font-medium">{row.branch_name || row.branch_id}</div>
                        <div className="text-xs text-gray-500">{row.branch_id}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        <div className="font-medium">{row.dept_name || row.dept_id}</div>
                        <div className="text-xs text-gray-500">{row.dept_id}</div>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(row)}
                            className="inline-flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Remove"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) resetCreateForm();
          }}
        >
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full">
            <div className="bg-gradient-to-r from-[#0E2F4B] to-[#1a4d7a] text-white py-4 px-6 border-b-4 border-[#FFC107] flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {t('branchDeptMapping.addMapping', { defaultValue: 'Add Branch – Department Mapping' })}
              </h2>
              <button type="button" onClick={resetCreateForm} className="text-white/80 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch <span className="text-red-500">*</span>
                </label>
                <select
                  value={branchId}
                  onChange={(e) => {
                    setBranchId(e.target.value);
                    setDeptId('');
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
                  required
                >
                  <option value="">-- Select Branch --</option>
                  {branches.map((b) => (
                    <option key={b.branch_id} value={b.branch_id}>
                      {b.text || b.branch_name || b.branch_id}
                      {b.org_id ? ` (${b.org_id})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  value={deptId}
                  onChange={(e) => setDeptId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
                  required
                  disabled={!branchId}
                >
                  <option value="">-- Select Department --</option>
                  {departmentsForBranch.map((d) => (
                    <option key={d.dept_id} value={d.dept_id}>
                      {d.text || d.dept_name || d.dept_id}
                      {d.org_id ? ` (${d.org_id})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetCreateForm}
                  className="px-5 py-2.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  {t('common.cancel', { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#0E2F4B] text-white rounded-md hover:bg-[#143d65] disabled:opacity-50"
                >
                  {saving
                    ? t('common.saving', { defaultValue: 'Saving...' })
                    : t('common.save', { defaultValue: 'Save' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchDeptMapping;
