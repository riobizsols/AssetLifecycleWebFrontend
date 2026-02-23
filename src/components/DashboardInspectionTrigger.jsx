import React, { useState } from 'react';
import API from '../lib/axios';
import { useLanguage } from '../contexts/LanguageContext';

const DashboardInspectionTrigger = () => {
    const { t } = useLanguage();
    const [isRunning, setIsRunning] = useState(false);
    const [lastResult, setLastResult] = useState(null);
    const [error, setError] = useState('');
    const [orgId, setOrgId] = useState('ORG001');

    const triggerInspection = async () => {
        if (isRunning) return;

        setIsRunning(true);
        setError('');
        setLastResult(null);

        try {
            console.log('Triggering inspection cron job...');
            
            const response = await API.post('/cron/trigger-inspection', {
                org_id: orgId
            });

            console.log('Cron job response:', response.data);
            setLastResult(response.data.result);
            
            if (response.data.result?.success) {
                console.log(`✅ Inspection generation completed successfully!`);
            } else {
                console.log(`❌ Inspection generation failed or partial:`, response.data.result);
            }

        } catch (error) {
            console.error('Error triggering inspection cron job:', error);
            setError(error.response?.data?.message || 'Failed to trigger inspection generation');
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                    Inspection Schedule Trigger
                </h2>
                <div className="flex items-center space-x-4">
                    <input
                        type="text"
                        value={orgId}
                        onChange={(e) => setOrgId(e.target.value)}
                        placeholder={t('common.organizationId')}
                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                    <button
                        onClick={triggerInspection}
                        disabled={isRunning}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                            isRunning
                                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500'
                        }`}
                    >
                        {isRunning ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {t('common.loading')}
                            </span>
                        ) : (
                            'Generate Inspections'
                        )}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
                    {error}
                </div>
            )}

            {lastResult && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md">
                    <h3 className="font-semibold mb-2">Result:</h3>
                    <pre className="text-xs overflow-auto max-h-40">
                        {JSON.stringify(lastResult, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default DashboardInspectionTrigger;
