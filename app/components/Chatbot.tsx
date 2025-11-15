"use client";

import { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import React from "react";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "@/app/contexts/TranslationContext";
import { useAuth } from "@/app/contexts/AuthContext";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { conversationService, Message } from "../services/conversations";
import { clientCacheService } from "../services/clientCache";
import { validateInput } from "../utils/inputValidation";
import { useLoadingMessages } from "../hooks/useLoadingMessages";
import { useDownloadReport } from "../hooks/useDownloadReport";
import { useShareReport } from "../hooks/useShareReport";
import MessageBubble from "./chat/MessageBubble";
import LoadingIndicator from "./chat/LoadingIndicator";
import ChatInput from "./chat/ChatInput";
import ChatActions from "./chat/ChatActions";
import { markdownComponents } from "./markdown/MarkdownComponents";

export default function Chatbot() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null);
  const [hasUserMessage, setHasUserMessage] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editMessageIndex, setEditMessageIndex] = useState<number>(-1);
  const [isEditingAssistant, setIsEditingAssistant] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showEditDownloadDropdown, setShowEditDownloadDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const editDownloadDropdownRef = useRef<HTMLDivElement>(null);
  const activeRequestRef = useRef<{ conversationId: string | null; userMessage: Message } | null>(null);
  const currentConversationIdRef = useRef<string | null>(null);

  const currentLoadingMessage = useLoadingMessages(isLoading);
  const { downloadMarkdown, downloadPDF } = useDownloadReport(messages);
  const { share } = useShareReport(messages);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Prevent body scroll when edit dialog is open
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (showEditDialog) {
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
  }, [showEditDialog]);

  // Close edit download dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        editDownloadDropdownRef.current &&
        !editDownloadDropdownRef.current.contains(event.target as Node)
      ) {
        setShowEditDownloadDropdown(false);
      }
    };

    if (showEditDownloadDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEditDownloadDropdown]);

  useEffect(() => {
    // Clean up expired cache entries on mount
    const cleanupCache = async () => {
      await clientCacheService.clearExpired();
    };

    cleanupCache();

    // Clean up when page becomes visible (user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        cleanupCache();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Create new conversation
  const handleNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    currentConversationIdRef.current = null;
    setHasUserMessage(false);
  };

  // Load conversation
  const handleLoadConversation = (conversationId: string) => {
    const conversation = conversationService.getConversation(conversationId);
    if (conversation) {
      setMessages(conversation.messages);
      setCurrentConversationId(conversationId);
      currentConversationIdRef.current = conversationId;
      setHasUserMessage(conversation.messages.some(msg => msg.role === "user"));
    }
  };


  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || hasUserMessage) return;

    // Validate input for security (client-side validation)
    const inputValidation = validateInput(input.trim());
    if (!inputValidation.isValid) {
      // Show error message to user
      const errorMessage: Message = {
        role: "assistant",
        content: `⚠️ ${inputValidation.error || "Invalid input. Please provide a product name, company name, or URL."}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
      setInput(""); // Clear input
      return;
    }

    // Use sanitized input
    const sanitizedInput = inputValidation.sanitizedInput || input.trim();

    const userMessage: Message = {
      role: "user",
      content: sanitizedInput,
    };

    // Get language BEFORE checking for existing conversations
    // This ensures we don't reuse conversations from different languages
    const rawLanguageId = typeof window !== "undefined"
      ? localStorage.getItem("languageId") || "en"
      : "en";
    const languageId = rawLanguageId.toLowerCase().trim();

    // Check for existing conversation or create new one if this is the first message
    let conversationId = currentConversationId;
    if (!conversationId) {
      // Check if a conversation with the same query already exists
      const existingConversation = conversationService.findConversationByQuery(sanitizedInput);

      if (existingConversation) {
        // IMPORTANT: Don't reuse conversations - always make a new request
        // This ensures language-specific responses are generated
        // The old conversation will remain in history, but we'll create a new one
        // Create a new conversation instead of reusing
        const queryName = sanitizedInput.substring(0, 50) || "New Report";
        const title = `${t("chatbot.reportFor")} ${queryName}`;
        const newConversation = conversationService.createConversation(
          title,
          userMessage
        );
        conversationId = newConversation.id;
        setCurrentConversationId(conversationId);
        currentConversationIdRef.current = conversationId;
      } else {
        // No existing conversation found, create a new one
        const queryName = sanitizedInput.substring(0, 50) || "New Report";
        const title = `${t("chatbot.reportFor")} ${queryName}`;
        const newConversation = conversationService.createConversation(
          title,
          userMessage
        );
        conversationId = newConversation.id;
        setCurrentConversationId(conversationId);
        currentConversationIdRef.current = conversationId;
      }
    }

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage]);
    setHasUserMessage(true);
    const currentInput = sanitizedInput;
    setInput("");
    setIsLoading(true);
    setLoadingConversationId(conversationId); // Track which conversation is loading
    activeRequestRef.current = { conversationId, userMessage }; // Track the active request

    try {
      // Prepare conversation history
      const history = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Language already retrieved above, use it here

      // Check cache first (only for new queries, not follow-up questions)
      // IMPORTANT: Cache is language-specific. If "tokmanni" is cached in Chinese (zh)
      // and user requests it in English (en), cache lookup will return null and trigger
      // a new API request in English, which will then be cached separately.
      const isNewQuery = history.length === 0;
      let cachedResponse: string | null = null;
      let fromCache = false;

      if (isNewQuery) {
        cachedResponse = await clientCacheService.get(currentInput, languageId);
        if (cachedResponse) {
          fromCache = true;
        }
      }

      let responseData: { message: string; model?: string; cached?: boolean; error?: string; details?: string };

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
            message: currentInput, // Already sanitized
            history: history,
            languageId: languageId,
            userId: user?.uid || undefined,
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
          const responseModel = responseData.model || "gemini-2.5-pro";
          await clientCacheService.set(currentInput, responseData.message, responseModel, languageId);
        }
      }

      // Add assistant response to chat
      const assistantMessage: Message = {
        role: "assistant",
        content: responseData.message,
        cached: fromCache || responseData.cached || false,
      };

      // Always update the conversation in storage first, regardless of which conversation is active
      // This ensures the response is saved even if user switched conversations
      if (conversationId) {
        const conversation = conversationService.getConversation(conversationId);
        const existingMessages = conversation?.messages || [];
        // Check if userMessage is already the last message to avoid duplicates
        const lastMessage = existingMessages[existingMessages.length - 1];
        const userMessageExists = lastMessage?.role === "user" &&
          lastMessage?.content === userMessage.content;
        const updatedMessages = userMessageExists
          ? [...existingMessages, assistantMessage]
          : [...existingMessages, userMessage, assistantMessage];
        const title = conversation?.title || `${t("chatbot.reportFor")} ${userMessage.content.substring(0, 50).trim()}`;
        conversationService.updateConversation(conversationId, updatedMessages, title);

        // Always update UI messages if this is still the active conversation
        // Use ref to get the latest value since state might be stale in async callbacks
        // This ensures the UI updates immediately when the response arrives
        if (currentConversationIdRef.current === conversationId) {
          // Reload from storage to ensure we have the exact same data that was saved
          // This guarantees the UI is in sync with storage
          const updatedConversation = conversationService.getConversation(conversationId);
          if (updatedConversation) {
            setMessages(updatedConversation.messages);
          } else {
            // Fallback: use functional update if conversation not found
            setMessages((prevMessages) => {
              const lastUIMessage = prevMessages[prevMessages.length - 1];
              if (lastUIMessage?.role === "assistant" && lastUIMessage?.content === assistantMessage.content) {
                return prevMessages;
              }
              return [...prevMessages, assistantMessage];
            });
          }
        }
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

      // Always save error message to conversation storage first
      if (conversationId) {
        const conversation = conversationService.getConversation(conversationId);
        const existingMessages = conversation?.messages || [];
        // Check if userMessage is already the last message to avoid duplicates
        const lastMessage = existingMessages[existingMessages.length - 1];
        const userMessageExists = lastMessage?.role === "user" &&
          lastMessage?.content === userMessage.content;
        const updatedMessages = userMessageExists
          ? [...existingMessages, errorMessage]
          : [...existingMessages, userMessage, errorMessage];
        const title = conversation?.title || `${t("chatbot.reportFor")} ${userMessage.content.substring(0, 50).trim()}`;
        conversationService.updateConversation(conversationId, updatedMessages, title);

        // Always update UI messages if this is still the active conversation
        // Use ref to get the latest value since state might be stale in async callbacks
        if (currentConversationIdRef.current === conversationId) {
          // Reload from storage to ensure we have the exact same data that was saved
          // This guarantees the UI is in sync with storage
          const updatedConversation = conversationService.getConversation(conversationId);
          if (updatedConversation) {
            setMessages(updatedConversation.messages);
          } else {
            // Fallback: use functional update if conversation not found
            setMessages((prevMessages) => {
              const lastUIMessage = prevMessages[prevMessages.length - 1];
              if (lastUIMessage?.role === "assistant" && lastUIMessage?.content === errorMessage.content) {
                return prevMessages;
              }
              return [...prevMessages, errorMessage];
            });
          }
        }
      }
    } finally {
      // Only clear loading state if this is still the conversation that was loading
      if (activeRequestRef.current?.conversationId === conversationId) {
        setIsLoading(false);
        setLoadingConversationId(null);
        activeRequestRef.current = null;
      }
    }
  };

  const hasMessages = messages.length > 0;
  const hasAssistantResponse = messages.some(msg => msg.role === "assistant");

  const handleEdit = () => {
    // Find the last assistant message (response text)
    let lastAssistantIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        lastAssistantIndex = i;
        break;
      }
    }

    if (lastAssistantIndex !== -1) {
      const lastAssistantMessage = messages[lastAssistantIndex];
      setEditContent(lastAssistantMessage.content);
      setEditMessageIndex(lastAssistantIndex);
      setIsEditingAssistant(true);
      setIsPreviewMode(false);
      setShowEditDialog(true);
    }
  };

  const handleSaveEdit = () => {
    // This function is no longer used for downloading, but kept for compatibility
    // Download is now handled by the dropdown buttons
  };

  const handleCopyEdit = async () => {
    if (!editContent.trim()) return;

    try {
      if (document.hasFocus && !document.hasFocus()) {
        window.focus();
        // Wait for next frame for focus to be established (more efficient than setTimeout)
        await new Promise(resolve => requestAnimationFrame(resolve));
      }

      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        throw new Error("Clipboard API not available");
      }

      await navigator.clipboard.writeText(editContent);
      alert(t("chatbot.copiedToClipboard"));
    } catch (clipboardError: unknown) {
      console.error("Failed to copy to clipboard:", clipboardError);
      try {
        const textArea = document.createElement("textarea");
        textArea.value = editContent;
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
          prompt(t("chatbot.copyTextPrompt"), editContent);
        }
      } catch (fallbackError) {
        console.error("Fallback copy method also failed:", fallbackError);
        prompt(t("chatbot.copyTextPrompt"), editContent);
      }
    }
  };

  const getEditedReportData = () => {
    if (!editContent.trim()) return null;

    // Find the user query that prompted this response
    let userQuery = "security-assessment";
    if (editMessageIndex > 0 && messages[editMessageIndex - 1]?.role === "user") {
      userQuery = messages[editMessageIndex - 1].content;
    }

    // Create a safe filename from the user query
    const safeFilename = userQuery
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 50) || "security-assessment";

    return {
      userQuery,
      safeFilename,
    };
  };

  const handleDownloadEditedMarkdown = () => {
    const reportData = getEditedReportData();
    if (!reportData) return;

    const { userQuery, safeFilename } = reportData;

    // Create the file content with metadata
    const fileContent = `# Security Assessment Report

**Tool:** ${userQuery}
**Generated by:** ToolSense AI
**Date:** ${new Date().toLocaleString()}
**Edited:** ${new Date().toLocaleString()}

---

${editContent.trim()}
`;

    // Create a blob and download
    const blob = new Blob([fileContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFilename}-edited.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowEditDownloadDropdown(false);
  };

  const handleDownloadEditedPDF = async () => {
    const reportData = getEditedReportData();
    if (!reportData) return;

    const { userQuery } = reportData;

    // Create a temporary container to render ReactMarkdown
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.width = '800px';
    document.body.appendChild(tempContainer);

    // Create a React root and render ReactMarkdown
    const { createRoot } = await import('react-dom/client');
    const root = createRoot(tempContainer);

    // Render ReactMarkdown with the same components used in the UI
    root.render(
      React.createElement(ReactMarkdown, {
        components: {
          h1: ({ children, ...props }: any) => React.createElement('h1', props, children),
          h2: ({ children, ...props }: any) => React.createElement('h2', props, children),
          h3: ({ children, ...props }: any) => React.createElement('h3', props, children),
          h4: ({ children, ...props }: any) => React.createElement('h4', props, children),
          p: ({ children, ...props }: any) => React.createElement('p', props, children),
          ul: ({ children, ...props }: any) => React.createElement('ul', props, children),
          ol: ({ children, ...props }: any) => React.createElement('ol', props, children),
          li: ({ children, ...props }: any) => React.createElement('li', props, children),
          strong: ({ children, ...props }: any) => React.createElement('strong', props, children),
          em: ({ children, ...props }: any) => React.createElement('em', props, children),
          code: ({ children, className, ...props }: any) => {
            return React.createElement('code', { ...props, className }, children);
          },
          pre: ({ children, ...props }: any) => React.createElement('pre', props, children),
          blockquote: ({ children, ...props }: any) => React.createElement('blockquote', props, children),
          a: ({ children, href, ...props }: any) => React.createElement('a', { ...props, href, target: '_blank', rel: 'noopener noreferrer' }, children),
          hr: (props: any) => React.createElement('hr', props),
          table: ({ children, ...props }: any) => React.createElement('table', props, children),
          thead: ({ children, ...props }: any) => React.createElement('thead', props, children),
          tbody: ({ children, ...props }: any) => React.createElement('tbody', props, children),
          tr: ({ children, ...props }: any) => React.createElement('tr', props, children),
          th: ({ children, ...props }: any) => React.createElement('th', props, children),
          td: ({ children, ...props }: any) => React.createElement('td', props, children),
        },
      }, editContent.trim())
    );

    // Wait for React to render
    await new Promise(resolve => setTimeout(resolve, 200));

    // Extract the rendered HTML
    const renderedContent = tempContainer.innerHTML;

    // Clean up
    root.unmount();
    document.body.removeChild(tempContainer);

    // Create HTML content for PDF
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @media print {
      @page {
        margin: 1in;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    h1 {
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
      margin-bottom: 30px;
      font-size: 2em;
    }
    h2 {
      margin-top: 30px;
      margin-bottom: 15px;
      color: #222;
      font-size: 1.5em;
    }
    h3 {
      margin-top: 25px;
      margin-bottom: 10px;
      color: #333;
      font-size: 1.2em;
    }
    h4 {
      margin-top: 20px;
      margin-bottom: 10px;
      color: #444;
      font-size: 1.1em;
    }
    p {
      margin-bottom: 15px;
    }
    ul, ol {
      margin-bottom: 15px;
      padding-left: 30px;
    }
    li {
      margin-bottom: 8px;
    }
    strong {
      font-weight: 600;
    }
    em {
      font-style: italic;
    }
    code {
      background-color: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    pre {
      background-color: #f4f4f4;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      margin-bottom: 15px;
    }
    pre code {
      background-color: transparent;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid #ddd;
      padding-left: 20px;
      margin: 20px 0;
      color: #666;
      font-style: italic;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: #f4f4f4;
      font-weight: 600;
    }
    a {
      color: #0066cc;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    hr {
      border: none;
      border-top: 1px solid #ddd;
      margin: 30px 0;
    }
    .metadata {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 30px;
    }
  </style>
</head>
<body>
  <div class="metadata">
    <p><strong>Tool:</strong> ${userQuery}</p>
    <p><strong>Generated by:</strong> ToolSense AI</p>
    <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Edited:</strong> ${new Date().toLocaleString()}</p>
  </div>
  <div id="content">
    ${renderedContent}
  </div>
</body>
</html>
`;

    // Create a new window with the HTML content
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert(t("chatbot.popupBlocked"));
      return;
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load, then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Close the window after printing dialog is closed
        setTimeout(() => {
          printWindow.close();
        }, 100);
      }, 250);
    };

    setShowEditDownloadDropdown(false);
  };

  const handleShareEdited = async () => {
    if (!editContent.trim()) return;

    // Find the user query that prompted this response
    let userQuery = "security-assessment";
    if (editMessageIndex > 0 && messages[editMessageIndex - 1]?.role === "user") {
      userQuery = messages[editMessageIndex - 1].content;
    }

    const shareText = `# Security Assessment Report

**Tool:** ${userQuery}
**Generated by:** ToolSense AI
**Date:** ${new Date().toLocaleString()}
**Edited:** ${new Date().toLocaleString()}

---

${editContent.trim()}
`;

    try {
      // Try to use the Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: "ToolSense AI - Edited Report",
          text: shareText,
        });
        // Close dialog after sharing
        setShowEditDialog(false);
        setEditContent("");
        setEditMessageIndex(-1);
        setIsEditingAssistant(false);
        setIsPreviewMode(false);
        return;
      }
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.log("Share cancelled by user");
        return;
      }
      console.log("Web Share API failed, trying clipboard fallback");
    }

    // Fallback: copy to clipboard
    try {
      if (document.hasFocus && !document.hasFocus()) {
        window.focus();
        // Wait for next frame for focus to be established (more efficient than setTimeout)
        await new Promise(resolve => requestAnimationFrame(resolve));
      }

      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        throw new Error("Clipboard API not available");
      }

      await navigator.clipboard.writeText(shareText);
      alert(t("chatbot.copiedToClipboard"));
      // Close dialog after copying
      setShowEditDialog(false);
      setEditContent("");
      setEditMessageIndex(-1);
      setIsEditingAssistant(false);
      setIsPreviewMode(false);
    } catch (clipboardError: unknown) {
      console.error("Failed to copy to clipboard:", clipboardError);
      try {
        const textArea = document.createElement("textarea");
        textArea.value = shareText;
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
          // Close dialog after copying
          setShowEditDialog(false);
          setEditContent("");
          setEditMessageIndex(-1);
          setIsEditingAssistant(false);
        } else {
          prompt(t("chatbot.copyTextPrompt"), shareText);
        }
      } catch (fallbackError) {
        console.error("Fallback copy method also failed:", fallbackError);
        prompt(t("chatbot.copyTextPrompt"), shareText);
      }
    }
  };

  const handleAdd = () => {
    // Start a new conversation
    handleNewConversation();
  };
  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        currentConversationId={currentConversationId}
        onNewConversation={handleNewConversation}
        onLoadConversation={handleLoadConversation}
      />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Navbar - Hidden on screens < 998px */}
        <div className="hidden lg:block">
          <Navbar />
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden pt-[50px] lg:pt-0">
          <div
            className={`flex-1 flex flex-col min-h-0 overflow-hidden pb-0 ${hasMessages ? "items-start" : "items-center justify-center"
              }`}
          >
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
              <div className="w-full h-full overflow-y-auto">
                <div className="max-w-3xl mx-auto px-4 pt-[30px] pb-4 lg:pb-8 space-y-6">
                  {messages.map((message, index) => (
                    <div key={index} className="w-full">
                      <MessageBubble message={message} />
                    </div>
                  ))}
                  {isLoading && loadingConversationId === currentConversationId && (
                    <LoadingIndicator message={currentLoadingMessage} />
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}
          </div>

          <div className="bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.08)] border-t border-white">
            <div className="max-w-3xl mx-auto px-4 py-2 lg:py-4 w-full">
              {hasAssistantResponse ? (
                <ChatActions
                  onDownloadMarkdown={downloadMarkdown}
                  onDownloadPDF={downloadPDF}
                  onShare={share}
                  onEdit={handleEdit}
                />
              ) : (
                <ChatInput
                      value={input}
                  onChange={setInput}
                  onSubmit={handleSend}
                      disabled={isLoading || hasUserMessage}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog with Text Editor */}
      {showEditDialog && (
        <div className="fixed inset-0 flex lg:items-center lg:justify-center items-start justify-start" style={{ backgroundColor: 'rgba(0,0,0,.5)', zIndex: 1000, overflow: 'hidden' }}>
          <div className="bg-white rounded-lg lg:rounded-lg rounded-none shadow-xl max-w-4xl w-full lg:mx-4 mx-0 border border-gray-200 flex flex-col h-screen lg:h-[80vh]">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-light text-gray-900">
                {t("chatbot.edit")}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyEdit}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer font-light flex items-center gap-2"
                  title={t("chatbot.editDialog.copyText")}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  {t("chatbot.editDialog.copy")}
                </button>
                <button
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer font-light flex items-center gap-2"
                  title={isPreviewMode ? t("chatbot.editDialog.switchToEditor") : t("chatbot.editDialog.switchToPreview")}
                >
                  {isPreviewMode ? (
                    <>
                      <svg
                        className="w-4 h-4"
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
                      {t("chatbot.editDialog.editor")}
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      {t("chatbot.editDialog.preview")}
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              {isPreviewMode ? (
                <div className="h-full overflow-y-auto p-6 bg-gray-50">
                  <div className="markdown-content max-w-none overflow-x-hidden break-words">
                    <ReactMarkdown components={markdownComponents}>
                      {editContent}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <Editor
                  height="100%"
                  defaultLanguage="markdown"
                  value={editContent}
                  onChange={(value) => setEditContent(value || "")}
                  theme="vs-light"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowEditDialog(false);
                  setEditContent("");
                  setEditMessageIndex(-1);
                  setIsEditingAssistant(false);
                  setIsPreviewMode(false);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer font-light"
              >
                {t("sidebar.cancel")}
              </button>
              {isEditingAssistant ? (
                <>
                  <button
                    onClick={handleShareEdited}
                    className="px-4 lg:px-4 px-2.5 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer font-light flex items-center gap-2 lg:gap-2 gap-0"
                  >
                    <svg
                      className="w-4 h-4"
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
                    <span className="lg:inline hidden">{t("chatbot.share")}</span>
                  </button>
                  <div className="relative" ref={editDownloadDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowEditDownloadDropdown(!showEditDownloadDropdown)}
                      className="px-4 py-2 text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer font-light flex items-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M8 12l4 4m0 0l4-4m-4 4V4"
                        />
                      </svg>
                      {t("chatbot.download")}
                      <svg
                        className={`w-4 h-4 transition-transform ${showEditDownloadDropdown ? 'rotate-180' : ''}`}
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
                    {showEditDownloadDropdown && (
                      <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                        <button
                          type="button"
                          onClick={handleDownloadEditedMarkdown}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          {t("chatbot.markdown")}
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadEditedPDF}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                          {t("chatbot.pdf")}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <button
                  onClick={handleSaveEdit}
                  className="px-4 lg:px-4 px-2.5 py-2 text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer font-light flex items-center justify-center gap-2 lg:gap-2 gap-0"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="lg:inline hidden">{t("sidebar.confirm")}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

