import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../lib/axios";
import { useAuthStore } from "../../store/useAuthStore";
import { Eye, EyeOff } from "lucide-react";
import { useAuditLog } from "../../hooks/useAuditLog";
import { AUTH_APP_IDS } from "../../constants/authAuditEvents";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuthStore();
  
  // Audit logging for login
  const { recordActionByNameWithFetch } = useAuditLog(AUTH_APP_IDS.LOGIN);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await API.post("/auth/login", form);

      const { token, user } = res.data;

      // Store user + token in Zustand
      login({ ...user, token });

      // Log audit event for successful login
      await recordActionByNameWithFetch('Logging In', { 
        action: 'User Logged In Successfully',
        userId: user?.user_id,
        userEmail: user?.email,
        userRole: user?.job_role_id
      });

      // Redirect to dashboard
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex min-h-screen">
      {/* Left section */}
      <div className="hidden md:flex w-1/2 bg-[#0E2F4B] items-center justify-center">
        <img src="/logo.png" alt="Logo" className="w-48 h-auto" />
      </div>

      {/* Right section */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-6 text-black">
            Welcome back !
          </h2>

          {error && <p className="text-red-600 mb-4">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-700"
              >
                Email<span className="text-red-600">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="Enter your mail address"
                value={form.email}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-2 border rounded-md shadow-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-700"
              >
                Password<span className="text-red-600"> *</span>
              </label>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={show ? "text" : "password"}
                  required
                  placeholder="Enter password"
                  value={form.password}
                  onChange={handleChange}
                  className="mt-1 w-full px-3 py-2 pr-10 border rounded-md shadow-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
                />

                <span
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 cursor-pointer"
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </span>
              </div>
            </div>

            <div
              className="flex justify-end text-sm"
              onClick={() => navigate("/forgot-password")}
            >
              <button type="button" className="text-[#0E2F4B] hover:underline">
                Forgot your password ?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0E2F4B] text-white py-2 rounded-md hover:bg-[#123b5d] transition"
            >
              {loading ? "Logging in..." : "Log In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
