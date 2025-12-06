import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, LogOut } from "lucide-react";
import API from "../../lib/axios";
import { useAuthStore } from "../../store/useAuthStore";
import { useAuditLog } from "../../hooks/useAuditLog";
import { AUTH_APP_IDS } from "../../constants/authAuditEvents";

const ChangePassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, clearPasswordChangeRequirement } = useAuthStore();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  // Audit logging for change password
  const { recordActionByNameWithFetch } = useAuditLog(AUTH_APP_IDS.RESETPASSWORD);

  // Prevent back navigation
  useEffect(() => {
    const handlePopState = (e) => {
      // Prevent going back
      window.history.pushState(null, '', location.pathname);
    };

    // Push current state to prevent back navigation
    window.history.pushState(null, '', location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
    setMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    // Validation
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      return setError("All fields are required");
    }

    if (form.newPassword !== form.confirmPassword) {
      return setError("New password and confirm password do not match");
    }

    if (form.newPassword.length < 6) {
      return setError("New password must be at least 6 characters long");
    }

    if (form.currentPassword === form.newPassword) {
      return setError("New password must be different from current password");
    }

    setLoading(true);
    try {
      const res = await API.put("/auth/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      setMessage(res.data.message || "Password changed successfully.");
      setSuccess(true);

      // Clear the password change requirement flag
      if (clearPasswordChangeRequirement) {
        clearPasswordChangeRequirement();
      }

      // Log audit event for successful password change
      await recordActionByNameWithFetch('Change Password', {
        action: 'Password Changed Successfully',
        userId: user?.user_id,
        userEmail: user?.email,
      });

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to change password. Please try again."
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
          <h2 className="text-2xl font-semibold mb-2">Change Password</h2>
          <p className="text-gray-600 text-sm mb-6">
            Your password is set to the default password. Please change it to secure your account.
          </p>

          {message && <p className="text-green-600 mb-4">{message}</p>}
          {error && <p className="text-red-600 mb-4">{error}</p>}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Current Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  name="currentPassword"
                  placeholder="Enter Current Password"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.currentPassword}
                  onChange={handleChange}
                  required
                />
                <span
                  className="absolute right-3 top-2.5 cursor-pointer"
                  onClick={() => setShowCurrent(!showCurrent)}
                >
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  name="newPassword"
                  placeholder="Enter New Password"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.newPassword}
                  onChange={handleChange}
                  required
                />
                <span
                  className="absolute right-3 top-2.5 cursor-pointer"
                  onClick={() => setShowNew(!showNew)}
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Re-enter New Password"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <span
                  className="absolute right-3 top-2.5 cursor-pointer"
                  onClick={() => setShowConfirm(!showConfirm)}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className={`w-full py-2 rounded-lg transition ${
                success
                  ? "bg-green-600 text-white"
                  : "bg-[#0d2a47] text-white hover:bg-[#143d65]"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading
                ? "Processing..."
                : success
                ? "Password Changed ✅"
                : "Change Password"}
            </button>
          </form>

          {/* Logout Button */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm transition"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;

