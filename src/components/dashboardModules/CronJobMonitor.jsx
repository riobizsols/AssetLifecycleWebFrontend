import React, { useState, useEffect } from "react";
import { Clock, Play, AlertCircle, CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import API from "../../lib/axios";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";

const CronJobMonitor = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [cronStatus, setCronStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [lastTriggerResult, setLastTriggerResult] = useState(null);
  const [error, setError] = useState(null);

  // Fetch cron job status
  const fetchCronStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await API.get("/cron/status");
      setCronStatus(response.data);
    } catch (err) {
      console.error("Error fetching cron status:", err);
      setError("Failed to fetch cron job status");
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger maintenance generation manually
  const triggerMaintenanceGeneration = async () => {
    try {
      setIsTriggering(true);
      setError(null);
      const response = await API.post("/cron/trigger-maintenance");
      setLastTriggerResult(response.data);
      
      // Refresh status after successful trigger
      setTimeout(() => {
        fetchCronStatus();
      }, 1000);
    } catch (err) {
      // Detailed error logging
      console.error("❌ Error triggering maintenance generation:", err);
      console.error("❌ Error details:", {
        message: err.message,
        name: err.name,
        code: err.code,
        response: err.response,
        responseData: err.response?.data,
        responseStatus: err.response?.status,
        responseHeaders: err.response?.headers,
        request: err.request,
        config: err.config,
        stack: err.stack
      });
      
      // Log the full error response if available
      if (err.response?.data) {
        console.error("❌ Server error response:", JSON.stringify(err.response.data, null, 2));
        console.error("❌ Error message from server:", err.response.data.message || err.response.data.error || err.response.data.details);
        if (err.response.data.stack) {
          console.error("❌ Server error stack:", err.response.data.stack);
        }
      }
      
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.response?.data?.details || 
                          err.message || 
                          "Failed to trigger maintenance generation";
      
      setError(errorMessage);
    } finally {
      setIsTriggering(false);
    }
  };

  useEffect(() => {
    fetchCronStatus();
  }, []);

  const getStatusIcon = () => {
    if (isLoading) return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
    if (error) return <AlertCircle className="w-5 h-5 text-red-500" />;
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const getNextRunTime = () => {
    if (!cronStatus?.status?.maintenanceGeneration) return "Unknown";
    
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    return tomorrow.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="h-full cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/cron-management')}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5" />
          {t('dashboard.cronJobMonitor')}
        </CardTitle>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <ArrowRight className="w-4 h-4 text-gray-400" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}

        {cronStatus && (
          <div className="space-y-3">
                         <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
               <h4 className="font-medium text-blue-900 mb-2">{t('dashboard.maintenanceScheduleGeneration')}</h4>
               <div className="space-y-1 text-sm">
                 <div className="flex justify-between">
                   <span className="text-blue-700">{t('dashboard.schedule')}:</span>
                   <span className="font-mono text-blue-900">0 0 * * *</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-blue-700">{t('dashboard.timezone')}:</span>
                   <span className="text-blue-900">Asia/Kolkata (IST)</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-blue-700">{t('dashboard.nextRun')}:</span>
                   <span className="text-blue-900">{getNextRunTime()}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-blue-700">{t('dashboard.status')}:</span>
                   <span className="text-green-600 font-medium">{t('dashboard.active')}</span>
                 </div>
               </div>
               <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                 <span>{t('dashboard.clickToViewDetailed')}</span>
               </div>
             </div>

                         <div className="flex gap-2">
               <button
                 onClick={(e) => {
                   e.stopPropagation();
                   triggerMaintenanceGeneration();
                 }}
                 disabled={isTriggering}
                 className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors"
               >
                 {isTriggering ? (
                   <>
                     <Loader2 className="w-4 h-4 animate-spin" />
                     {t('common.loading')}
                   </>
                 ) : (
                   <>
                     <Play className="w-4 h-4" />
                     {t('dashboard.triggerNow')}
                   </>
                 )}
               </button>
               <button
                 onClick={(e) => {
                   e.stopPropagation();
                   fetchCronStatus();
                 }}
                 disabled={isLoading}
                 className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
               >
                 {isLoading ? (
                   <Loader2 className="w-4 h-4 animate-spin" />
                 ) : (
                   t('dashboard.refresh')
                 )}
               </button>
             </div>

            {lastTriggerResult && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <h5 className="font-medium text-green-900 mb-2">Last Trigger Result</h5>
                <div className="text-sm text-green-700 space-y-1">
                  <div>Message: {lastTriggerResult.message}</div>
                  {lastTriggerResult.result && (
                    <div className="text-xs bg-green-100 p-2 rounded">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(lastTriggerResult.result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {!cronStatus && !isLoading && !error && (
          <div className="text-center text-gray-500 py-4">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p>Loading cron job status...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CronJobMonitor; 