import { useTranslation } from 'react-i18next';

import { SUPPORTED_LANGUAGES, changeLanguage } from '../../i18n/i18n.ts';

/**
 * A compact FR / NL switch. The chosen language is applied immediately and
 * persisted to localStorage (see {@link changeLanguage}).
 */
export function LanguageToggle() {
  const { i18n, t } = useTranslation();

  return (
    <div
      className="language-toggle"
      role="group"
      aria-label={t('language.label')}
    >
      {SUPPORTED_LANGUAGES.map((language) => (
        <button
          key={language}
          type="button"
          className={`language-option ${i18n.language === language ? 'language-active' : ''}`}
          aria-pressed={i18n.language === language}
          onClick={() => changeLanguage(language)}
        >
          {language.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
