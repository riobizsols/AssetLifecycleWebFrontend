import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ExclamationTriangleIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
// import API from "../../lib/axios"; // Uncomment and use when backend is ready

const mockAlerts = [
  {
    alertType: "Regular Maintenance",
    alertText: "Laptop Maintenance",
    dueOn: "2024-07-25",
    actionBy: "John Doe",
    cutoffDate: "2024-07-30",
    isUrgent: false,
  },
  {
    alertType: "Regular Maintenance",
    alertText: "Printer Maintenance",
    dueOn: "2024-07-22",
    actionBy: "Jane Smith",
    cutoffDate: "2024-07-24",
    isUrgent: true,
  },
];

const badgeColors = {
  "Regular Maintenance": "bg-blue-100 text-blue-800",
  Urgent: "bg-red-100 text-red-800",
};

const NotificationsPanel = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setAlerts(mockAlerts);
      setLoading(false);
    }, 800);
    // Uncomment for real API:
    // API.get("/api/maintenance-alerts").then(res => {
    //   setAlerts(res.data);
    //   setLoading(false);
    // });
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-lg" />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center text-gray-400 py-8">
        <ExclamationTriangleIcon className="w-8 h-8 mb-2" />
        <span className="text-sm">No upcoming maintenance alerts.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert, idx) => (
        <div
          key={idx}
          className={`p-4 rounded-lg border flex flex-col gap-2 shadow-sm transition-colors duration-200 cursor-pointer
            ${alert.isUrgent ? "border-red-500 bg-red-50" : "border-gray-200 hover:bg-gray-50"}
          `}
          title={alert.isUrgent ? "Urgent: Cut-off date is near!" : ""}
        >
          <div className="flex items-center gap-2">
            {alert.isUrgent && (
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-1" />
            )}
            <span className={`text-xs font-bold px-2 py-1 rounded ${badgeColors[alert.alertType] || "bg-gray-100 text-gray-800"}`}>
              {alert.alertType}
            </span>
            <span className="font-semibold text-gray-800">{alert.alertText}</span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-gray-600 items-center">
            <span className="flex items-center gap-1">
              <CalendarIcon className="w-4 h-4" />
              Due On: <b>{alert.dueOn}</b>
            </span>
            <span className="flex items-center gap-1">
              <UserIcon className="w-4 h-4" />
              Action By: <b>{alert.actionBy}</b>
            </span>
            <span className="flex items-center gap-1">
              <ClockIcon className={`w-4 h-4 ${alert.isUrgent ? "text-red-500" : ""}`} />
              Cut-off Date: {" "}
              <b className={alert.isUrgent ? "text-red-600" : ""}>{alert.cutoffDate}</b>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationsPanel;
