"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/app/contexts/TranslationContext";
import { conversationService, Conversation } from "../services/conversations";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentConversationId: string | null;
  onNewConversation: () => void;
  onLoadConversation: (conversationId: string) => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  currentConversationId,
  onNewConversation,
  onLoadConversation,
}: SidebarProps) {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);

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

  // Load conversations from storage
  useEffect(() => {
    const loadConversations = () => {
      const loaded = conversationService.getAllConversations();
      setConversations(loaded);
    };

    loadConversations();

    // Listen for storage changes (for cross-tab sync)
    const handleStorageChange = () => {
      loadConversations();
    };

    window.addEventListener("storage", handleStorageChange);

    // Poll for changes (since same-tab updates don't trigger storage event)
    const interval = setInterval(loadConversations, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleDeleteConversation = (
    e: React.MouseEvent,
    conversationId: string
  ) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this conversation?")) {
      conversationService.deleteConversation(conversationId);
      setConversations(conversationService.getAllConversations());

      // If deleting current conversation, create a new one
      if (conversationId === currentConversationId) {
        onNewConversation();
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

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:z-auto flex flex-col`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("sidebar.conversations") || "Conversations"}
          </h2>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded hover:bg-gray-100"
            aria-label="Close sidebar"
          >
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* New Conversation Button */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={onNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
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
            {t("sidebar.newConversation") || "New Conversation"}
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              {t("sidebar.noConversations") || "No conversations yet. Start a new one!"}
            </div>
          ) : (
            <div className="p-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => onLoadConversation(conversation.id)}
                  className={`group relative p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                    currentConversationId === conversation.id
                      ? "bg-gray-100 border-2 border-gray-300"
                      : "hover:bg-gray-50 border-2 border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {formatTitle(conversation.title, conversation)}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(conversation.updatedAt)}
                      </p>
                      {conversation.messages.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1 truncate">
                          {conversation.messages.length} message
                          {conversation.messages.length !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(e, conversation.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 transition-opacity"
                      aria-label="Delete conversation"
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
      </div>
    </>
  );
}

