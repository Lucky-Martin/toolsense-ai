"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "@/app/contexts/TranslationContext";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { conversationService, Message } from "../services/conversations";
import { clientCacheService } from "../services/clientCache";

const LOADING_MESSAGES = [
  "Analyzing company security posture...",
  "Researching vendor reputation...",
  "Scanning CVE databases...",
  "Reviewing compliance certifications...",
  "Assessing data handling practices...",
  "Evaluating security incidents...",
  "Checking CISA KEV catalog...",
  "Reviewing SOC 2 reports...",
  "Analyzing ISO certifications...",
  "Examining vendor PSIRT pages...",
  "Reviewing Terms of Service...",
  "Assessing deployment controls...",
  "Evaluating authentication methods...",
  "Reviewing security advisories...",
  "Analyzing trust factors...",
  "Calculating risk score...",
  "Researching safer alternatives...",
  "Reviewing incident response history...",
  "Checking bug bounty programs...",
  "Analyzing API security...",
  "Reviewing data encryption practices...",
  "Evaluating access controls...",
  "Researching market position...",
  "Analyzing financial stability...",
  "Reviewing customer testimonials...",
  "Checking third-party audits...",
  "Evaluating patch responsiveness...",
  "Researching abuse signals...",
  "Analyzing data residency...",
  "Reviewing privacy policies...",
  "Checking GDPR compliance...",
  "Evaluating administrative controls...",
  "Researching security best practices...",
  "Analyzing integration capabilities...",
  "Reviewing audit logging features...",
];

