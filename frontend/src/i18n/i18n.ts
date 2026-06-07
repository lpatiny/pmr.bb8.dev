import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { fr } from './locales/fr.ts';
import { nl } from './locales/nl.ts';

/** localStorage key under which the chosen language is persisted. */
export const LANGUAGE_STORAGE_KEY = 'pmr-language';

/** The languages the app can be displayed in. */
export const SUPPORTED_LANGUAGES = ['fr', 'nl'] as const;

/** A supported UI language code. */
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

const FALLBACK_LANGUAGE: Language = 'fr';

function isLanguage(value: string | null): value is Language {
  return value === 'fr' || value === 'nl';
}

function storedLanguage(): Language {
  const value = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isLanguage(value) ? value : FALLBACK_LANGUAGE;
}

const i18n = createInstance();

await i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    nl: { translation: nl },
  },
  lng: storedLanguage(),
  fallbackLng: FALLBACK_LANGUAGE,
  interpolation: { escapeValue: false },
});

document.documentElement.lang = i18n.language;

/**
 * Switch the UI language, persist the choice to localStorage and update the
 * document `lang` attribute.
 * @param language - The language to switch to.
 */
export function changeLanguage(language: Language): void {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  void i18n.changeLanguage(language);
  document.documentElement.lang = language;
}

export default i18n;
