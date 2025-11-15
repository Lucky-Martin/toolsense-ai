"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTranslation } from "@/app/contexts/TranslationContext";
import { useAuth } from "@/app/contexts/AuthContext";
import { conversationService, Conversation } from "../services/conversations";

interface SidebarProps {
  currentConversationId: string | null;
  onNewConversation: () => void;
  onLoadConversation: (conversationId: string) => void;
}

const SIDEBAR_COLLAPSED_KEY = "sidebarCollapsed";

export default function Sidebar({
  currentConversationId,
  onNewConversation,
  onLoadConversation,
}: SidebarProps) {
  const { t, language, setLanguage } = useTranslation();
  const { signOut } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [languageSearchQuery, setLanguageSearchQuery] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const languageButtonRef = useRef<HTMLButtonElement>(null);
  const languageSearchInputRef = useRef<HTMLInputElement>(null);

  type LanguageCode = "en" | "zh" | "es" | "hi" | "ar" | "pt" | "bn" | "ru" | "ja" | "pa" | "de" | "jv" | "ko" | "fr" | "te" | "vi" | "it" | "tr" | "pl" | "uk" | "fi" | "th" | "nl" | "el" | "cs" | "sv" | "ro" | "hu" | "id" | "ms";

  interface LanguageOption {
    code: LanguageCode;
    name: string;
    flagUrl: string;
  }

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
    return languages.find(lang => lang.code === language) || languages[0];
  };

  const filteredLanguages = languages.filter(lang =>
    lang.name.toLowerCase().includes(languageSearchQuery.toLowerCase()) ||
    lang.code.toLowerCase().includes(languageSearchQuery.toLowerCase())
  );

  const handleLanguageChange = (code: LanguageCode) => {
    setLanguage(code);
    setIsLanguageDropdownOpen(false);
    setLanguageSearchQuery("");
  };

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isLanguageDropdownOpen && languageButtonRef.current) {
      const rect = languageButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom - 280, // Position above the button (300px max height + 20px margin)
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isLanguageDropdownOpen, isCollapsed]);

  // Close language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        languageDropdownRef.current &&
        !languageDropdownRef.current.contains(target) &&
        languageButtonRef.current &&
        !languageButtonRef.current.contains(target) &&
        !(target as Element).closest('[class*="z-[9999]"]')
      ) {
        setIsLanguageDropdownOpen(false);
      }
    };

    if (isLanguageDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isLanguageDropdownOpen]);

  // Clear search query when dropdown closes
  useEffect(() => {
    if (!isLanguageDropdownOpen) {
      setLanguageSearchQuery("");
    }
  }, [isLanguageDropdownOpen]);

  // Prevent body scroll when dialogs are open
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (showLogoutDialog || showDeleteDialog) {
      // Save the current overflow values
      const originalBodyOverflow = document.body.style.overflow || "";
      const originalHtmlOverflow = document.documentElement.style.overflow || "";
      const originalBodyPosition = document.body.style.position || "";

      // Set overflow hidden on both body and html for better mobile support
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      // Prevent scroll on iOS Safari
      document.body.style.position = "fixed";
      document.body.style.width = "100%";

      return () => {
        // Restore original overflow values when dialog closes
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.position = originalBodyPosition;
        document.body.style.width = "";
      };
    }
  }, [showLogoutDialog, showDeleteDialog]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const saved = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved !== null) {
      const nextCollapsed = saved !== "false";
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs localStorage with initial client render to avoid hydration mismatch
      setIsCollapsed(nextCollapsed);
    }
  }, []);

  // Helper function to format conversation title
  const formatTitle = (title: string, conversation: Conversation): string => {
    // Check if title already has "Report for" prefix (in various languages)
    const hasPrefix = title.includes("Report for") ||
      title.includes("报告：") ||
      title.includes("Informe para") ||
      title.includes("Rapport pour") ||
      title.includes("Rapport per") ||
      title.includes("Rapport voor") ||
      title.includes("Rapport för") ||
      title.includes("Rapport pentru") ||
      title.includes("Bericht für") ||
      title.includes("Отчет для") ||
      title.includes("Звіт для") ||
      title.includes("レポート：") ||
      title.includes("보고서:") ||
      title.includes("Rapporto per") ||
      title.includes("Raport dla") ||
      title.includes("Raport:") ||
      title.includes("รายงานสำหรับ") ||
      title.includes("Laporan untuk") ||
      title.includes("Laporan kanggo") ||
      title.includes("Báo cáo cho") ||
      title.includes("रिपोर्ट:") ||
      title.includes("রিপোর্ট:") ||
      title.includes("ਰਿਪੋਰਟ:") ||
      title.includes("రిపోర్ట్:") ||
      title.includes("Raportti:") ||
      title.includes("Jelentés:") ||
      title.includes("Zpráva pro") ||
      title.includes("Αναφορά για");

    if (hasPrefix) {
      return title;
    }

    // If no prefix, add it
    // Try to extract the query name from the title or use the first user message
    let queryName = title;
    if (conversation.messages.length > 0) {
      const firstUserMessage = conversation.messages.find((msg) => msg.role === "user");
      if (firstUserMessage) {
        queryName = firstUserMessage.content.substring(0, 50).trim() || title;
      }
    }

    return `${t("chatbot.reportFor")} ${queryName}`;
  };

  // Load conversations from storage and keep them in sync
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const loadConversations = () => {
      const loaded = conversationService.getAllConversations();
      setConversations(loaded);
    };

    // Initial load
    loadConversations();

    // Listen for storage changes (for cross-tab sync)
    const handleStorageChange = () => {
      loadConversations();
      // Also sync collapsed state
      const newSaved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      setIsCollapsed(newSaved !== "false");
    };

    // Listen for custom events (for same-tab updates)
    const handleCustomStorageChange = () => {
      loadConversations();
    };

    // Subscribe to conversation service changes
    const unsubscribe = conversationService.subscribe(loadConversations);

    // Listen for browser storage events (cross-tab sync)
    window.addEventListener("storage", handleStorageChange);

    // Listen for custom events (same-tab sync)
    const eventName = conversationService.getStorageEventName();
    window.addEventListener(eventName, handleCustomStorageChange);

    return () => {
      unsubscribe();
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(eventName, handleCustomStorageChange);
    };
  }, []);

  const handleDeleteConversation = (
    e: React.MouseEvent,
    conversationId: string
  ) => {
    e.stopPropagation();
    setConversationToDelete(conversationId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteConversation = () => {
    if (conversationToDelete) {
      conversationService.deleteConversation(conversationToDelete);
      setConversations(conversationService.getAllConversations());

      // If deleting current conversation, create a new one
      if (conversationToDelete === currentConversationId) {
        onNewConversation();
      }
    }
    setShowDeleteDialog(false);
    setConversationToDelete(null);
  };

  const toggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    if (typeof window !== "undefined") {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newCollapsed));
    }
  };

  // Check if screen is < 998px
  const isMobileScreen = () => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 998;
  };

  // Wrapper for new conversation that closes sidebar on mobile
  const handleNewConversationClick = () => {
    onNewConversation();
    if (isMobileScreen() && !isCollapsed) {
      setIsCollapsed(true);
      if (typeof window !== "undefined") {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "true");
      }
    }
  };

  // Wrapper for load conversation that closes sidebar on mobile
  const handleLoadConversationClick = (conversationId: string) => {
    onLoadConversation(conversationId);
    if (isMobileScreen() && !isCollapsed) {
      setIsCollapsed(true);
      if (typeof window !== "undefined") {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "true");
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("sidebar.justNow");
    if (diffMins < 60) return `${diffMins}${t("sidebar.minutesAgo")}`;
    if (diffHours < 24) return `${diffHours}${t("sidebar.hoursAgo")}`;
    if (diffDays < 7) return `${diffDays}${t("sidebar.daysAgo")}`;

    return date.toLocaleDateString();
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={`h-full lg:bg-white ${isCollapsed ? "bg-transparent" : "bg-white"} ${isCollapsed ? "lg:border-r border-r-0" : "border-r"} border-gray-200 flex-shrink-0 transition-all duration-300 ease-in-out flex flex-col lg:relative fixed left-0 top-0 z-40 ${isCollapsed ? "w-16 lg:w-16 pointer-events-none lg:pointer-events-auto" : "w-full lg:w-80 pointer-events-auto"
          }`}
      >
        {/* Row 1: Conversations title + Burger menu button */}
        <div className={`p-4 ${isCollapsed ? "lg:border-b border-b-0" : "border-b"} border-gray-200 flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
          <h2 className={`text-lg font-semibold text-gray-900 whitespace-nowrap transition-all duration-300 ease-in-out ${isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}>
            {t("sidebar.reports")}
          </h2>
          <button
            onClick={toggleCollapse}
            className={`p-2 text-gray-600 bg-white lg:bg-transparent rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 cursor-pointer pointer-events-auto ${isCollapsed ? "shadow-md lg:shadow-none" : "shadow-none"}`}
            aria-label={isCollapsed ? t("sidebar.expandSidebar") : t("sidebar.collapseSidebar")}
            title={isCollapsed ? t("sidebar.expandSidebar") : t("sidebar.collapseSidebar")}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Row 2: Create new chat button */}
        <div className={`p-4 border-b border-gray-200 transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? "max-h-0 p-0 opacity-0" : "max-h-32 opacity-100"}`}>
          <button
            onClick={handleNewConversationClick}
            className="w-full p-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            aria-label={t("sidebar.newReport")}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="font-medium whitespace-nowrap">{t("sidebar.newReport")}</span>
          </button>
        </div>

        {/* Row 3: Previous chats list */}
        <div className={`flex-1 transition-all duration-300 ease-in-out relative z-0 ${isCollapsed ? "opacity-0 overflow-hidden" : "opacity-100 overflow-y-auto"}`}>
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm whitespace-nowrap">
              {t("sidebar.noReports")}
            </div>
          ) : (
            <div className="p-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => handleLoadConversationClick(conversation.id)}
                  className={`group relative p-3 rounded-lg mb-2 cursor-pointer transition-colors ${currentConversationId === conversation.id
                    ? "bg-gray-100 border-2 border-gray-300"
                    : "hover:bg-gray-50 border-2 border-transparent"
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate whitespace-nowrap">
                        {formatTitle(conversation.title, conversation)}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 whitespace-nowrap truncate">
                        {formatDate(conversation.updatedAt)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(e, conversation.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 transition-opacity cursor-pointer"
                      aria-label={t("sidebar.deleteReport")}
                    >
                      <svg
                        className="w-4 h-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Language Selector - Only visible on screens < 998px */}
        <div className={`lg:hidden p-4 border-t border-gray-200 transition-all duration-300 ease-in-out overflow-visible relative z-[100] ${isCollapsed ? "max-h-0 p-0 opacity-0" : "max-h-96 opacity-100"}`}>
          <div className="relative z-[100]">
            <button
              ref={languageButtonRef}
              type="button"
              onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors cursor-pointer outline-none focus:outline-none border border-gray-200 relative z-[100]"
            >
              <Image
                src={getCurrentLanguage().flagUrl}
                alt={getCurrentLanguage().name}
                width={20}
                height={16}
                className="w-5 h-4 object-cover rounded-sm"
              />
              <span className="font-medium flex-1 text-left">{getCurrentLanguage().name}</span>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isLanguageDropdownOpen ? "rotate-180" : ""}`}
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

            {/* Language Dropdown */}
            {isLanguageDropdownOpen && (
              <div
                ref={languageDropdownRef}
                className="fixed lg:hidden bg-white border border-gray-200 rounded-xl shadow-2xl z-[9999] max-h-[300px] flex flex-col"
                style={{
                  top: `${Math.max(dropdownPosition.top, 10)}px`,
                  left: `${dropdownPosition.left}px`,
                  width: `${Math.max(dropdownPosition.width, 288)}px`,
                  maxWidth: '320px'
                }}
              >
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
                      ref={languageSearchInputRef}
                      type="text"
                      value={languageSearchQuery}
                      onChange={(e) => setLanguageSearchQuery(e.target.value)}
                      placeholder={t("navbar.searchLanguages")}
                      className="w-full pl-10 pr-3 py-2 text-sm text-gray-700 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 transition-all"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>

                {/* Language List */}
                <div className="py-0.5 max-h-[180px] overflow-y-auto">
                  {filteredLanguages.length > 0 ? (
                    filteredLanguages.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`w-full text-left px-3 py-1.5 text-sm transition-colors cursor-pointer outline-none focus:outline-none flex items-center gap-1.5 ${language === lang.code
                          ? "bg-gray-100 text-gray-900 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                          }`}
                      >
                        <Image
                          src={lang.flagUrl}
                          alt={lang.name}
                          width={16}
                          height={12}
                          className="w-4 h-3 object-cover rounded-sm"
                        />
                        <span className="font-medium">{lang.name}</span>
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

        {/* Logout button at bottom */}
        <div className={`p-2.5 lg:p-4 ${isCollapsed ? "lg:border-t border-t-0" : "border-t"} border-gray-200 mt-auto ${isCollapsed ? "flex justify-center lg:flex" : ""} ${isCollapsed ? "lg:block hidden" : ""}`}>
          <button
            onClick={() => setShowLogoutDialog(true)}
            className={`${isCollapsed ? "w-10 h-10 lg:w-12 lg:h-12 p-0 aspect-square" : "w-full p-2.5 lg:p-3"} text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5 lg:gap-2 cursor-pointer`}
            aria-label={t("sidebar.logout")}
            title={t("sidebar.logout")}
          >
            <svg
              className={"w-5 h-5 lg:w-6 lg:h-6"}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span className={`font-medium whitespace-nowrap transition-all duration-300 ease-in-out text-sm lg:text-base ${isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}>{t("sidebar.logout")}</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,.5)', zIndex: 1000, overflow: 'hidden' }}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-light text-gray-900 mb-4">
                {t("sidebar.logoutConfirm")}
              </h3>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowLogoutDialog(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer font-light"
                >
                  {t("sidebar.cancel")}
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors cursor-pointer font-light"
                >
                  {t("sidebar.confirm")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Conversation Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,.5)', zIndex: 1000, overflow: 'hidden' }}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-light text-gray-900 mb-4">
                {t("sidebar.deleteConfirm")}
              </h3>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setConversationToDelete(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer font-light"
                >
                  {t("sidebar.cancel")}
                </button>
                <button
                  onClick={confirmDeleteConversation}
                  className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors cursor-pointer font-light"
                >
                  {t("sidebar.confirm")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

