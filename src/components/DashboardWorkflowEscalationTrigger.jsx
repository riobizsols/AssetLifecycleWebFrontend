import React, { useState } from 'react';
import API from '../lib/axios';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuthStore } from '../store/useAuthStore';

const DashboardWorkflowEscalationTrigger = () => {
    const { t } = useLanguage();
    const { user } = useAuthStore();
    const [isRunning, setIsRunning] = useState(false);
    const [lastResult, setLastResult] = useState(null);
    const [error, setError] = useState('');
    const [orgId, setOrgId] = useState(user?.org_id || 'ORG001');

    const triggerWorkflowEscalation = async () => {
        if (isRunning) return;

        setIsRunning(true);
        setError('');
        setLastResult(null);

        try {
            console.log('🚀 Triggering workflow escalation...');
            
            const response = await API.post('/workflow-escalation/process', {
                orgId: orgId
            });

            console.log('Escalation response:', response.data);
            setLastResult(response.data);
            
            // Show success message
            if (response.data.success) {
                console.log(`✅ Escalation completed! Escalated: ${response.data.data.escalated} workflows, Errors: ${response.data.data.errors}`);
            } else {
                console.log(`❌ Escalation failed: ${response.data.message}`);
            }

        } catch (error) {
            console.error('Error triggering workflow escalation:', error);
            setError(error.response?.data?.message || 'Failed to trigger workflow escalation');
        } finally {
            setIsRunning(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'success':
                return 'text-green-600 bg-green-100';
            case 'failed':
                return 'text-red-600 bg-red-100';
            case 'running':
                return 'text-blue-600 bg-blue-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                    🔔 Workflow Escalation Trigger
                </h2>
                <div className="flex items-center space-x-4">
                    <input
                        type="text"
                        value={orgId}
                        onChange={(e) => setOrgId(e.target.value)}
                        placeholder="Organization ID"
                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                    <button
                        onClick={triggerWorkflowEscalation}
                        disabled={isRunning}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                            isRunning
                                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                : 'bg-orange-600 text-white hover:bg-orange-700 focus:ring-2 focus:ring-orange-500'
                        }`}
                    >
                        {isRunning ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Escalating...
                            </span>
                        ) : (
                            '🚀 Trigger Escalation'
                        )}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {lastResult && (
                <div className="space-y-4">
                    {/* Escalation Summary */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-medium text-gray-800 mb-3">Escalation Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="text-gray-600">Status:</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lastResult.success ? 'success' : 'failed')}`}>
                                    {lastResult.success ? 'Success' : 'Failed'}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600">Timestamp:</span>
                                <p className="text-xs">{formatDate(new Date())}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Organization:</span>
                                <p className="text-xs font-mono">{orgId}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Execution Time:</span>
                                <p className="text-xs">{lastResult.data?.executionTime || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Results */}
                    {lastResult.data && (
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="font-medium text-gray-800 mb-3">Escalation Results</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-600">Workflows Escalated:</span>
                                    <p className="font-medium text-green-600 text-lg">{lastResult.data.escalated}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">Errors:</span>
                                    <p className="font-medium text-red-600 text-lg">{lastResult.data.errors}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">Total Processed:</span>
                                    <p className="font-medium text-blue-600 text-lg">{lastResult.data.escalated + lastResult.data.errors}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Message */}
                    <div className="bg-blue-50 rounded-lg p-4">
                        <h3 className="font-medium text-blue-800 mb-2">What happened?</h3>
                        <p className="text-sm text-blue-700">
                            The system checked all pending maintenance workflows and escalated those that have exceeded their cutoff dates. 
                            Next approvers in the sequence now have 'AP' status and will receive notifications.
                        </p>
                    </div>

                    {/* Detailed Results */}
                    {lastResult.data?.escalatedWorkflows && lastResult.data.escalatedWorkflows.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="font-medium text-gray-800 mb-3">Escalated Workflows ({lastResult.data.escalatedWorkflows.length})</h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {lastResult.data.escalatedWorkflows.map((workflow, index) => (
                                    <div key={index} className="bg-white rounded p-3 border">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-medium text-sm">{workflow.wfamsh_id}</span>
                                            <span className="text-xs text-gray-500">{workflow.asset_id}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span className="text-gray-600">Current Approver:</span>
                                                <p className="font-medium">{workflow.current_approver}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Next Approver:</span>
                                                <p className="font-medium">{workflow.next_approver}</p>
                                            </div>
                                        </div>
                                        <div className="mt-2">
                                            <span className="text-gray-600 text-xs">Cutoff Date:</span>
                                            <p className="text-xs font-medium text-red-600">{workflow.cutoff_date}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Errors */}
                    {lastResult.data?.errors > 0 && (
                        <div className="bg-red-50 rounded-lg p-4">
                            <h3 className="font-medium text-red-800 mb-3">Errors ({lastResult.data.errors})</h3>
                            <p className="text-sm text-red-700">
                                Some workflows could not be escalated due to missing next approvers or other issues. 
                                Check the backend logs for detailed error information.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {!lastResult && !isRunning && (
                <div className="text-center py-8 text-gray-500">
                    <p>Click the button to trigger workflow escalation</p>
                    <p className="text-sm mt-2">This will escalate all overdue maintenance workflows</p>
                    <div className="mt-4 text-xs text-gray-400">
                        <p><strong>What it does:</strong></p>
                        <ul className="text-left max-w-md mx-auto mt-2 space-y-1">
                            <li>• Finds workflows past their cutoff date</li>
                            <li>• Updates next approver status to 'AP'</li>
                            <li>• Sends notification emails</li>
                            <li>• Both current and next approvers can now approve</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardWorkflowEscalationTrigger;
