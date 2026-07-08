import API from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";

const messageCache = new Map();

export const clearTextMessageCache = () => {
  messageCache.clear();
};

export const getTextMessageById = async (tmdId, fallbackText = "") => {
  const key = String(tmdId || "").trim();
  if (!key) return fallbackText;

  const userLang = String(useAuthStore.getState()?.user?.language_code || "").toLowerCase();
  const selectedLang = String(localStorage.getItem("selectedLanguage") || "").toLowerCase();
  const activeLang = selectedLang || userLang || "en";
  const cacheKey = `${activeLang}::${key}`;

  try {
    const res = await API.get(
      `/text-messages/${encodeURIComponent(key)}?lang=${encodeURIComponent(activeLang)}`,
      { skipAuthRedirect: true },
    );
    const payload = res?.data?.data || {};
    const text = payload?.text;
    const resolvedLangCode = String(payload?.lang_code || "").toLowerCase();
    const requestedLangCode = String(payload?.requested_lang_code || activeLang).toLowerCase();
    const isNonEnglishActiveLang = !activeLang.startsWith("en");
    const isBackendFallbackToEnglish =
      resolvedLangCode === "en" && !requestedLangCode.startsWith("en");

    // If UI is non-English but backend resolves to English, prefer local fallback text
    // so translated i18n messages remain visible (e.g., German success toasts).
    const shouldUseFallbackText =
      isNonEnglishActiveLang &&
      isBackendFallbackToEnglish &&
      typeof fallbackText === "string" &&
      fallbackText.trim();

    const resolvedText = shouldUseFallbackText
      ? fallbackText
      : (typeof text === "string" && text.trim() ? text : fallbackText);
    messageCache.set(cacheKey, resolvedText);
    return resolvedText;
  } catch (error) {
    return fallbackText;
  }
};

