import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import en from "./en/translation.json";
import ja from "./ja/translation.json";

export const supportedLangCodes = ["en", "ja"];
export type LangCode = (typeof supportedLangCodes)[number];

const resources = {
  en: {
    translation: en,
  },
  ja: {
    translation: ja,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: supportedLangCodes,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
