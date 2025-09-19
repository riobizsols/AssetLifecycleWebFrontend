# Multilingual Implementation Guide

This guide explains how to implement and extend multilingual support in the Asset Lifecycle Management application.

## Overview

The application now supports English and German languages using react-i18next library. The implementation includes:

- Language detection and persistence
- Dynamic language switching
- Comprehensive translation files
- Reusable components and contexts

## File Structure

```
src/
├── i18n/
│   ├── config.js                 # i18n configuration
│   └── locales/
│       ├── en.json              # English translations
│       └── de.json              # German translations
├── contexts/
│   └── LanguageContext.jsx     # Language context and provider
├── components/
│   └── LanguageSwitcher.jsx    # Language switcher component
└── ...
```

## Implementation Details

### 1. i18n Configuration (`src/i18n/config.js`)

The configuration sets up:
- Language detection from localStorage and browser
- Fallback to English
- React integration
- Debug mode for development

### 2. Language Context (`src/contexts/LanguageContext.jsx`)

Provides:
- `useLanguage()` hook for components
- Language switching functionality
- Available languages list
- Translation function (`t`)

### 3. Language Switcher (`src/components/LanguageSwitcher.jsx`)

A reusable component that:
- Displays current language with flag
- Shows dropdown with available languages
- Handles language switching
- Responsive design

### 4. Translation Files

#### Structure
```json
{
  "navigation": {
    "dashboard": "Dashboard",
    "assets": "Assets",
    // ...
  },
  "dashboard": {
    "title": "Dashboard",
    "totalAssets": "Total Assets",
    // ...
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    // ...
  }
}
```

#### Categories
- `navigation`: Menu items and navigation
- `dashboard`: Dashboard specific content
- `assets`: Asset management content
- `common`: Reusable common text
- `auth`: Authentication related text
- `validation`: Form validation messages
- `messages`: Success/error messages

## How to Use in Components

### 1. Import the Language Context

```jsx
import { useLanguage } from '../contexts/LanguageContext';
```

### 2. Use the Translation Function

```jsx
const MyComponent = () => {
  const { t } = useLanguage();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
};
```

### 3. Dynamic Values with Interpolation

```jsx
// Translation file
{
  "validation": {
    "maxLength": "Maximum {{max}} characters allowed"
  }
}

// Component
<p>{t('validation.maxLength', { max: 50 })}</p>
```

## Adding New Languages

### 1. Create Translation File

Create `src/i18n/locales/[language-code].json` with all translation keys.

### 2. Update i18n Config

Add the new language to `src/i18n/config.js`:

```javascript
import frTranslations from './locales/fr.json';

const resources = {
  en: { translation: enTranslations },
  de: { translation: deTranslations },
  fr: { translation: frTranslations }, // Add new language
};
```

### 3. Update Language Context

Add the new language to `getAvailableLanguages()` in `LanguageContext.jsx`:

```javascript
const getAvailableLanguages = () => {
  return [
    { code: 'en', name: t('language.english'), flag: '🇺🇸' },
    { code: 'de', name: t('language.german'), flag: '🇩🇪' },
    { code: 'fr', name: t('language.french'), flag: '🇫🇷' }, // Add new
  ];
};
```

## Translation Guidelines

### 1. Key Naming Convention

- Use nested objects for organization
- Use camelCase for keys
- Group related translations together
- Keep keys descriptive but concise

### 2. Text Guidelines

- Keep translations concise and clear
- Consider context when translating
- Use consistent terminology
- Test with longer German text for UI layout

### 3. Common Patterns

```jsx
// Simple text
{t('common.save')}

// With variables
{t('validation.maxLength', { max: 100 })}

// Conditional text
{loading ? t('common.loading') : t('common.submit')}

// Form labels with required indicator
{t('auth.email')}<span className="text-red-600">*</span>
```

## Components Already Implemented

### ✅ Completed
- **Header**: Page titles, user menu, logout button
- **Dashboard**: Metrics, card titles, common text
- **Login**: Form labels, buttons, placeholders
- **LanguageSwitcher**: Language selection component

### 🔄 Partially Implemented
- Various page titles in Header component

### ❌ To Do
- Asset management pages
- Maintenance pages
- Reports pages
- Settings pages
- Form validation messages
- Error messages
- Success notifications

## Next Steps for Full Implementation

### 1. Update Remaining Components

For each component:
1. Import `useLanguage` hook
2. Replace hardcoded text with `t('key')`
3. Add translation keys to JSON files
4. Test language switching

### 2. Handle Dynamic Content

For content from APIs:
- Consider backend multilingual support
- Implement client-side formatting for dates/numbers
- Handle mixed content (translated + dynamic)

### 3. Form Validation

Update form validation to use translated messages:

```jsx
const validationSchema = {
  email: {
    required: t('validation.required'),
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: t('validation.invalidEmail')
    }
  }
};
```

### 4. Toast Notifications

Update toast messages:

```jsx
toast.success(t('messages.saveSuccess'));
toast.error(t('messages.networkError'));
```

## Testing

### Manual Testing
1. Switch languages using the language switcher
2. Navigate through different pages
3. Check text wrapping with longer German text
4. Verify persistence after page reload

### Automated Testing
- Test translation key existence
- Test language switching functionality
- Test fallback behavior

## Performance Considerations

- Translation files are loaded once at startup
- Language switching is instant (no network requests)
- Consider lazy loading for additional languages
- Monitor bundle size with more languages

## Browser Support

- Modern browsers with localStorage support
- Fallback to English for unsupported scenarios
- Graceful degradation for missing translations

## Troubleshooting

### Common Issues

1. **Missing Translation Keys**
   - Check console for missing key warnings
   - Ensure key exists in both language files

2. **Language Not Switching**
   - Check localStorage for saved preference
   - Verify i18n configuration

3. **Layout Issues**
   - German text is typically 30% longer
   - Test responsive design with both languages
   - Adjust component widths if needed

### Debug Mode

Enable debug mode in development:

```javascript
// In src/i18n/config.js
debug: process.env.NODE_ENV === 'development',
```

This will log missing translations and other i18n events to the console.
