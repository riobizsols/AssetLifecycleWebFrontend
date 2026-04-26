import { toast } from "react-hot-toast";
import { getTextMessageById } from "../services/textMessagesService.js";

let isPatched = false;

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

export const installMlToastRuntime = () => {
  if (isPatched) return;
  isPatched = true;

  const originalSuccess = toast.success.bind(toast);
  const originalError = toast.error.bind(toast);

  const resolveAndShow = async (originalFn, message, options) => {
    if (typeof message !== "string" || !message.trim()) {
      return originalFn(message, options);
    }

    const tmdId = getTmdIdForToastText(message);
    const resolvedText = await getTextMessageById(tmdId, message);
    return originalFn(resolvedText, options);
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

