import React from "react";
import { useNavigate } from "react-router-dom";

const NotificationsPanel = () => {
  const navigate = useNavigate();

  const notifications = [
    {
      title: "Subscription ending",
      type: "alert",
      color: "bg-blue-100 text-blue-800",
      path: "/notifications/subscription",
    },
    {
      title: "Submission date",
      type: "success",
      color: "bg-green-100 text-green-800",
      path: "/notifications/submission",
    },
  ];

  return (
    <div className="space-y-3">
      {notifications.map((notification, index) => (
        <div
          key={index}
          onClick={() => navigate(notification.path)}
          className="flex items-center justify-between p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
        >
          <span className="text-sm font-medium text-gray-700">
            {notification.title}
          </span>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${notification.color}`}
          >
            Alert
          </span>
        </div>
      ))}
    </div>
  );
};

export default NotificationsPanel;
