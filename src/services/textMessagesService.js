import API from "../lib/axios";

const messageCache = new Map();

export const clearTextMessageCache = () => {
  messageCache.clear();
};

export const getTextMessageById = async (tmdId, fallbackText = "") => {
  const key = String(tmdId || "").trim();
  if (!key) return fallbackText;

  if (messageCache.has(key)) {
    return messageCache.get(key);
  }

  try {
    const res = await API.get(`/text-messages/${encodeURIComponent(key)}`);
    const text = res?.data?.data?.text;
    const resolvedText = typeof text === "string" && text.trim() ? text : fallbackText;
    messageCache.set(key, resolvedText);
    return resolvedText;
  } catch (error) {
    return fallbackText;
  }
};

