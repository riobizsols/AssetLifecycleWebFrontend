import React, { useState, useEffect } from 'react';
import API from '../lib/axios';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../contexts/LanguageContext';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

const MaintenanceDetails = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('steps'); // steps, sequences, jobRoles

  // Workflow Steps
  const [workflowSteps, setWorkflowSteps] = useState([]);
  const [newStepName, setNewStepName] = useState('');
  const [editingStep, setEditingStep] = useState(null);
  const [editingStepName, setEditingStepName] = useState('');
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [showAddStepModal, setShowAddStepModal] = useState(false);
  const [stepNameInput, setStepNameInput] = useState('');

  // Asset Types
  const [assetTypes, setAssetTypes] = useState([]);
  const [selectedAssetType, setSelectedAssetType] = useState('');

  // Sequences
  const [sequences, setSequences] = useState([]);
  const [loadingSequences, setLoadingSequences] = useState(false);
  const [newSequence, setNewSequence] = useState({
    wf_steps_id: '',
    seqs_no: ''
  });

  // Job Roles
  const [jobRoles, setJobRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedStepForJobRole, setSelectedStepForJobRole] = useState('');
  const [jobRolesForStep, setJobRolesForStep] = useState([]);
  const [loadingJobRoles, setLoadingJobRoles] = useState(false);
  const [newJobRole, setNewJobRole] = useState({
    job_role_id: '',
    dept_id: ''
  });

  // Fetch workflow steps
  const fetchWorkflowSteps = async () => {
    setLoadingSteps(true);
    try {
      const res = await API.get('/maintenance-details/workflow-steps');
      setWorkflowSteps(res.data.data || []);
    } catch (error) {
      console.error('Error fetching workflow steps:', error);
      toast.error('Failed to fetch workflow steps');
    } finally {
      setLoadingSteps(false);
    }
  };

  // Fetch asset types
  const fetchAssetTypes = async () => {
    try {
      const res = await API.get('/asset-types');
      setAssetTypes(res.data || []);
    } catch (error) {
      console.error('Error fetching asset types:', error);
      toast.error('Failed to fetch asset types');
    }
  };

  // Fetch job roles
  const fetchJobRoles = async () => {
    try {
      const res = await API.get('/job-roles');
      setJobRoles(res.data.roles || []);
    } catch (error) {
      console.error('Error fetching job roles:', error);
      toast.error('Failed to fetch job roles');
    }
  };

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const res = await API.get('/departments');
      setDepartments(res.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to fetch departments');
    }
  };


  // Fetch sequences for asset type
  const fetchSequences = async () => {
    if (!selectedAssetType) {
      setSequences([]);
      return;
    }
    setLoadingSequences(true);
    try {
      const res = await API.get(`/maintenance-details/workflow-sequences/${selectedAssetType}`);
      setSequences(res.data.data || []);
    } catch (error) {
      console.error('Error fetching sequences:', error);
      toast.error('Failed to fetch sequences');
    } finally {
      setLoadingSequences(false);
    }
  };

  // Fetch job roles for workflow step
  const fetchJobRolesForStep = async (wf_steps_id) => {
    if (!wf_steps_id) {
      setJobRolesForStep([]);
      return;
    }
    setLoadingJobRoles(true);
    try {
      const res = await API.get(`/maintenance-details/workflow-job-roles/${wf_steps_id}`);
      setJobRolesForStep(res.data.data || []);
    } catch (error) {
      console.error('Error fetching job roles for step:', error);
      toast.error('Failed to fetch job roles');
    } finally {
      setLoadingJobRoles(false);
    }
  };

  useEffect(() => {
    fetchWorkflowSteps();
    fetchAssetTypes();
    fetchJobRoles();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (activeTab === 'sequences') {
      fetchSequences();
    }
  }, [selectedAssetType, activeTab]);

  useEffect(() => {
    if (activeTab === 'jobRoles') {
      fetchJobRolesForStep(selectedStepForJobRole);
    }
  }, [selectedStepForJobRole, activeTab]);

  // Create workflow step
  const handleCreateStep = async (e) => {
    e.preventDefault();
    if (!newStepName.trim()) {
      toast.error('Step name is required');
      return;
    }

    try {
      const res = await API.post('/maintenance-details/workflow-steps', {
        text: newStepName.trim()
      });
      toast.success('Workflow step created successfully');
      setNewStepName('');
      fetchWorkflowSteps();
    } catch (error) {
      console.error('Error creating workflow step:', error);
      toast.error(error.response?.data?.error || 'Failed to create workflow step');
    }
  };

  // Create workflow step from modal
  const handleCreateStepFromModal = async () => {
    if (!stepNameInput.trim()) {
      toast.error('Step name is required');
      return;
    }

    try {
      await API.post('/maintenance-details/workflow-steps', {
        text: stepNameInput.trim()
      });
      toast.success('Workflow step created successfully');
      setStepNameInput('');
      setShowAddStepModal(false);
      fetchWorkflowSteps();
    } catch (error) {
      console.error('Error creating workflow step:', error);
      toast.error(error.response?.data?.error || 'Failed to create workflow step');
    }
  };

  // Start editing step
  const handleStartEditStep = (step) => {
    setEditingStep(step.wf_steps_id);
    setEditingStepName(step.text);
  };

  // Cancel editing step
  const handleCancelEditStep = () => {
    setEditingStep(null);
    setEditingStepName('');
  };

  // Update workflow step
  const handleUpdateStep = async (id) => {
    if (!editingStepName.trim()) {
      toast.error('Step name is required');
      return;
    }

    try {
      await API.put(`/maintenance-details/workflow-steps/${id}`, {
        text: editingStepName.trim()
      });
      toast.success('Workflow step updated successfully');
      setEditingStep(null);
      setEditingStepName('');
      fetchWorkflowSteps();
    } catch (error) {
      console.error('Error updating workflow step:', error);
      toast.error(error.response?.data?.error || 'Failed to update workflow step');
    }
  };

  // Delete workflow step
  const handleDeleteStep = async (id) => {
    if (!window.confirm('Are you sure you want to delete this workflow step? This will also delete all related sequences and job role assignments.')) {
      return;
    }

    try {
      await API.delete(`/maintenance-details/workflow-steps/${id}`);
      toast.success('Workflow step deleted successfully');
      fetchWorkflowSteps();
      if (selectedStepForJobRole === id) {
        setSelectedStepForJobRole('');
      }
    } catch (error) {
      console.error('Error deleting workflow step:', error);
      toast.error(error.response?.data?.error || 'Failed to delete workflow step');
    }
  };

  // Create sequence
  const handleCreateSequence = async (e) => {
    e.preventDefault();
    if (!selectedAssetType) {
      toast.error('Please select an asset type');
      return;
    }
    if (!newSequence.wf_steps_id) {
      toast.error('Please select a workflow step');
      return;
    }
    if (!newSequence.seqs_no || parseInt(newSequence.seqs_no) % 5 !== 0) {
      toast.error('Sequence number must be a multiple of 5 (e.g., 5, 10, 15, 20)');
      return;
    }

    try {
      await API.post('/maintenance-details/workflow-sequences', {
        asset_type_id: selectedAssetType,
        wf_steps_id: newSequence.wf_steps_id,
        seqs_no: newSequence.seqs_no
      });
      toast.success('Sequence created successfully');
      setNewSequence({ wf_steps_id: '', seqs_no: '' });
      fetchSequences();
    } catch (error) {
      console.error('Error creating sequence:', error);
      toast.error(error.response?.data?.error || 'Failed to create sequence');
    }
  };

  // Delete sequence
  const handleDeleteSequence = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sequence?')) {
      return;
    }

    try {
      await API.delete(`/maintenance-details/workflow-sequences/${id}`);
      toast.success('Sequence deleted successfully');
      fetchSequences();
    } catch (error) {
      console.error('Error deleting sequence:', error);
      toast.error(error.response?.data?.error || 'Failed to delete sequence');
    }
  };

  // Create job role assignment
  const handleCreateJobRole = async (e) => {
    e.preventDefault();
    if (!selectedStepForJobRole) {
      toast.error('Please select a workflow step');
      return;
    }
    if (!newJobRole.job_role_id) {
      toast.error('Please select a job role');
      return;
    }
    if (!newJobRole.dept_id) {
      toast.error('Please select a department');
      return;
    }

    try {
      await API.post('/maintenance-details/workflow-job-roles', {
        wf_steps_id: selectedStepForJobRole,
        job_role_id: newJobRole.job_role_id,
        dept_id: newJobRole.dept_id
      });
      toast.success('Job role assigned successfully');
      setNewJobRole({ job_role_id: '', dept_id: '' });
      fetchJobRolesForStep(selectedStepForJobRole);
    } catch (error) {
      console.error('Error assigning job role:', error);
      toast.error(error.response?.data?.error || 'Failed to assign job role');
    }
  };

  // Delete job role assignment
  const handleDeleteJobRole = async (id) => {
    if (!window.confirm('Are you sure you want to remove this job role assignment?')) {
      return;
    }

    try {
      await API.delete(`/maintenance-details/workflow-job-roles/${id}`);
      toast.success('Job role removed successfully');
      fetchJobRolesForStep(selectedStepForJobRole);
    } catch (error) {
      console.error('Error removing job role:', error);
      toast.error(error.response?.data?.error || 'Failed to remove job role');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Maintenance Details</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            Configure workflow steps, sequences, and job role assignments for maintenance approvals
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex flex-wrap -mb-px" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('steps')}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'steps'
                    ? 'border-[#0E2F4B] text-[#0E2F4B]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Workflow Steps
              </button>
              <button
                onClick={() => setActiveTab('sequences')}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'sequences'
                    ? 'border-[#0E2F4B] text-[#0E2F4B]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Asset Type Sequences
              </button>
              <button
                onClick={() => setActiveTab('jobRoles')}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'jobRoles'
                    ? 'border-[#0E2F4B] text-[#0E2F4B]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Job Role Assignments
              </button>
            </nav>
          </div>
        </div>

        {/* Workflow Steps Tab */}
        {activeTab === 'steps' && (
          <>
            <div className="flex items-center justify-end mb-4">
              <button
                onClick={() => {
                  setStepNameInput('');
                  setShowAddStepModal(true);
                }}
                className="flex items-center justify-center text-white border border-gray-300 rounded px-3 py-2 hover:bg-[#143d65] bg-[#0E2F4B]"
                title="Add Workflow Step"
              >
                <Plus size={18} />
              </button>
            </div>
            <div>

              {/* Add Step Modal */}
              {showAddStepModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAddStepModal(false)}>
                  <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-[#0E2F4B] text-white py-4 px-6 rounded-t-lg border-b-4 border-[#FFC107]">
                      <h2 className="text-xl font-semibold">Add Workflow Step</h2>
                    </div>
                    <div className="p-6">
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Step Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={stepNameInput}
                          onChange={(e) => setStepNameInput(e.target.value)}
                          placeholder="Enter workflow step name (e.g., Initial Approval, Final Approval)"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCreateStepFromModal();
                            } else if (e.key === 'Escape') {
                              setShowAddStepModal(false);
                            }
                          }}
                        />
                      </div>
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => {
                            setShowAddStepModal(false);
                            setStepNameInput('');
                          }}
                          className="px-6 py-2.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreateStepFromModal}
                          className="px-6 py-2.5 bg-[#0E2F4B] text-white rounded-md hover:bg-[#143d65] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0E2F4B] transition-colors"
                        >
                          Add Step
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Table */}
              {loadingSteps ? (
                <div className="text-center py-16">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0E2F4B]"></div>
                  <p className="mt-4 text-gray-600">Loading...</p>
                </div>
              ) : workflowSteps.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-500 text-lg">No workflow steps created yet</p>
                  <p className="text-sm text-gray-400 mt-2">Click the + icon to create your first workflow step</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200">
                    <thead className="sticky top-0 z-10 bg-[#0E2F4B] border-b-4 border-[#FFC107]">
                      <tr className="text-white text-sm font-medium">
                        <th className="px-4 py-3 text-left">Step Name</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {workflowSteps.map((step) => (
                        <tr key={step.wf_steps_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            {editingStep === step.wf_steps_id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingStepName}
                                  onChange={(e) => setEditingStepName(e.target.value)}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] text-sm"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleUpdateStep(step.wf_steps_id)}
                                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1"
                                  title="Save"
                                >
                                  <Save size={16} />
                                </button>
                                <button
                                  onClick={handleCancelEditStep}
                                  className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 flex items-center gap-1"
                                  title="Cancel"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <span className="font-medium text-gray-900">{step.text}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              {editingStep !== step.wf_steps_id && (
                                <>
                                  <button
                                    onClick={() => handleStartEditStep(step)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                    title="Edit"
                                  >
                                    <Edit2 size={18} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteStep(step.wf_steps_id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Sequences Tab */}
        {activeTab === 'sequences' && (
          <div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Asset Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedAssetType}
                  onChange={(e) => setSelectedAssetType(e.target.value)}
                  className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent"
                >
                  <option value="">-- Select Asset Type --</option>
                  {assetTypes.map((at) => (
                    <option key={at.asset_type_id} value={at.asset_type_id}>
                      {at.text}
                    </option>
                  ))}
                </select>
              </div>

              {selectedAssetType && (
                <>
                  {/* Table Header with Actions */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 text-lg">Existing Sequences</h3>
                    <button
                      onClick={async () => {
                        if (!newSequence.wf_steps_id || !newSequence.seqs_no) {
                          toast.error('Please fill in both Workflow Step and Sequence Number');
                          return;
                        }
                        if (parseInt(newSequence.seqs_no) % 5 !== 0) {
                          toast.error('Sequence number must be a multiple of 5 (e.g., 5, 10, 15, 20)');
                          return;
                        }
                        try {
                          await API.post('/maintenance-details/workflow-sequences', {
                            asset_type_id: selectedAssetType,
                            wf_steps_id: newSequence.wf_steps_id,
                            seqs_no: newSequence.seqs_no
                          });
                          toast.success('Sequence created successfully');
                          setNewSequence({ wf_steps_id: '', seqs_no: '' });
                          fetchSequences();
                        } catch (error) {
                          console.error('Error creating sequence:', error);
                          toast.error(error.response?.data?.error || 'Failed to create sequence');
                        }
                      }}
                      className="flex items-center justify-center text-white border border-gray-300 rounded px-3 py-2 hover:bg-[#143d65] bg-[#0E2F4B]"
                      title="Add Sequence"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  {/* Add Sequence Form */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Add New Sequence</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Workflow Step <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={newSequence.wf_steps_id}
                          onChange={(e) => setNewSequence({ ...newSequence, wf_steps_id: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] text-sm"
                        >
                          <option value="">-- Select Step --</option>
                          {workflowSteps.map((step) => (
                            <option key={step.wf_steps_id} value={step.wf_steps_id}>
                              {step.text}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Sequence Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={newSequence.seqs_no}
                          onChange={(e) => setNewSequence({ ...newSequence, seqs_no: e.target.value })}
                          placeholder="5, 10, 15, 20, etc."
                          min="5"
                          step="5"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] text-sm"
                        />
                        <p className="mt-1 text-xs text-gray-500">Must be a multiple of 5</p>
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  {loadingSequences ? (
                    <div className="text-center py-16">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0E2F4B]"></div>
                      <p className="mt-4 text-gray-600">Loading...</p>
                    </div>
                  ) : sequences.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <p className="text-gray-500 text-lg">No sequences assigned for this asset type</p>
                      <p className="text-sm text-gray-400 mt-2">Add sequences using the form above</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200">
                        <thead className="sticky top-0 z-10 bg-[#0E2F4B] border-b-4 border-[#FFC107]">
                          <tr className="text-white text-sm font-medium">
                            <th className="px-4 py-3 text-left">Workflow Step</th>
                            <th className="px-4 py-3 text-left">Sequence Number</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {sequences.map((seq) => (
                            <tr key={seq.wf_at_seqs_id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                <span className="font-medium text-gray-900">{seq.step_text || 'N/A'}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-3 py-1 bg-[#0E2F4B] text-white text-sm font-semibold rounded-full">
                                  {seq.seqs_no}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleDeleteSequence(seq.wf_at_seqs_id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
          </div>
        )}

        {/* Job Roles Tab */}
        {activeTab === 'jobRoles' && (
          <div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Workflow Step <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedStepForJobRole}
                  onChange={(e) => setSelectedStepForJobRole(e.target.value)}
                  className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent"
                >
                  <option value="">-- Select Workflow Step --</option>
                  {workflowSteps.map((step) => (
                    <option key={step.wf_steps_id} value={step.wf_steps_id}>
                      {step.text}
                    </option>
                  ))}
                </select>
              </div>

              {selectedStepForJobRole && (
                <>
                  {/* Table Header with Actions */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 text-lg">Assigned Job Roles</h3>
                    <button
                      onClick={async () => {
                        if (!newJobRole.job_role_id || !newJobRole.dept_id) {
                          toast.error('Please fill in both Job Role and Department');
                          return;
                        }
                        try {
                          await API.post('/maintenance-details/workflow-job-roles', {
                            wf_steps_id: selectedStepForJobRole,
                            job_role_id: newJobRole.job_role_id,
                            dept_id: newJobRole.dept_id
                          });
                          toast.success('Job role assigned successfully');
                          setNewJobRole({ job_role_id: '', dept_id: '' });
                          fetchJobRolesForStep(selectedStepForJobRole);
                        } catch (error) {
                          console.error('Error assigning job role:', error);
                          toast.error(error.response?.data?.error || 'Failed to assign job role');
                        }
                      }}
                      className="flex items-center justify-center text-white border border-gray-300 rounded px-3 py-2 hover:bg-[#143d65] bg-[#0E2F4B]"
                      title="Assign Job Role"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  {/* Add Job Role Form */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Assign New Job Role</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Job Role <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={newJobRole.job_role_id}
                          onChange={(e) => setNewJobRole({ ...newJobRole, job_role_id: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] text-sm"
                        >
                          <option value="">-- Select Job Role --</option>
                          {jobRoles.map((jr) => (
                            <option key={jr.job_role_id} value={jr.job_role_id}>
                              {jr.text}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Department <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={newJobRole.dept_id}
                          onChange={(e) => setNewJobRole({ ...newJobRole, dept_id: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] text-sm"
                        >
                          <option value="">-- Select Department --</option>
                          {departments.map((dept) => (
                            <option key={dept.dept_id} value={dept.dept_id}>
                              {dept.text}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  {loadingJobRoles ? (
                    <div className="text-center py-16">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0E2F4B]"></div>
                      <p className="mt-4 text-gray-600">Loading...</p>
                    </div>
                  ) : jobRolesForStep.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <p className="text-gray-500 text-lg">No job roles assigned to this step</p>
                      <p className="text-sm text-gray-400 mt-2">Assign job roles using the form above</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200">
                        <thead className="sticky top-0 z-10 bg-[#0E2F4B] border-b-4 border-[#FFC107]">
                          <tr className="text-white text-sm font-medium">
                            <th className="px-4 py-3 text-left">Job Role</th>
                            <th className="px-4 py-3 text-left">Department</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {jobRolesForStep.map((jr) => (
                            <tr key={jr.wf_job_role_id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                <span className="font-medium text-gray-900">{jr.job_role_name || 'N/A'}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                                  {jr.department_name || 'N/A'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleDeleteJobRole(jr.wf_job_role_id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    title="Remove"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceDetails;
