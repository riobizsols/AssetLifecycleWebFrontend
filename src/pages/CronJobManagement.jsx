import React, { useState, useEffect } from "react";
import { Clock, Play, AlertCircle, CheckCircle, Loader2, RefreshCw, History, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import API from "../lib/axios";

const CronJobManagement = () => {
  const [cronStatus, setCronStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [lastTriggerResult, setLastTriggerResult] = useState(null);
  const [error, setError] = useState(null);
  const [triggerHistory, setTriggerHistory] = useState([]);

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
      
      // Add to trigger history
      const newTrigger = {
        timestamp: new Date().toISOString(),
        result: response.data,
        success: true
      };
      setTriggerHistory(prev => [newTrigger, ...prev.slice(0, 9)]); // Keep last 10
      
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
      
      // Add failed trigger to history
      const newTrigger = {
        timestamp: new Date().toISOString(),
        result: { 
          error: errorMessage,
          details: err.response?.data 
        },
        success: false
      };
      setTriggerHistory(prev => [newTrigger, ...prev.slice(0, 9)]);
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

  const formatTriggerHistory = (history) => {
    return history.map((trigger, index) => (
      <div key={index} className={`p-3 rounded-md border ${
        trigger.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {trigger.success ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm font-medium ${
                trigger.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {trigger.success ? 'Success' : 'Failed'}
              </span>
            </div>
            <div className="text-xs text-gray-600">
              {new Date(trigger.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
        {trigger.result && (
          <div className="mt-2 text-xs">
            <details className="cursor-pointer">
              <summary className="font-medium">View Details</summary>
              <pre className="mt-1 bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                {JSON.stringify(trigger.result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cron Job Management</h1>
            <p className="text-gray-600 mt-2">Monitor and control automated maintenance schedule generation</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchCronStatus}
              disabled={isLoading}
              className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Refresh
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cron Job Status */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Maintenance Schedule Generation
                </CardTitle>
                {getStatusIcon()}
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
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <h4 className="font-medium text-blue-900 mb-3">Job Configuration</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-700">Schedule:</span>
                          <span className="font-mono text-blue-900">0 0 * * *</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Timezone:</span>
                          <span className="text-blue-900">Asia/Kolkata (IST)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Next Run:</span>
                          <span className="text-blue-900">{getNextRunTime()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Status:</span>
                          <span className="text-green-600 font-medium">Active</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={triggerMaintenanceGeneration}
                        disabled={isTriggering}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                        {isTriggering ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Triggering...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Trigger Now
                          </>
                        )}
                      </button>
                    </div>

                    {lastTriggerResult && (
                      <div className="bg-green-50 border border-green-200 rounded-md p-4">
                        <h5 className="font-medium text-green-900 mb-2">Last Trigger Result</h5>
                        <div className="text-sm text-green-700 space-y-2">
                          <div>Message: {lastTriggerResult.message}</div>
                          {lastTriggerResult.result && (
                            <details className="cursor-pointer">
                              <summary className="font-medium">View Details</summary>
                              <pre className="mt-2 bg-green-100 p-3 rounded text-xs overflow-x-auto">
                                {JSON.stringify(lastTriggerResult.result, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!cronStatus && !isLoading && !error && (
                  <div className="text-center text-gray-500 py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                    <p>Loading cron job status...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Trigger History */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Trigger History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {triggerHistory.length > 0 ? (
                    formatTriggerHistory(triggerHistory)
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      <History className="w-6 h-6 mx-auto mb-2" />
                      <p className="text-sm">No trigger history yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Information Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5" />
              About Cron Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-gray-600">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">What are Cron Jobs?</h4>
                <p>
                  Cron jobs are automated tasks that run at scheduled intervals. In this system, 
                  the maintenance schedule generation cron job automatically creates maintenance 
                  schedules for assets that require maintenance.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">How it Works</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Runs daily at 12:00 AM IST</li>
                  <li>Scans all assets for maintenance requirements</li>
                  <li>Creates workflow maintenance schedules</li>
                  <li>Generates detailed maintenance tasks</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Manual Trigger</h4>
                <p>
                  You can manually trigger the maintenance generation process using the "Trigger Now" 
                  button. This is useful for testing or when immediate maintenance schedules are needed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CronJobManagement; 