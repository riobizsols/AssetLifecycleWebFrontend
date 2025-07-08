import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../lib/axios";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false); // Track if email was sent

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setSent(false);

    try {
      const res = await API.post("/auth/forgot-password", { email });
      setMessage(res.data.message || "Reset link sent to your email.");
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
          <h2 className="text-2xl font-semibold mb-2">Forgot your password?</h2>
          <p className="text-gray-600 text-sm mb-6">
            Please enter your email address and we’ll send you a password reset
            link
          </p>

          {/* ✅ Success & Error messages */}
          {message && <p className="text-green-600 mb-4">{message}</p>}
          {error && <p className="text-red-600 mb-4">{error}</p>}

          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="Enter your mail address"
              className="w-full px-4 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

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
                ? "Sending Link..."
                : sent
                ? "Link Sent ✅"
                : "Request Reset Link"}
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

export default ForgotPassword;
