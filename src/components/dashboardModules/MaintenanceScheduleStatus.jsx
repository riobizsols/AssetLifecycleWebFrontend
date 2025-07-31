import React, { useState, useEffect } from "react";
import { Clock, Activity, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import API from "../../lib/axios";

const MaintenanceScheduleStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastExecution, setLastExecution] = useState(null);

  useEffect(() => {
    console.log('🚀 Maintenance Schedule Status Component Mounted');
    fetchMaintenanceStatus();
    // Refresh status every 30 seconds
    const interval = setInterval(fetchMaintenanceStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMaintenanceStatus = async () => {
    try {
      setLoading(true);
      const response = await API.get("/maintenance/status");
      setStatus(response.data);
      setError(null);
      
      // Log the execution count to console
      if (response.data.executionCount) {
        console.log('🔄 Maintenance Status - Execution Count:', response.data.executionCount);
      }
    } catch (err) {
      console.error("Error fetching maintenance status:", err);
      setError("Failed to fetch maintenance status");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const triggerDummyTest = async () => {
    try {
      setLoading(true);
      const response = await API.get("/maintenance/test-dummy");
      setLastExecution(new Date().toISOString());
      
      // Update execution count immediately from the response
      if (response.data.executionCount) {
        // We could store this in a state variable if needed
        console.log('🎯 Test Triggered - New Execution Count:', response.data.executionCount);
      }
      
      // Refresh status after test with a longer delay to ensure backend updates
      setTimeout(fetchMaintenanceStatus, 2000);
    } catch (err) {
      console.error("Error triggering dummy test:", err);
      setError("Failed to trigger test");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (loading) return <Activity className="w-5 h-5 text-blue-500 animate-spin" />;
    if (error) return <AlertCircle className="w-5 h-5 text-red-500" />;
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const getStatusText = () => {
    if (loading) return "Loading...";
    if (error) return "Error";
    if (status?.success) return "Active";
    return "Unknown";
  };

  const getStatusColor = () => {
    if (loading) return "text-blue-600";
    if (error) return "text-red-600";
    if (status?.success) return "text-green-600";
    return "text-gray-600";
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Maintenance Schedule Status
        </CardTitle>
        {getStatusIcon()}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-4">
            <Activity className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
            <p className="text-gray-600">Loading maintenance status...</p>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchMaintenanceStatus}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Status:</span>
              <span className={`font-semibold ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Cron Schedule:</span>
              <span className="text-sm text-gray-500">Every Hour</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Last Updated:</span>
              <span className="text-sm text-gray-500">
                {status?.timestamp ? new Date(status.timestamp).toLocaleString() : "N/A"}
              </span>
            </div>

            {lastExecution && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Last Test:</span>
                <span className="text-sm text-gray-500">
                  {new Date(lastExecution).toLocaleString()}
                </span>
              </div>
            )}

            <div className="pt-3 border-t border-gray-200">
              <button
                onClick={triggerDummyTest}
                disabled={loading}
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? "Testing..." : "Trigger Test Execution"}
              </button>
            </div>

            {/* <div className="text-xs text-gray-500 text-center">
              This will trigger the dummy maintenance schedule function
            </div> */}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MaintenanceScheduleStatus; 