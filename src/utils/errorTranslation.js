import i18n from '../i18n/config';
import { getTextMessageById } from "../services/textMessagesService";

/**
 * Translate common error messages from backend
 * This function checks if an error message matches known patterns and translates them
 */
export const translateErrorMessage = (errorMessage) => {
  if (!errorMessage || typeof errorMessage !== 'string') {
    return errorMessage;
  }

  // Common error message patterns to translate
  const errorPatterns = [
    {
      pattern: /one or more assets are currently assigned to employees/i,
      translationKey: 'assets.assetsAssignedToEmployees'
    },
    {
      pattern: /asset .* cannot be deleted because it is currently assigned/i,
      translationKey: 'assets.assetCannotBeDeleted'
    },
    {
      pattern: /required fields missing/i,
      translationKey: 'assets.requiredFieldsMissing'
    },
    {
      pattern: /failed to fetch assets/i,
      translationKey: 'assets.failedToFetchAssets'
    },
    {
      pattern: /failed to delete asset/i,
      translationKey: 'assets.failedToDeleteAsset'
    },
    {
      pattern: /null value in column "buyer_company".*not-null constraint/i,
      translationKey: 'scrapSales.companyNameRequired'
    },
    {
      pattern: /company name is required/i,
      translationKey: 'scrapSales.companyNameRequired'
    },
    {
      pattern: /similar name already exists/i,
      translationKey: 'assetTypes.similarAssetTypeNameExistsGeneric'
    },
    {
      pattern: /similar asset name exists/i,
      translationKey: 'assets.similarAssetNameExistsGeneric'
    },
    {
      pattern: /server error\. please try again later/i,
      translationKey: 'createScrapAsset.serverErrorPleaseTryAgainLater'
    },
    {
      pattern: /failed to create scrap request/i,
      translationKey: 'createScrapAsset.failedToCreateScrapRequest'
    },
    {
      pattern: /scrap workflow sequence is not configured/i,
      translationKey: 'createScrapAsset.scrapWorkflowNotConfigured'
    },
    {
      pattern: /already scrapped/i,
      translationKey: 'createScrapAsset.assetsAlreadyScrapped'
    },
    {
      pattern: /^asset created successfully!?$/i,
      translationKey: 'assets.assetCreatedSuccessfully'
    },
    {
      pattern: /^inspection updated successfully!?$/i,
      translationKey: 'inspectionExecution.updatedSuccessfully'
    },
    {
      pattern: /^value saved locally\. click save to persist all values\.?$/i,
      translationKey: 'inspectionExecution.valueSavedLocally'
    },
    {
      pattern: /^inspection created successfully!?$/i,
      translationKey: 'inspectionView.inspectionCreatedSuccessfully'
    },
    {
      pattern: /no inspection frequency configured for this asset type/i,
      translationKey: 'inspectionView.noInspectionFrequencyConfigured'
    },
    {
      pattern: /this asset type is already mapped to this department/i,
      translationKey: 'departments.assetTypeAlreadyMappedToDepartment'
    }
  ];

  // Check each pattern
  for (const { pattern, translationKey } of errorPatterns) {
    if (pattern.test(errorMessage)) {
      return i18n.t(translationKey);
    }
  }

  // Return original message if no pattern matches
  return errorMessage;
};

/**
 * Enhanced toast error function that translates common error messages
 */
export const showTranslatedError = (toast, errorMessage) => {
  const translatedMessage = translateErrorMessage(errorMessage);
  toast.error(translatedMessage);
};

/**
 * Enhanced toast success function for consistency
 */
export const showTranslatedSuccess = (toast, successMessage, translationKey = null) => {
  const message = translationKey ? i18n.t(translationKey) : successMessage;
  toast.success(message);
};

/**
 * Resolve toast/popup text from backend multilingual tables by tmd_id.
 * Falls back to the provided text if lookup fails.
 */
export const resolveBackendTextMessage = async (tmdId, fallbackText = "") => {
  return getTextMessageById(tmdId, fallbackText);
};

const interpolateTemplate = (message, values = {}) => {
  if (!message || typeof message !== "string") return message;
  return message.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const value = values[key];
    return value === undefined || value === null ? "" : String(value);
  });
};

/** DB templates use {{placeholders}}; without values they produce empty toasts. */
const hasUnresolvedTemplateTokens = (message) =>
  typeof message === "string" && /\{\{\s*[\w.]+\s*\}\}/.test(message);

const looksLikeFailedInterpolation = (message, referenceMessage = "") => {
  if (!message || typeof message !== "string") return true;
  if (hasUnresolvedTemplateTokens(message)) return true;

  const trimmed = message.trim();
  if (/:\s*$/.test(trimmed)) return true;
  if (/""/.test(message) && referenceMessage && !/""/.test(referenceMessage)) return true;
  if (/\(\s*\)/.test(message) && referenceMessage && !/\(\s*\)/.test(referenceMessage)) {
    return true;
  }

  return false;
};

/** Generic DB toast text should not replace a more specific API error. */
const shouldKeepSpecificErrorFallback = (resolvedMessage, fallbackMessage) => {
  if (!resolvedMessage || !fallbackMessage || resolvedMessage === fallbackMessage) {
    return false;
  }
  const specificPattern =
    /already exists|is required|required\.|violates|duplicate|not found|invalid/i;
  if (specificPattern.test(fallbackMessage) && !specificPattern.test(resolvedMessage)) {
    return true;
  }
  if (
    /^failed to /i.test(resolvedMessage) &&
    fallbackMessage.length > resolvedMessage.length + 8
  ) {
    return true;
  }
  return false;
};

/**
 * Show multilingual toast text by tmd_id.
 * type can be: success | error | loading | default
 */
export const showBackendTextToast = ({
  toast,
  tmdId,
  fallbackText = "",
  type = "default",
  values = {},
  toastOptions = {},
}) => {
  const rawFallbackMessage = interpolateTemplate(String(fallbackText || ""), values);
  const fallbackMessage =
    type === "error" ? translateErrorMessage(rawFallbackMessage) : rawFallbackMessage;
  const hasFallbackMessage = Boolean(String(fallbackMessage || "").trim());
  const selectedLang = String(localStorage.getItem("selectedLanguage") || "").toLowerCase();
  const currentLang = String(selectedLang || i18n?.language || "en").toLowerCase();
  const isEnglish = currentLang.startsWith("en");

  const showByType = (message, options = {}) => {
    const resolvedOptions = { ...options, skipMlResolve: true };
    if (type === "success") return toast.success(message, resolvedOptions);
    if (type === "error") return toast.error(message, resolvedOptions);
    if (type === "loading") return toast.loading(message, resolvedOptions);
    return toast(message, resolvedOptions);
  };

  let toastId = null;
  let fallbackShown = false;
  let fallbackTimer = null;

  // Show localized fallback immediately so non-English users never see English first.
  if (hasFallbackMessage) {
    toastId = showByType(fallbackMessage, toastOptions);
    fallbackShown = true;
  }

  // Resolve DB text in background; only replace when it matches the active language.
  resolveBackendTextMessage(tmdId, fallbackMessage)
    .then((rawMessage) => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      const rawResolvedMessage = interpolateTemplate(rawMessage, values);
      const resolvedMessage =
        type === "error"
          ? translateErrorMessage(rawResolvedMessage)
          : rawResolvedMessage;
      if (!resolvedMessage) return;

      const shouldKeepLocalizedFallback =
        !isEnglish &&
        resolvedMessage !== fallbackMessage &&
        translateErrorMessage(resolvedMessage) !== resolvedMessage;

      if (shouldKeepLocalizedFallback) {
        return;
      }

      if (looksLikeFailedInterpolation(resolvedMessage, fallbackMessage)) {
        return;
      }

      if (
        type === "error" &&
        shouldKeepSpecificErrorFallback(resolvedMessage, fallbackMessage)
      ) {
        return;
      }

      if (fallbackShown) {
        if (resolvedMessage !== fallbackMessage) {
          showByType(resolvedMessage, { ...toastOptions, id: toastId });
        }
      } else {
        toastId = showByType(resolvedMessage, toastOptions);
        fallbackShown = true;
      }
    })
    .catch(() => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      // Keep fallback toast; no-op on lookup failures.
      if (!fallbackShown && hasFallbackMessage) {
        toastId = showByType(fallbackMessage, toastOptions);
        fallbackShown = true;
      }
    });

  return toastId;
};