export default function Chatbot() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasUserMessage, setHasUserMessage] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();

    // Clean up expired cache entries on mount and periodically
    const cleanupCache = async () => {
      await clientCacheService.clearExpired();
    };

    cleanupCache();
    // Clean up expired entries every hour
    const interval = setInterval(cleanupCache, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Create new conversation
  const handleNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setHasUserMessage(false);
    setIsEditing(false);
    setSidebarOpen(false);
    inputRef.current?.focus();
  };

  // Load conversation
  const handleLoadConversation = (conversationId: string) => {
    const conversation = conversationService.getConversation(conversationId);
    if (conversation) {
      setMessages(conversation.messages);
      setCurrentConversationId(conversationId);
      setHasUserMessage(conversation.messages.some(msg => msg.role === "user"));
      setIsEditing(false);
      setSidebarOpen(false);
      inputRef.current?.focus();
    }
  };

  useEffect(() => {
    if (isLoading) {
      // Set initial loading message
      const randomIndex = Math.floor(Math.random() * LOADING_MESSAGES.length);
      setCurrentLoadingMessage(LOADING_MESSAGES[randomIndex]);

      // Rotate through loading messages every 2 seconds
      loadingIntervalRef.current = setInterval(() => {
        setCurrentLoadingMessage((current) => {
          // Get a random message that's different from current
          const availableMessages = LOADING_MESSAGES.filter(
            (msg) => msg !== current
          );

          if (availableMessages.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableMessages.length);
            return availableMessages[randomIndex];
          }
          return current;
        });
      }, 2000);
    } else {
      // Clear interval when loading stops
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
      setCurrentLoadingMessage("");
    }

    // Cleanup on unmount
    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
    };
  }, [isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || hasUserMessage) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
    };

    // Create new conversation if this is the first message
    let conversationId = currentConversationId;
    if (!conversationId) {
      const queryName = input.trim().substring(0, 50) || "New Conversation";
      const title = `${t("chatbot.reportFor")} ${queryName}`;
      const newConversation = conversationService.createConversation(
        title,
        userMessage
      );
      conversationId = newConversation.id;
      setCurrentConversationId(conversationId);
    }

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage]);
    setHasUserMessage(true);
    const currentInput = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      // Prepare conversation history
      const history = messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      // Get language from localStorage (default to "en")
      const languageId = typeof window !== "undefined"
        ? localStorage.getItem("languageId") || "en"
        : "en";

      // Check cache first (only for new queries, not follow-up questions)
      const isNewQuery = history.length === 0;
      let cachedResponse: string | null = null;
      let fromCache = false;

      if (isNewQuery) {
        cachedResponse = await clientCacheService.get(currentInput, languageId);
        if (cachedResponse) {
          fromCache = true;
        }
      }

      let responseData: { message: string; cached?: boolean; error?: string; details?: string };

      if (fromCache && cachedResponse) {
        // Use cached response
        responseData = {
          message: cachedResponse,
          cached: true,
        };
      } else {
        // Make API call
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: currentInput,
            history: history,
            languageId: languageId,
          }),
        });

        responseData = await response.json();

        if (!response.ok) {
          const errorMessage = responseData.details
            ? `${responseData.error || "Failed to get response"}: ${responseData.details}`
            : responseData.error || "Failed to get response";
          throw new Error(errorMessage);
        }

        // Cache the response if it's a new query
        if (isNewQuery && responseData.message) {
          await clientCacheService.set(currentInput, responseData.message, "gemini-2.5-pro", languageId);
        }
      }

      // Add assistant response to chat
      const assistantMessage: Message = {
        role: "assistant",
        content: responseData.message,
        cached: fromCache || responseData.cached || false,
      };
      const updatedMessages = [...messages, userMessage, assistantMessage];
      setMessages(updatedMessages);

      // Update conversation with new messages
      if (conversationId) {
        const conversation = conversationService.getConversation(conversationId);
        const title = conversation?.title || `${t("chatbot.reportFor")} ${userMessage.content.substring(0, 50).trim()}`;
        conversationService.updateConversation(conversationId, updatedMessages, title);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        role: "assistant",
        content:
          error instanceof Error
            ? `Sorry, I encountered an error: ${error.message}`
            : "Sorry, I encountered an error. Please try again.",
      };
      const updatedMessages = [...messages, userMessage, errorMessage];
      setMessages(updatedMessages);

      // Save error message to conversation too
      if (conversationId) {
        const conversation = conversationService.getConversation(conversationId);
        const title = conversation?.title || `${t("chatbot.reportFor")} ${userMessage.content.substring(0, 50).trim()}`;
        conversationService.updateConversation(conversationId, updatedMessages, title);
      }
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const hasMessages = messages.length > 0;

  const handleDownload = () => {
    // Find the last assistant message and its corresponding user query
    let lastAssistantIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        lastAssistantIndex = i;
        break;
      }
    }

    if (lastAssistantIndex === -1) return;

    const lastAssistantMessage = messages[lastAssistantIndex];

    // Find the user query that prompted this response (the user message before this assistant message)
    let userQuery = "security-assessment";
    for (let i = lastAssistantIndex - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        userQuery = messages[i].content;
        break;
      }
    }

    // Create a safe filename from the user query
    const safeFilename = userQuery
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 50) || "security-assessment";

    // Create the file content with metadata
    const fileContent = `# Security Assessment Report

**Tool:** ${userQuery}
**Generated by:** ToolSense AI
**Date:** ${new Date().toLocaleString()}

---

${lastAssistantMessage.content}
`;

    // Create a blob and download
    const blob = new Blob([fileContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFilename}-${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const hasAssistantResponse = messages.some(msg => msg.role === "assistant");

  const handleShare = async () => {
    // Get the conversation content
    const conversationText = messages
      .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
      .join("\n\n");

    try {
      // Try to use the Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: "ToolSense AI Conversation",
          text: conversationText,
        });
        return; // Successfully shared, exit early
      }
    } catch (error: any) {
      // If sharing is cancelled (user cancelled), don't try clipboard
      if (error.name === "AbortError") {
        console.log("Share cancelled by user");
        return;
      }
      // For other errors, fall through to clipboard fallback
      console.log("Web Share API failed, trying clipboard fallback:", error.message);
    }

    // Fallback: copy to clipboard
    try {
      // Ensure the document is focused before attempting clipboard operation
      if (document.hasFocus && !document.hasFocus()) {
        window.focus();
        // Wait a bit for focus to be established
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Check if clipboard API is available
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        throw new Error("Clipboard API not available");
      }

      await navigator.clipboard.writeText(conversationText);
      alert(t("chatbot.copiedToClipboard"));
    } catch (clipboardError: any) {
      // Log the error but don't crash the app
      console.error("Failed to copy to clipboard:", clipboardError);

      // Try fallback method using execCommand (deprecated but more compatible)
      try {
        const textArea = document.createElement("textarea");
        textArea.value = conversationText;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (successful) {
          alert(t("chatbot.copiedToClipboard"));
        } else {
          console.error("execCommand copy failed");
          // Last resort: show the text in a prompt so user can manually copy
          prompt("Copy this text:", conversationText);
        }
      } catch (fallbackError) {
        console.error("Fallback copy method also failed:", fallbackError);
        // Last resort: show the text in a prompt so user can manually copy
        prompt("Copy this text:", conversationText);
      }
    }
  };

  const handleEdit = () => {
    // Find the last user message
    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex !== -1) {
      const lastUserMessage = messages[lastUserIndex];
      setInput(lastUserMessage.content);
      setIsEditing(true);
      // Remove the last user message and assistant response
      const newMessages = messages.slice(0, lastUserIndex);
      setMessages(newMessages);
      setHasUserMessage(false);
      // Update conversation
      if (currentConversationId) {
        const conversation = conversationService.getConversation(currentConversationId);
        const title = conversation?.title || `${t("chatbot.reportFor")} ${lastUserMessage.content.substring(0, 50).trim()}`;
        conversationService.updateConversation(currentConversationId, newMessages, title);
      }
      inputRef.current?.focus();
    }
  };

  const handleAdd = () => {
    // Start a new conversation
    handleNewConversation();
  };

  return (
    <div className="flex h-screen w-full bg-white fixed inset-0 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentConversationId={currentConversationId}
        onNewConversation={handleNewConversation}
        onLoadConversation={handleLoadConversation}
      />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Navbar */}
        <Navbar />

        {/* Sidebar Toggle Button */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="fixed top-16 left-4 z-30 p-2 bg-white rounded-lg shadow-md border border-gray-200 hover:bg-gray-50 transition-all duration-300"
            aria-label={t("sidebar.toggleSidebar")}
          >
          <svg
            className="w-6 h-6 text-gray-700"
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
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 min-h-0 overflow-hidden pb-0">
        {!hasMessages ? (
          <div className="w-full max-w-3xl text-center">
            <h1 className="text-4xl font-bold text-black mb-4">
              {t("chatbot.whatCanIHelp")}
            </h1>
            <p className="text-lg text-gray-600 font-normal">
              {t("chatbot.subtitle")}
            </p>
        </div>
        ) : (
          <div className="w-full max-w-3xl h-full overflow-y-auto py-8 pb-32 space-y-6">
        {messages.map((message, index) => (
          <div
            key={index}
            className="w-full"
          >
            <div
                  className={`w-full rounded-lg px-4 py-3 ${
                message.role === "user"
                      ? "bg-gray-100 text-black mb-4"
                      : "bg-gray-50 text-gray-800 border border-gray-200"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className="markdown-content">
                      {message.cached && (
                        <div className="mb-2 text-xs text-gray-500 italic flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {t("chatbot.cachedResponse")}
                        </div>
                      )}
                      <ReactMarkdown
                        components={{
                          h1: (props) => (
                            <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900 border-b border-gray-200 pb-2" {...props} />
                          ),
                          h2: (props) => (
                            <h2 className="text-xl font-bold mt-5 mb-3 text-gray-900" {...props} />
                          ),
                          h3: (props) => (
                            <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800" {...props} />
                          ),
                          h4: (props) => (
                            <h4 className="text-base font-semibold mt-3 mb-2 text-gray-800" {...props} />
                          ),
                          p: (props) => (
                            <p className="mb-3 leading-7 text-gray-700" {...props} />
                          ),
                          ul: (props) => (
                            <ul className="list-disc list-outside mb-3 ml-6 space-y-2 text-gray-700" {...props} />
                          ),
                          ol: (props) => (
                            <ol className="list-decimal list-outside mb-3 ml-6 space-y-2 text-gray-700" {...props} />
                          ),
                          li: (props) => (
                            <li className="pl-2 leading-7" {...props} />
                          ),
                          strong: (props) => (
                            <strong className="font-semibold text-gray-900" {...props} />
                          ),
                          em: (props) => (
                            <em className="italic text-gray-700" {...props} />
                          ),
                          code: (props) => (
                            <code className="bg-gray-200 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800" {...props} />
                          ),
                          pre: (props) => (
                            <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto mb-3 text-sm" {...props} />
                          ),
                          hr: (props) => (
                            <hr className="my-6 border-gray-300" {...props} />
                          ),
                          a: (props) => (
                            <a className="text-blue-600 hover:text-blue-800 hover:underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />
                          ),
                          blockquote: (props) => (
                            <blockquote className="border-l-4 border-gray-300 pl-4 italic my-3 text-gray-600" {...props} />
                          ),
                          table: (props) => (
                            <div className="overflow-x-auto my-4">
                              <table className="min-w-full border-collapse border border-gray-300" {...props} />
                            </div>
                          ),
                          thead: (props) => (
                            <thead className="bg-gray-100" {...props} />
                          ),
                          th: (props) => (
                            <th className="border border-gray-300 px-4 py-2 text-left font-semibold" {...props} />
                          ),
                          td: (props) => (
                            <td className="border border-gray-300 px-4 py-2" {...props} />
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap break-words leading-relaxed">
                {`${t("chatbot.reportFor")} ${message.content}`}
                    </div>
                  )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="w-full">
                <div className="bg-gray-50 text-gray-800 border border-gray-200 rounded-lg px-4 py-3 w-full">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1 flex-shrink-0">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                ></div>
                    </div>
                    <span className="text-sm text-gray-600">{currentLoadingMessage}</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area - Fixed at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white z-10 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]" style={{ borderTop: '1px solid white' }}>
        <div className="max-w-3xl mx-auto px-4 py-4">
          {hasAssistantResponse ? (
            // Show buttons when there's an assistant response
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
                title={t("chatbot.share")}
              >
                <span className="text-sm font-medium">{t("chatbot.share")}</span>
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
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
                title={t("chatbot.edit")}
              >
                <span className="text-sm font-medium">{t("chatbot.edit")}</span>
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleAdd}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
                title={t("chatbot.add")}
              >
                <span className="text-sm font-medium">{t("chatbot.add")}</span>
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
              </button>
            </div>
          ) : (
            // Show input when there's no assistant response
            <form onSubmit={handleSend} className="relative">
              <div className="relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t("chatbot.messagePlaceholder")}
                  disabled={isLoading || hasUserMessage}
                  className="flex-1 px-4 py-3 pr-12 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:bg-white focus:border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim() || hasUserMessage}
                  className="absolute right-2 p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    className="w-5 h-5 text-gray-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
            </form>
          )}
          {!hasAssistantResponse && (
            <p className="text-xs text-gray-400 text-center mt-2">
              {t("chatbot.footerText")}
            </p>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

