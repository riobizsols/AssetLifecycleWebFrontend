import i18n from '../i18n/config';

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
