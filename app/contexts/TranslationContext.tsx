"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import translations from "@/lib/translations";

type LanguageCode = keyof typeof translations;

interface TranslationContextType {
    language: LanguageCode;
    setLanguage: (lang: LanguageCode) => void;
    t: (key: string) => string;
}

const TranslationContext = createContext<TranslationContextType>({
    language: "en",
    setLanguage: () => {},
    t: () => "",
});

export const useTranslation = () => useContext(TranslationContext);

export function TranslationProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<LanguageCode>("en");

    useEffect(() => {
        // Load language from localStorage
        const storedLanguage = localStorage.getItem("languageId") as LanguageCode | null;
        if (storedLanguage && translations[storedLanguage]) {
            setLanguageState(storedLanguage);
        }
    }, []);

    const setLanguage = (lang: LanguageCode) => {
        setLanguageState(lang);
        localStorage.setItem("languageId", lang);
    };

    const t = (key: string): string => {
        const keys = key.split(".");
        let value: any = translations[language] || translations.en;

        // Try to get value from current language
        for (const k of keys) {
            if (value && typeof value === "object" && k in value) {
                value = value[k];
            } else {
                // Fallback to English if translation not found
                value = translations.en;
                for (const fallbackKey of keys) {
                    if (value && typeof value === "object" && fallbackKey in value) {
                        value = value[fallbackKey];
                    } else {
                        return key; // Return key if translation not found
                    }
                }
                return typeof value === "string" ? value : key;
            }
        }

        return typeof value === "string" ? value : key;
    };

    return (
        <TranslationContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </TranslationContext.Provider>
    );
}

