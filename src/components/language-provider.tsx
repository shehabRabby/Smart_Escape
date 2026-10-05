"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { MotionConfig, motion, useReducedMotion } from "motion/react";
import type { Language, TranslationKey } from "@/lib/translations";
import { localizeError, translate } from "@/lib/translations";

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  errorText: (error: string) => string;
}
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  return <LanguageContext.Provider value={{ language, setLanguage, t: (key, values) => translate(language, key, values), errorText: error => localizeError(error, language) }}>
    <MotionConfig reducedMotion="user" transition={{ duration: .18, ease: "easeOut" }}>{children}</MotionConfig>
  </LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("LanguageProvider is required.");
  return context;
}

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  const reduced = useReducedMotion();
  return <div className="language-switcher" role="group" aria-label={t("language")}>
    {(["en", "bn"] as const).map(value => <motion.button type="button" key={value} lang={value} data-language={value} aria-pressed={language === value}
      className={language === value ? "is-selected" : ""} onClick={() => setLanguage(value)} whileTap={reduced ? undefined : { scale: .98 }}>
      {value === "en" ? "English" : "বাংলা"}
    </motion.button>)}
  </div>;
}
