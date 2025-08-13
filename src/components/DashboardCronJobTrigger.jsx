import React, { useState, useEffect } from 'react';
import API from '../lib/axios';

const DashboardCronJobTrigger = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [lastResult, setLastResult] = useState(null);
    const [error, setError] = useState('');
    const [orgId, setOrgId] = useState('ORG001'); // Default org ID - you can make this dynamic

    const triggerDepreciationCronJob = async () => {
        if (isRunning) return;

        setIsRunning(true);
        setError('');
        setLastResult(null);

        try {
            console.log('Triggering depreciation cron job...');
            
            const response = await API.post('/cron-jobs/trigger-depreciation', {
                org_id: orgId
            });

            console.log('Cron job response:', response.data);
            setLastResult(response.data.result);
            
            // Show success message
            if (response.data.result.status === 'completed') {
                console.log(`✅ Cron job completed successfully! Processed ${response.data.result.totalAssets} assets`);
            } else {
                console.log(`❌ Cron job failed: ${response.data.result.error}`);
            }

        } catch (error) {
            console.error('Error triggering cron job:', error);
            setError(error.response?.data?.message || 'Failed to trigger cron job');
        } finally {
            setIsRunning(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed':
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
                    Depreciation Cron Job Trigger
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
                        onClick={triggerDepreciationCronJob}
                        disabled={isRunning}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                            isRunning
                                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
                        }`}
                    >
                        {isRunning ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Running...
                            </span>
                        ) : (
                            '🚀 Trigger Depreciation Cron Job'
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
                    {/* Job Summary */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-medium text-gray-800 mb-3">Job Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="text-gray-600">Job ID:</span>
                                <p className="font-mono text-xs">{lastResult.jobId}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Status:</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lastResult.status)}`}>
                                    {lastResult.status}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600">Start Time:</span>
                                <p className="text-xs">{formatDate(lastResult.startTime)}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">End Time:</span>
                                <p className="text-xs">{formatDate(lastResult.endTime)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Execution Results */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-medium text-gray-800 mb-3">Execution Results</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="text-gray-600">Total Assets:</span>
                                <p className="font-medium text-lg">{lastResult.totalAssets}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Successful:</span>
                                <p className="font-medium text-green-600 text-lg">{lastResult.successful}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Failed:</span>
                                <p className="font-medium text-red-600 text-lg">{lastResult.failed}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Execution Time:</span>
                                <p className="font-medium text-lg">{lastResult.executionTime}ms</p>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Results */}
                    {lastResult.results && lastResult.results.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="font-medium text-gray-800 mb-3">Asset Results</h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {lastResult.results.map((result, index) => (
                                    <div key={index} className="bg-white rounded p-3 border">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-medium text-sm">{result.asset_name}</span>
                                            <span className="text-xs text-gray-500">{result.method}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                            <div>
                                                <span className="text-gray-600">Depreciation:</span>
                                                <p className="font-medium">{formatCurrency(result.depreciation_amount)}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Before:</span>
                                                <p className="font-medium">{formatCurrency(result.book_value_before)}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">After:</span>
                                                <p className="font-medium">{formatCurrency(result.book_value_after)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Errors */}
                    {lastResult.errors && lastResult.errors.length > 0 && (
                        <div className="bg-red-50 rounded-lg p-4">
                            <h3 className="font-medium text-red-800 mb-3">Errors ({lastResult.errors.length})</h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {lastResult.errors.map((error, index) => (
                                    <div key={index} className="bg-white rounded p-3 border border-red-200">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-medium text-sm text-red-800">{error.asset_name}</span>
                                            <span className="text-xs text-red-600">Asset ID: {error.asset_id}</span>
                                        </div>
                                        <p className="text-sm text-red-700">{error.error}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {!lastResult && !isRunning && (
                <div className="text-center py-8 text-gray-500">
                    <p>Click the button above to trigger the depreciation calculation cron job</p>
                    <p className="text-sm mt-2">This will process all assets eligible for depreciation</p>
                </div>
            )}
        </div>
    );
};

export default DashboardCronJobTrigger;
