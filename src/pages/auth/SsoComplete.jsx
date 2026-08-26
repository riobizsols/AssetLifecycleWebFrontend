import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { useNavigationStore } from "../../store/useNavigationStore";

function decodeBase64UrlJson(payload) {
  const pad = "=".repeat((4 - (payload.length % 4)) % 4);
  const b64 = (payload + pad).replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(
    Array.from(atob(b64), (c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`).join("")
  );
  return JSON.parse(json);
}

/**
 * Landing page after Zoho SSO: receives session payload, stores auth, goes to dashboard.
 * Password login and tenant-setup are unchanged.
 */
export default function SsoComplete() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const err = searchParams.get("error") || searchParams.get("sso_error");
        if (err) {
          setError(err);
          return;
        }

        const payload = searchParams.get("payload");
        if (!payload) {
          setError("Missing SSO session. Please sign in again.");
          return;
        }

        const data = decodeBase64UrlJson(payload);
        if (!data?.token || !data?.user) {
          setError("Invalid SSO session payload.");
          return;
        }

        if (cancelled) return;

        login({
          ...data.user,
          token: data.token,
          requiresPasswordChange: Boolean(data.requiresPasswordChange),
        });

        await useNavigationStore.getState().fetchNavigation(data.user?.user_id, { force: true });

        if (cancelled) return;

        if (data.requiresPasswordChange) {
          navigate("/change-password", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } catch (e) {
        console.error("[SsoComplete]", e);
        if (!cancelled) {
          setError("Could not complete Zoho sign-in. Try again or use email/password.");
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [searchParams, login, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="max-w-md w-full bg-white shadow rounded p-6 space-y-4">
          <h1 className="text-xl font-semibold text-[#0E2F4B]">Sign-in problem</h1>
          <p className="text-red-600 text-sm">{error}</p>
          <button
            type="button"
            className="w-full bg-[#0E2F4B] text-white py-2 rounded"
            onClick={() => navigate("/login", { replace: true })}
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="text-[#0E2F4B] font-medium">Completing Zoho sign-in…</div>
    </div>
  );
}
