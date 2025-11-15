"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

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
        className={`h-full bg-white border-r border-gray-200 flex-shrink-0 transition-all duration-300 ease-in-out flex flex-col ${isCollapsed ? "w-16" : "w-80"
          }`}
      >
        {/* Row 1: Conversations title + Burger menu button */}
        <div className={`p-4 border-b border-gray-200 flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
          <h2 className={`text-lg font-semibold text-gray-900 whitespace-nowrap transition-all duration-300 ease-in-out ${isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}>
            {t("sidebar.reports")}
          </h2>
          <button
            onClick={toggleCollapse}
            className="p-2 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 cursor-pointer"
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
            onClick={onNewConversation}
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
        <div className={`flex-1 transition-all duration-300 ease-in-out ${isCollapsed ? "opacity-0 overflow-hidden" : "opacity-100 overflow-y-auto"}`}>
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm whitespace-nowrap">
              {t("sidebar.noReports")}
            </div>
          ) : (
            <div className="p-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => onLoadConversation(conversation.id)}
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

        {/* Logout button at bottom */}
        <div className={`p-4 border-t border-gray-200 mt-auto ${isCollapsed ? "flex justify-center" : ""}`}>
          <button
            onClick={() => setShowLogoutDialog(true)}
            className={`${isCollapsed ? "w-12 h-12 p-0 aspect-square" : "w-full p-3"} text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center ${isCollapsed ? "gap-0" : "gap-2"} cursor-pointer`}
            aria-label={t("sidebar.logout")}
            title={t("sidebar.logout")}
          >
            <svg
              className={"w-6 h-6"}
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
            <span className={`font-medium whitespace-nowrap transition-all duration-300 ease-in-out ${isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}>{t("sidebar.logout")}</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,.5)', zIndex: 1000 }}>
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
        <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,.5)', zIndex: 1000 }}>
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

