import React from "react";

const statusColors = {
  approved: "text-green-600 font-semibold",
  pending: "text-yellow-500 font-semibold",
  rejected: "text-red-600 font-semibold",
  // Maintenance statuses
  IN: "text-blue-600 font-semibold",
  IP: "text-yellow-500 font-semibold",
  CO: "text-green-600 font-semibold",
  CA: "text-red-600 font-semibold",
  // Asset statuses
  Active: "text-green-600 font-semibold",
  Inactive: "text-gray-600 font-semibold",
  Disposed: "text-red-600 font-semibold",
  // Add more statuses as needed
};

export default function StatusBadge({ status }) {
  const key = status?.toLowerCase();
  return (
    <span className={statusColors[key] || "text-gray-600"}>
      {status}
    </span>
  );
} 