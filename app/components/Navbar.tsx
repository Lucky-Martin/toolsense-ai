"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/app/contexts/TranslationContext";

type LanguageCode = "en" | "zh" | "es" | "hi" | "ar" | "pt" | "bn" | "ru" | "ja" | "pa" | "de" | "jv" | "ko" | "fr" | "te" | "vi" | "it" | "tr" | "pl" | "uk" | "fi" | "th" | "nl" | "el" | "cs" | "sv" | "ro" | "hu" | "id" | "ms";

interface LanguageOption {
    code: LanguageCode;
    name: string;
    flagUrl: string;
}

export default function Navbar() {
    const { language, setLanguage, t } = useTranslation();
    const pathname = usePathname();
    const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(language);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Hide logo link on chat page
    const isChatPage = pathname === "/chat";

    const languages: LanguageOption[] = [
        { code: "en", name: "English", flagUrl: "/flags/gb.png" },
        { code: "zh", name: "Chinese", flagUrl: "/flags/cn.png" },
        { code: "es", name: "Spanish", flagUrl: "/flags/es.png" },
        { code: "hi", name: "Hindi", flagUrl: "/flags/in.png" },
        { code: "ar", name: "Arabic", flagUrl: "/flags/sa.png" },
        { code: "pt", name: "Portuguese", flagUrl: "/flags/pt.png" },
        { code: "bn", name: "Bengali", flagUrl: "/flags/bd.png" },
        { code: "ru", name: "Russian", flagUrl: "/flags/ru.png" },
        { code: "ja", name: "Japanese", flagUrl: "/flags/jp.png" },
        { code: "pa", name: "Punjabi", flagUrl: "/flags/in.png" },
        { code: "de", name: "German", flagUrl: "/flags/de.png" },
        { code: "jv", name: "Javanese", flagUrl: "/flags/id.png" },
        { code: "ko", name: "Korean", flagUrl: "/flags/kr.png" },
        { code: "fr", name: "French", flagUrl: "/flags/fr.png" },
        { code: "te", name: "Telugu", flagUrl: "/flags/in.png" },
        { code: "vi", name: "Vietnamese", flagUrl: "/flags/vn.png" },
        { code: "it", name: "Italian", flagUrl: "/flags/it.png" },
        { code: "tr", name: "Turkish", flagUrl: "/flags/tr.png" },
        { code: "pl", name: "Polish", flagUrl: "/flags/pl.png" },
        { code: "uk", name: "Ukrainian", flagUrl: "/flags/ua.png" },
        { code: "fi", name: "Finnish", flagUrl: "/flags/fi.png" },
        { code: "th", name: "Thai", flagUrl: "/flags/th.png" },
        { code: "nl", name: "Dutch", flagUrl: "/flags/nl.png" },
        { code: "el", name: "Greek", flagUrl: "/flags/gr.png" },
        { code: "cs", name: "Czech", flagUrl: "/flags/cz.png" },
        { code: "sv", name: "Swedish", flagUrl: "/flags/se.png" },
        { code: "ro", name: "Romanian", flagUrl: "/flags/ro.png" },
        { code: "hu", name: "Hungarian", flagUrl: "/flags/hu.png" },
        { code: "id", name: "Indonesian", flagUrl: "/flags/id.png" },
        { code: "ms", name: "Malay", flagUrl: "/flags/my.png" },
    ];

    const getCurrentLanguage = () => {
        return languages.find(lang => lang.code === selectedLanguage) || languages[0];
    };

    const filteredLanguages = languages.filter(language =>
        language.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        language.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Clear search query when dropdown closes
    useEffect(() => {
        if (!isDropdownOpen) {
            setSearchQuery("");
        }
    }, [isDropdownOpen]);

    // Sync selectedLanguage with translation context language
    useEffect(() => {
        setSelectedLanguage(language);
    }, [language]);

    // Save language to localStorage when it changes
    const handleLanguageChange = (code: LanguageCode) => {
        setSelectedLanguage(code);
        setLanguage(code);
        setIsDropdownOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // On chat page, only show language picker positioned on the right
    if (isChatPage) {
        return (
            <div className="fixed top-4 right-4 z-50">
                <div ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors cursor-pointer outline-none focus:outline-none focus-visible:outline-none shadow-md"
                        style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        <Image
                            src={getCurrentLanguage().flagUrl}
                            alt={getCurrentLanguage().name}
                            width={20}
                            height={16}
                            className="w-5 h-4 object-cover rounded-sm"
                        />
                        <span className="font-medium">{getCurrentLanguage().name}</span>
                        <svg
                            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""
                                }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl z-30">
                            {/* Search Input */}
                            <div className="p-2">
                                <div className="relative">
                                    <svg
                                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                        />
                                    </svg>
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={t("navbar.searchLanguages")}
                                        className="w-full pl-10 pr-3 py-2 text-sm text-gray-700 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 transition-all"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </div>

                            {/* Language List */}
                            <div className="py-0.5 max-h-[180px] overflow-y-auto">
                                {filteredLanguages.length > 0 ? (
                                    filteredLanguages.map((language) => (
                                        <button
                                            key={language.code}
                                            type="button"
                                            onClick={() => handleLanguageChange(language.code)}
                                            className={`w-full text-left px-3 py-1.5 text-sm transition-colors cursor-pointer outline-none focus:outline-none flex items-center gap-1.5 ${selectedLanguage === language.code
                                                ? "bg-gray-100 text-gray-900 font-medium"
                                                : "text-gray-700 hover:bg-gray-50"
                                                }`}
                                            style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                                            onMouseDown={(e) => e.preventDefault()}
                                        >
                                            <Image
                                                src={language.flagUrl}
                                                alt={language.name}
                                                width={16}
                                                height={12}
                                                className="w-4 h-3 object-cover rounded-sm"
                                            />
                                            <span className="font-medium">{language.name}</span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                        {t("navbar.noLanguagesFound")}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // On other pages, show full navbar with logo and language picker
    return (
        <div className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between">
            <div ref={dropdownRef}>
                <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors cursor-pointer outline-none focus:outline-none focus-visible:outline-none shadow-md"
                    style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <Image
                        src={getCurrentLanguage().flagUrl}
                        alt={getCurrentLanguage().name}
                        width={20}
                        height={16}
                        className="w-5 h-4 object-cover rounded-sm"
                    />
                    <span className="font-medium">{getCurrentLanguage().name}</span>
                    <svg
                        className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""
                            }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                        />
                    </svg>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl z-30">
                        {/* Search Input */}
                        <div className="p-2">
                            <div className="relative">
                                <svg
                                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t("navbar.searchLanguages")}
                                    className="w-full pl-10 pr-3 py-2 text-sm text-gray-700 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 transition-all"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>

                        {/* Language List */}
                        <div className="py-0.5 max-h-[180px] overflow-y-auto">
                            {filteredLanguages.length > 0 ? (
                                filteredLanguages.map((language) => (
                                    <button
                                        key={language.code}
                                        type="button"
                                        onClick={() => handleLanguageChange(language.code)}
                                        className={`w-full text-left px-3 py-1.5 text-sm transition-colors cursor-pointer outline-none focus:outline-none flex items-center gap-1.5 ${selectedLanguage === language.code
                                            ? "bg-gray-100 text-gray-900 font-medium"
                                            : "text-gray-700 hover:bg-gray-50"
                                            }`}
                                        style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                                        onMouseDown={(e) => e.preventDefault()}
                                    >
                                        <Image
                                            src={language.flagUrl}
                                            alt={language.name}
                                            width={16}
                                            height={12}
                                            className="w-4 h-3 object-cover rounded-sm"
                                        />
                                        <span className="font-medium">{language.name}</span>
                                    </button>
                                ))
                            ) : (
                                <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                    {t("navbar.noLanguagesFound")}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
