import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import API from "../../lib/axios";
import { useAuditLog } from "../../hooks/useAuditLog";
import { AUTH_APP_IDS } from "../../constants/authAuditEvents";

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sent, setSent] = useState(false);
  
  // Audit logging for reset password
  const { recordActionByNameWithFetch } = useAuditLog(AUTH_APP_IDS.RESETPASSWORD);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match");
    }

    setLoading(true);
    try {
      console.log("🔄 Starting password reset process...");
      console.log("🔑 Token:", token ? "Present" : "Missing");
      
      const res = await API.post("/auth/reset-password", {
        token,
        newPassword,
      });

      console.log("✅ Password reset API response:", res.data);
      setMessage(res.data.message || "Password reset successfully.");
      setSent(true);

      // Log audit event for successful password reset
      console.log("📝 Attempting to log audit event for reset password...");
      try {
        const auditResult = await recordActionByNameWithFetch('Reset Password', { 
          action: 'Password Reset Successfully',
          token: token ? 'Valid Token' : 'No Token'
        });
        console.log("📝 Audit log result:", auditResult);
      } catch (auditError) {
        console.error("❌ Audit logging failed:", auditError);
      }

      setTimeout(() => {
        navigate("/"); // 👈 login page
      }, 2500);
    } catch (err) {
      console.error("❌ Password reset failed:", err);
      setError(
        err.response?.data?.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Side */}
      <div className="hidden md:flex w-1/2 bg-[#0E2F4B] items-center justify-center">
        <img src="/logo.png" alt="Logo" className="w-48 h-auto" />
      </div>

      {/* Right Side */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4">Reset Password</h2>

          {message && <p className="text-green-600 mb-4">{message}</p>}
          {error && <p className="text-red-600 mb-4">{error}</p>}

          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium mb-1">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative mb-4">
              <input
                type={showNew ? "text" : "password"}
                placeholder="Enter New Password"
                className="app-password-input w-full px-4 py-2 pr-11 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 cursor-pointer z-10"
                onClick={() => setShowNew(!showNew)}
                aria-label={showNew ? "Hide password" : "Show password"}
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <label className="block text-sm font-medium mb-1">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative mb-4">
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter New Password"
                className="app-password-input w-full px-4 py-2 pr-11 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 cursor-pointer z-10"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || sent}
              className={`w-full py-2 rounded-lg transition ${
                sent
                  ? "bg-green-600 text-white"
                  : "bg-[#0d2a47] text-white hover:bg-[#143d65]"
              }`}
            >
              {loading
                ? "Processing..."
                : sent
                ? "Password Changed ✅"
                : "Reset Password"}
            </button>

            <div className="text-center mt-4">
              <a
                onClick={() => navigate("/")}
                className="text-blue-600 text-sm hover:underline cursor-pointer"
              >
                Back to Log In
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
