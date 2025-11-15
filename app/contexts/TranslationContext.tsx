"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import translations from "@/app/lib/translations";

type LanguageCode = keyof typeof translations;
type TranslationValue = string | { [key: string]: TranslationValue };

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

const getInitialLanguage = (): LanguageCode => {
    if (typeof window === "undefined") {
        return "en";
    }

    const storedLanguage = window.localStorage.getItem("languageId") as LanguageCode | null;
    if (storedLanguage && translations[storedLanguage]) {
        return storedLanguage;
    }

    return "en";
};

const getNestedValue = (
    obj: TranslationValue | undefined,
    keys: string[]
): string | null => {
    let value: TranslationValue | undefined = obj;

    for (const key of keys) {
        if (value && typeof value === "object" && key in value) {
            value = (value as Record<string, TranslationValue>)[key];
        } else {
            return null;
        }
    }

    return typeof value === "string" ? value : null;
};

export function TranslationProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<LanguageCode>(() => getInitialLanguage());

    const setLanguage = (lang: LanguageCode) => {
        setLanguageState(lang);
        if (typeof window !== "undefined") {
            localStorage.setItem("languageId", lang);
        }
    };

    const t = (key: string): string => {
        const keys = key.split(".");
        const currentLanguageValue = getNestedValue(translations[language] || translations.en, keys);
        if (currentLanguageValue !== null) {
            return currentLanguageValue;
        }

        const fallbackValue = getNestedValue(translations.en, keys);
        return fallbackValue ?? key;
    };

    return (
        <TranslationContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </TranslationContext.Provider>
    );
}

