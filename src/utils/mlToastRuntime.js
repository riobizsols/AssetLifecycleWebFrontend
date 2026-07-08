import { toast } from "react-hot-toast";
import i18n from "../i18n/config";
import { getTextMessageById } from "../services/textMessagesService.js";
import { translateErrorMessage } from "./errorTranslation.js";

let isPatched = false;

const PUBLIC_ML_SKIP_PATHS = new Set([
  "/",
  "/login",
  "/tenant-setup",
  "/setup",
  "/forgot-password",
  "/reset-password",
]);

const normalizePath = (pathname) => {
  const path = String(pathname || "/").replace(/\/+$/, "") || "/";
  return path;
};

const isPublicMlPage = () => {
  if (typeof window === "undefined") return false;
  return PUBLIC_ML_SKIP_PATHS.has(normalizePath(window.location.pathname));
};

const toSlug = (text) =>
  String(text || "")
    .replace(/\$\{[^}]+\}/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .toUpperCase();

const hashString = (input) => {
  let hash = 0;
  const str = String(input || "");
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(8, "0").slice(0, 8);
};

export const getTmdIdForToastText = (message) => {
  const slug = toSlug(message) || "MESSAGE";
  const shortSlug = slug.slice(0, 52);
  return `TMD_${shortSlug}_${hashString(message)}`;
};

/** Unpatched toast helpers for public flows (tenant setup, login, etc.). */
export const rawToast = {
  success: null,
  error: null,
};

export const installMlToastRuntime = () => {
  if (isPatched) return;
  isPatched = true;

  const originalSuccess = toast.success.bind(toast);
  const originalError = toast.error.bind(toast);
  rawToast.success = originalSuccess;
  rawToast.error = originalError;

  const resolveAndShow = async (originalFn, message, options) => {
    const { skipMlResolve, ...toastOptions } = options || {};

    if (skipMlResolve || isPublicMlPage()) {
      return originalFn(message, toastOptions);
    }

    if (typeof message !== "string" || !message.trim()) {
      return originalFn(message, toastOptions);
    }

    const selectedLang = String(localStorage.getItem("selectedLanguage") || "").toLowerCase();
    const currentLang = String(selectedLang || i18n?.language || "en").toLowerCase();
    const localizedFallback = translateErrorMessage(message);
    const fallbackText =
      !currentLang.startsWith("en") && localizedFallback !== message
        ? localizedFallback
        : message;

    const tmdId = getTmdIdForToastText(message);
    const resolvedText = await getTextMessageById(tmdId, fallbackText);
    return originalFn(resolvedText, toastOptions);
  };

  toast.success = (message, options) => {
    resolveAndShow(originalSuccess, message, options);
    return undefined;
  };

  toast.error = (message, options) => {
    resolveAndShow(originalError, message, options);
    return undefined;
  };
};
