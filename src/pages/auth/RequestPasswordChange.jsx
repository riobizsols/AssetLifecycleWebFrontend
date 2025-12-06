import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../lib/axios";

const RequestPasswordChange = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setSent(false);

    if (!email) {
      setError("Email is required");
      setLoading(false);
      return;
    }

    try {
      // Use the existing forgot-password API to send reset link
      const res = await API.post("/auth/forgot-password", { email });
      setMessage(res.data.message || "Password change link sent to your email.");
      setSent(true);
    } catch (err) {
      setError(
        err.response?.data?.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Side: Logo */}
      <div className="hidden md:flex w-1/2 bg-[#0E2F4B] items-center justify-center">
        <img src="/logo.png" alt="Logo" className="w-48 h-auto" />
      </div>

      {/* Right Side: Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-2">Request Password Change</h2>
          <p className="text-gray-600 text-sm mb-6">
            Please enter your email address and we'll send you a password change link
          </p>

          {/* Success & Error messages */}
          {message && <p className="text-green-600 mb-4">{message}</p>}
          {error && <p className="text-red-600 mb-4">{error}</p>}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                Email Address <span className="text-red-600">*</span>
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-md shadow-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
              />
            </div>

            <button
              type="submit"
              disabled={loading || sent}
              className={`w-full py-2 rounded-md transition ${
                sent
                  ? "bg-green-600 text-white"
                  : "bg-[#0E2F4B] text-white hover:bg-[#123b5d]"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading
                ? "Sending..."
                : sent
                ? "Email Sent ✅"
                : "Send Password Change Link"}
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="text-[#0E2F4B] text-sm hover:underline"
              >
                Back to Log In
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RequestPasswordChange;

