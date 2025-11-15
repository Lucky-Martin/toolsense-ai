"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import Editor from "@monaco-editor/react";
import React from "react";
import { useTranslation } from "@/app/contexts/TranslationContext";
import { useAuth } from "@/app/contexts/AuthContext";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { conversationService, Message } from "../services/conversations";
import { clientCacheService } from "../services/clientCache";
import ReportSummary from "./ReportSummary";
import { parseResponse, isSecurityAssessment } from "../utils/responseParser";
import { validateInput } from "../utils/inputValidation";

const LOADING_MESSAGE_KEYS = [
  "analyzingCompanySecurityPosture",
  "researchingVendorReputation",
  "scanningCVEDatabases",
  "reviewingComplianceCertifications",
  "assessingDataHandlingPractices",
  "evaluatingSecurityIncidents",
  "checkingCISAKEVCatalog",
  "reviewingSOC2Reports",
  "analyzingISOCertifications",
  "examiningVendorPSIRTPages",
  "reviewingTermsOfService",
  "assessingDeploymentControls",
  "evaluatingAuthenticationMethods",
  "reviewingSecurityAdvisories",
  "analyzingTrustFactors",
  "calculatingRiskScore",
  "researchingSaferAlternatives",
  "reviewingIncidentResponseHistory",
  "checkingBugBountyPrograms",
  "analyzingAPISecurity",
  "reviewingDataEncryptionPractices",
  "evaluatingAccessControls",
  "researchingMarketPosition",
  "analyzingFinancialStability",
  "reviewingCustomerTestimonials",
  "checkingThirdPartyAudits",
  "evaluatingPatchResponsiveness",
  "researchingAbuseSignals",
  "analyzingDataResidency",
  "reviewingPrivacyPolicies",
  "checkingGDPRCompliance",
  "evaluatingAdministrativeControls",
  "researchingSecurityBestPractices",
  "analyzingIntegrationCapabilities",
  "reviewingAuditLoggingFeatures",
];

