import React, { useState } from 'react';
import API from '../lib/axios';
import { useLanguage } from '../contexts/LanguageContext';

const DashboardMaintenanceTrigger = () => {
    const { t } = useLanguage();
    const [isRunning, setIsRunning] = useState(false);
    const [lastResult, setLastResult] = useState(null);
    const [error, setError] = useState('');
    const [orgId, setOrgId] = useState('ORG001');

    const triggerMaintenance = async () => {
        if (isRunning) return;

        setIsRunning(true);
        setError('');
        setLastResult(null);

        try {
            console.log('Triggering maintenance cron job...');
            
            const response = await API.post('/cron/trigger-maintenance', {
                org_id: orgId
            });

            console.log('Cron job response:', response.data);
            setLastResult(response.data.result);
            
            if (response.data.result?.success) {
                console.log(`✅ Maintenance generation completed successfully!`);
            } else {
                console.log(`❌ Maintenance generation failed or partial:`, response.data.result);
            }

        } catch (error) {
            console.error('Error triggering maintenance cron job:', error);
            setError(error.response?.data?.message || 'Failed to trigger maintenance generation');
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                    Maintenance Schedule Trigger
                </h2>
                <div className="flex items-center space-x-4">
                    <input
                        type="text"
                        value={orgId}
                        onChange={(e) => setOrgId(e.target.value)}
                        placeholder="Org ID (e.g. ORG001)"
                        className="border border-gray-300 rounded px-3 py-1 text-sm w-32"
                    />
                    <button
                        onClick={triggerMaintenance}
                        disabled={isRunning}
                        className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
                            isRunning 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-green-600 hover:bg-green-700'
                        }`}
                    >
                        {isRunning ? 'Run...' : 'Run Now'}
                    </button>
                </div>
            </div>

            <p className="text-gray-600 text-sm mb-4">
                Manually trigger the maintenance schedule generation process. This will create maintenance workflow tasks for assets due for maintenance based on their frequency settings.
            </p>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                    <p className="text-red-700 text-sm">{error}</p>
                </div>
            )}

            {lastResult && (
                <div className={`border-l-4 p-4 ${lastResult.success ? 'bg-green-50 border-green-500' : 'bg-yellow-50 border-yellow-500'}`}>
                    <h3 className={`text-sm font-bold ${lastResult.success ? 'text-green-800' : 'text-yellow-800'} mb-2`}>
                        {lastResult.message}
                    </h3>
                    
                    {lastResult.stats && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-600">Assets Processed:</span>
                                <span className="font-semibold ml-2">{lastResult.stats.assetsProcessed}</span>
                            </div>
                            <div>
                                <span className="text-gray-600">Schedules Created:</span>
                                <span className="font-semibold ml-2">{lastResult.stats.schedulesCreated}</span>
                            </div>
                            <div>
                                <span className="text-gray-600">Errors:</span>
                                <span className="font-semibold ml-2 text-red-600">{lastResult.stats.errors?.length || 0}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DashboardMaintenanceTrigger;
