import React from "react";
import { useAppData } from "../contexts/AppDataContext";

const statusColors = {
  approved: "text-green-600 font-semibold",
  pending: "text-yellow-500 font-semibold",
  rejected: "text-red-600 font-semibold",
  // Maintenance statuses
  AP: "text-yellow-600 font-semibold",
  IN: "text-blue-600 font-semibold",
  IP: "text-yellow-500 font-semibold",
  CO: "text-green-600 font-semibold",
  CF: "text-green-800 font-bold underline",
  CA: "text-red-600 font-semibold",
  // Asset statuses
  Active: "text-green-600 font-semibold",
  Inactive: "text-gray-600 font-semibold",
  Disposed: "text-red-600 font-semibold",
  // Scrap asset statuses
  "Nearing Expiry": "px-2 py-1 bg-yellow-100 text-amber-800 text-xs font-medium rounded-full",
  "Expired": "px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full",
  // Add more statuses as needed
};

export default function StatusBadge({ status }) {
  let display = status;
  try {
    const { getStatusText } = useAppData();
    if (getStatusText) {
      display = getStatusText(status) || status;
    }
  } catch (err) {
    // If context not available, just use the status as-is
    console.warn('StatusBadge: AppDataContext not available, using raw status');
  }
  
  const key = status?.toLowerCase();
  const className = statusColors[status] || statusColors[key] || "text-gray-600";
  return (
    <span className={className}>
      {display}
    </span>
  );
} 