export default function Chatbot() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const getLoadingMessages = () => {
    return LOADING_MESSAGE_KEYS.map(key => t(`chatbot.loadingMessages.${key}`));
  };
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null);
  const [hasUserMessage, setHasUserMessage] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editMessageIndex, setEditMessageIndex] = useState<number>(-1);
  const [isEditingAssistant, setIsEditingAssistant] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [showEditDownloadDropdown, setShowEditDownloadDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const downloadDropdownRef = useRef<HTMLDivElement>(null);
  const editDownloadDropdownRef = useRef<HTMLDivElement>(null);
  const activeRequestRef = useRef<{ conversationId: string | null; userMessage: Message } | null>(null);
  const currentConversationIdRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        downloadDropdownRef.current &&
        !downloadDropdownRef.current.contains(event.target as Node)
      ) {
        setShowDownloadDropdown(false);
      }
      if (
        editDownloadDropdownRef.current &&
        !editDownloadDropdownRef.current.contains(event.target as Node)
      ) {
        setShowEditDownloadDropdown(false);
      }
    };

    if (showDownloadDropdown || showEditDownloadDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDownloadDropdown, showEditDownloadDropdown]);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();

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
    // Don't clear loading state here - let the request complete
    // But hide loading UI for this conversation since it's not the active one
    inputRef.current?.focus();
  };

  // Load conversation
  const handleLoadConversation = (conversationId: string) => {
    const conversation = conversationService.getConversation(conversationId);
    if (conversation) {
      setMessages(conversation.messages);
      setCurrentConversationId(conversationId);
      currentConversationIdRef.current = conversationId;
      setHasUserMessage(conversation.messages.some(msg => msg.role === "user"));
      // Don't clear loading state here - let the request complete
      // But hide loading UI for this conversation since it's not the active one
      inputRef.current?.focus();
    }
  };

  useEffect(() => {
    if (isLoading) {
      // Set initial loading message
      const loadingMessages = getLoadingMessages();
      const randomIndex = Math.floor(Math.random() * loadingMessages.length);
      setCurrentLoadingMessage(loadingMessages[randomIndex]);

      // Rotate through loading messages every 2 seconds
      loadingIntervalRef.current = setInterval(() => {
        setCurrentLoadingMessage((current) => {
          // Get a random message that's different from current
          const availableMessages = loadingMessages.filter(
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
      inputRef.current?.focus();
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
      inputRef.current?.focus();
    }
  };

  const hasMessages = messages.length > 0;

  const getReportData = () => {
    // Find the last assistant message and its corresponding user query
    let lastAssistantIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        lastAssistantIndex = i;
        break;
      }
    }

    if (lastAssistantIndex === -1) return null;

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

    return {
      lastAssistantMessage,
      userQuery,
      safeFilename,
    };
  };

  const handleDownloadMarkdown = () => {
    const reportData = getReportData();
    if (!reportData) return;

    const { lastAssistantMessage, userQuery, safeFilename } = reportData;

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
    setShowDownloadDropdown(false);
  };

  const handleDownloadPDF = async () => {
    const reportData = getReportData();
    if (!reportData) return;

    const { lastAssistantMessage, userQuery } = reportData;

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
      }, lastAssistantMessage.content)
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
      alert('Please allow pop-ups to download PDF');
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

    setShowDownloadDropdown(false);
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
          title: "ToolSense AI Report",
          text: conversationText,
        });
        return; // Successfully shared, exit early
      }
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.log("Share cancelled by user");
        return;
      }

      if (error instanceof Error) {
        console.log("Web Share API failed, trying clipboard fallback:", error.message);
      } else {
        console.log("Web Share API failed, trying clipboard fallback");
      }
    }

    // Fallback: copy to clipboard
    try {
      // Ensure the document is focused before attempting clipboard operation
      if (document.hasFocus && !document.hasFocus()) {
        window.focus();
        // Wait for next frame for focus to be established (more efficient than setTimeout)
        await new Promise(resolve => requestAnimationFrame(resolve));
      }

      // Check if clipboard API is available
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        throw new Error("Clipboard API not available");
      }

      await navigator.clipboard.writeText(conversationText);
      alert(t("chatbot.copiedToClipboard"));
    } catch (clipboardError: unknown) {
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
          prompt("Copy this text:", editContent);
        }
      } catch (fallbackError) {
        console.error("Fallback copy method also failed:", fallbackError);
        prompt("Copy this text:", editContent);
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
      alert('Please allow pop-ups to download PDF');
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
          prompt("Copy this text:", shareText);
        }
      } catch (fallbackError) {
        console.error("Fallback copy method also failed:", fallbackError);
        prompt("Copy this text:", shareText);
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
                      {message.role === "assistant" ? (
                        <>
                          {isSecurityAssessment(message.content) ? (
                            <ReportSummary
                              parsedResponse={parseResponse(message.content)}
                              isCached={message.cached}
                            />
                          ) : (
                            <div className="rounded-lg px-4 pt-3 lg:pb-3 bg-gray-50 text-gray-800 border border-gray-200 markdown-content overflow-x-hidden break-words">
                              {message.cached && (
                                <div className="mb-2 text-xs text-gray-500 italic flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  {t("chatbot.cachedResponse")} - <span className="text-[#006994] flex items-center gap-1"><svg className="w-3 h-3 rotate-180" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.69c-3.37 0-6 2.63-6 6 0 3.37 6 10.31 6 10.31s6-6.94 6-10.31c0-3.37-2.63-6-6-6z" /></svg>{t("chatbot.waterSaved")}</span>
                                </div>
                              )}
                              <ReactMarkdown
                                components={{
                                  h1: (props) => (
                                    <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900 border-b border-gray-200 pb-2 break-words" {...props} />
                                  ),
                                  h2: (props) => (
                                    <h2 className="text-xl font-bold mt-5 mb-3 text-gray-900 break-words" {...props} />
                                  ),
                                  h3: (props) => (
                                    <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800 break-words" {...props} />
                                  ),
                                  h4: (props) => (
                                    <h4 className="text-base font-semibold mt-3 mb-2 text-gray-800 break-words" {...props} />
                                  ),
                                  p: (props) => (
                                    <p className="mb-3 leading-7 text-gray-700 break-words" {...props} />
                                  ),
                                  ul: (props) => (
                                    <ul className="list-disc list-outside mb-3 ml-6 space-y-2 text-gray-700" {...props} />
                                  ),
                                  ol: (props) => (
                                    <ol className="list-decimal list-outside mb-3 ml-6 space-y-2 text-gray-700" {...props} />
                                  ),
                                  li: (props) => (
                                    <li className="pl-2 leading-7 break-words" {...props} />
                                  ),
                                  strong: (props) => (
                                    <strong className="font-semibold text-gray-900 break-words" {...props} />
                                  ),
                                  em: (props) => (
                                    <em className="italic text-gray-700 break-words" {...props} />
                                  ),
                                  code: ({ node, className, children, ...props }: any) => {
                                    // Check if this is inline code (no className or className doesn't start with language-)
                                    const isInline = !className || !className.startsWith('language-');
                                    return isInline ? (
                                      <code className="bg-gray-200 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800 break-words" {...props}>
                                        {children}
                                      </code>
                                    ) : (
                                      <code className="text-sm font-mono text-gray-800" {...props}>
                                        {children}
                                      </code>
                                    );
                                  },
                                  pre: (props) => (
                                    <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto mb-3 text-sm whitespace-pre-wrap break-words" {...props} />
                                  ),
                                  hr: (props) => (
                                    <hr className="my-6 border-gray-300" {...props} />
                                  ),
                                  a: (props) => (
                                    <a className="text-blue-600 hover:text-blue-800 hover:underline font-medium break-all" target="_blank" rel="noopener noreferrer" {...props} />
                                  ),
                                  blockquote: (props) => (
                                    <blockquote className="border-l-4 border-gray-300 pl-4 italic my-3 text-gray-600 break-words" {...props} />
                                  ),
                                  table: (props) => (
                                    <div className="overflow-x-auto my-4">
                                      <table className="min-w-full border-collapse border border-gray-300" {...props} />
                                    </div>
                                  ),
                                  thead: (props) => (
                                    <thead className="bg-gray-100" {...props} />
                                  ),
                                  tbody: (props) => (
                                    <tbody {...props} />
                                  ),
                                  th: (props) => (
                                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold break-words" {...props} />
                                  ),
                                  td: (props) => (
                                    <td className="border border-gray-300 px-4 py-2 break-words" {...props} />
                                  ),
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="rounded-lg px-4 py-3.5 bg-gray-100 text-black whitespace-pre-wrap break-words leading-relaxed">
                          {`${t("chatbot.reportFor")} ${message.content}`}
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && loadingConversationId === currentConversationId && (
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
              </div>
            )}
          </div>

          <div className="bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.08)] border-t border-white">
            <div className="max-w-3xl mx-auto px-4 py-2 lg:py-4 w-full">
              {hasAssistantResponse ? (
                // Show buttons when there's an assistant response
                <div className="flex items-center justify-center gap-4">
                  <div className="relative" ref={downloadDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors cursor-pointer"
                      title={t("chatbot.download")}
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
                          d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M8 12l4 4m0 0l4-4m-4 4V4"
                        />
                      </svg>
                      <span className="text-sm font-medium">{t("chatbot.download")}</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${showDownloadDropdown ? 'rotate-180' : ''}`}
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
                    {showDownloadDropdown && (
                      <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                        <button
                          type="button"
                          onClick={handleDownloadMarkdown}
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
                          onClick={handleDownloadPDF}
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
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex items-center gap-2 lg:gap-2 gap-0 px-4 lg:px-4 px-2.5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors cursor-pointer"
                    title={t("chatbot.share")}
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
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                      />
                    </svg>
                    <span className="text-sm font-medium lg:inline hidden">{t("chatbot.share")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="flex items-center gap-2 lg:gap-2 gap-0 px-4 lg:px-4 px-2.5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors cursor-pointer"
                    title={t("chatbot.edit")}
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
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    <span className="text-sm font-medium lg:inline hidden">{t("chatbot.edit")}</span>
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
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog with Text Editor */}
      {showEditDialog && (
        <div className="fixed inset-0 flex lg:items-center lg:justify-center items-start justify-start" style={{ backgroundColor: 'rgba(0,0,0,.5)', zIndex: 1000 }}>
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
                    <ReactMarkdown
                      components={{
                        h1: (props) => (
                          <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900 border-b border-gray-200 pb-2 break-words" {...props} />
                        ),
                        h2: (props) => (
                          <h2 className="text-xl font-bold mt-5 mb-3 text-gray-900 break-words" {...props} />
                        ),
                        h3: (props) => (
                          <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800 break-words" {...props} />
                        ),
                        h4: (props) => (
                          <h4 className="text-base font-semibold mt-3 mb-2 text-gray-800 break-words" {...props} />
                        ),
                        p: (props) => (
                          <p className="mb-3 leading-7 text-gray-700 break-words" {...props} />
                        ),
                        ul: (props) => (
                          <ul className="list-disc list-outside mb-3 ml-6 space-y-2 text-gray-700" {...props} />
                        ),
                        ol: (props) => (
                          <ol className="list-decimal list-outside mb-3 ml-6 space-y-2 text-gray-700" {...props} />
                        ),
                        li: (props) => (
                          <li className="pl-2 leading-7 break-words" {...props} />
                        ),
                        strong: (props) => (
                          <strong className="font-semibold text-gray-900 break-words" {...props} />
                        ),
                        em: (props) => (
                          <em className="italic text-gray-700 break-words" {...props} />
                        ),
                        code: ({ node, className, children, ...props }: any) => {
                          const isInline = !node?.position;
                          return isInline ? (
                            <code className="bg-gray-200 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800 break-words" {...props}>
                              {children}
                            </code>
                          ) : (
                            <code className="text-sm font-mono text-gray-800" {...props}>
                              {children}
                            </code>
                          );
                        },
                        pre: (props) => (
                          <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto mb-3 text-sm whitespace-pre-wrap break-words" {...props} />
                        ),
                        hr: (props) => (
                          <hr className="my-6 border-gray-300" {...props} />
                        ),
                        a: (props) => (
                          <a className="text-blue-600 hover:text-blue-800 hover:underline font-medium break-all" target="_blank" rel="noopener noreferrer" {...props} />
                        ),
                        blockquote: (props) => (
                          <blockquote className="border-l-4 border-gray-300 pl-4 italic my-3 text-gray-600 break-words" {...props} />
                        ),
                        table: (props) => (
                          <div className="overflow-x-auto my-4">
                            <table className="min-w-full border-collapse border border-gray-300" {...props} />
                          </div>
                        ),
                        thead: (props) => (
                          <thead className="bg-gray-100" {...props} />
                        ),
                        tbody: (props) => (
                          <tbody {...props} />
                        ),
                        th: (props) => (
                          <th className="border border-gray-300 px-4 py-2 text-left font-semibold break-words" {...props} />
                        ),
                        td: (props) => (
                          <td className="border border-gray-300 px-4 py-2 break-words" {...props} />
                        ),
                      }}
                    >
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

