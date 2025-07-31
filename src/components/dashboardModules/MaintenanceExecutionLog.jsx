import React, { useState, useEffect } from "react";
import { FileText, Calendar, Clock, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import API from "../../lib/axios";

const MaintenanceExecutionLog = () => {
  const [executionCount, setExecutionCount] = useState(0);
  const [lastExecution, setLastExecution] = useState(null);
  const [nextExecution, setNextExecution] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🚀 Maintenance Execution Log Component Mounted');
    fetchMaintenanceStatus();
    const interval = setInterval(fetchMaintenanceStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchMaintenanceStatus = async () => {
    try {
      setLoading(true);
      const response = await API.get("/maintenance/status");
      setStatus(response.data);
      
      if (response.data.executionCount) {
        setExecutionCount(response.data.executionCount);
        console.log('📊 Execution Log - Current Count:', response.data.executionCount);
      }
      
      if (response.data.nextExecution) {
        setNextExecution(new Date(response.data.nextExecution));
      }
      
      setLastExecution(new Date(response.data.timestamp));
    } catch (err) {
      console.error("Error fetching maintenance status:", err);
      // Fallback to estimated count if API fails
      const now = new Date();
      const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      const minutesSinceStart = (now - startOfHour) / (1000 * 60);
      const estimatedCount = Math.floor(minutesSinceStart / 60) + 1;
      setExecutionCount(estimatedCount);
      
      const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1);
      setNextExecution(nextHour);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    if (!date) return "N/A";
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateTime = (date) => {
    if (!date) return "N/A";
    return date.toLocaleString();
  };

  const getStatusColor = () => {
    const now = new Date();
    const lastExec = lastExecution || new Date(now.getTime() - 3600000); // Default to 1 hour ago
    const timeSinceLast = now - lastExec;
    
    if (timeSinceLast < 3600000) return "text-green-600"; // Less than 1 hour
    if (timeSinceLast < 7200000) return "text-yellow-600"; // Less than 2 hours
    return "text-red-600"; // More than 2 hours
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Maintenance Execution Log
        </CardTitle>
        <Activity className={`w-5 h-5 ${loading ? 'text-blue-500 animate-spin' : 'text-green-500'}`} />
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="text-center py-2">
            <p className="text-sm text-blue-600">Refreshing data...</p>
          </div>
        )}
        {loading ? (
          <div className="text-center py-4">
            <Activity className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
            <p className="text-gray-600">Loading execution data...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Execution Count:</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {executionCount}
                </div>
                <div className="text-xs text-gray-500">
                  {status?.executionCount ? 'Real-time count from server' : 'Estimated executions since start'}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Next Execution:</span>
                </div>
                <div className="text-lg font-semibold text-green-600">
                  {formatTime(nextExecution)}
                </div>
                <div className="text-xs text-gray-500">
                  {nextExecution ? `Today at ${formatTime(nextExecution)}` : "Calculating..."}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Schedule:</span>
                  <span className="text-sm font-medium">Every Hour (0 * * * *)</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Current Status:</span>
                  <span className={`text-sm font-medium ${getStatusColor()}`}>
                    Active
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Last Execution:</span>
                  <span className="text-sm text-gray-500">
                    {formatDateTime(lastExecution)}
                  </span>
                </div>
              </div>
            </div>

            {/* <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>Note:</strong> The cron job runs every hour automatically. 
                {status?.executionCount ? ' Execution count is real-time from server.' : ' Execution count is estimated based on time since the current hour started.'}
              </div>
              <button
                onClick={fetchMaintenanceStatus}
                disabled={loading}
                className="mt-2 w-full px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? "Refreshing..." : "Refresh Count"}
              </button>
            </div> */}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MaintenanceExecutionLog; 