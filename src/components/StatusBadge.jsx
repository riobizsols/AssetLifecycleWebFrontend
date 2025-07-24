import React from "react";

const statusColors = {
  approved: "text-green-600 font-semibold",
  pending: "text-yellow-500 font-semibold",
  rejected: "text-red-600 font-semibold",
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