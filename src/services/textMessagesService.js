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
    const res = await API.get(`/text-messages/${encodeURIComponent(key)}`);
    const text = res?.data?.data?.text;
    const resolvedText = typeof text === "string" && text.trim() ? text : fallbackText;
    messageCache.set(cacheKey, resolvedText);
    return resolvedText;
  } catch (error) {
    return fallbackText;
  }
};

