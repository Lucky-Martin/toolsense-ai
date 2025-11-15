/**
 * Conversation Storage Service
 *
 * Manages conversation persistence using localStorage.
 * Each conversation contains messages and metadata.
 */

export interface Message {
  role: "user" | "assistant";
  content: string;
  cached?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "toolsense_conversations";
const MAX_CONVERSATIONS = 100;
const STORAGE_EVENT_NAME = "toolsense_conversations_changed";

class ConversationService {
  private listeners: Set<() => void> = new Set();

  /**
   * Subscribe to conversation changes
   */
  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all subscribers of changes
   */
  private notify(): void {
    // Dispatch custom event for cross-tab sync
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(STORAGE_EVENT_NAME));
    }
    // Notify direct subscribers
    this.listeners.forEach((callback) => callback());
  }
  /**
   * Get all conversations from storage
   */
  getAllConversations(): Conversation[] {
    if (typeof window === "undefined") return [];

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const conversations: Conversation[] = JSON.parse(stored);
      // Sort by updatedAt descending (most recent first)
      return conversations.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (error) {
      console.error("Error loading conversations:", error);
      return [];
    }
  }

  /**
   * Get a specific conversation by ID
   */
  getConversation(id: string): Conversation | null {
    const conversations = this.getAllConversations();
    return conversations.find((conv) => conv.id === id) || null;
  }

  /**
   * Normalize a query to match conversations (same logic as cache normalization)
   */
  private normalizeQuery(query: string): string {
    let normalized = query.toLowerCase().trim();

    // Extract domain from URLs
    try {
      const url = new URL(normalized.startsWith("http") ? normalized : `https://${normalized}`);
      normalized = url.hostname.replace("www.", "");
    } catch {
      // Not a URL, continue with normalization
    }

    // Remove common prefixes/suffixes
    normalized = normalized
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return normalized;
  }

  /**
   * Find an existing conversation by the first user message (normalized query)
   * This allows reusing conversations when the user asks for the same query again
   * @param query - The user's query to search for
   * @returns The existing conversation or null if not found
   */
  findConversationByQuery(query: string): Conversation | null {
    const conversations = this.getAllConversations();
    const normalizedQuery = this.normalizeQuery(query);

    // Find conversation where the first user message matches the normalized query
    for (const conversation of conversations) {
      const firstUserMessage = conversation.messages.find((msg) => msg.role === "user");
      if (firstUserMessage) {
        const firstMessageNormalized = this.normalizeQuery(firstUserMessage.content);
        if (firstMessageNormalized === normalizedQuery) {
          return conversation;
        }
      }
    }

    return null;
  }

  /**
   * Save a conversation
   */
  saveConversation(conversation: Conversation): void {
    if (typeof window === "undefined") return;

    try {
      const conversations = this.getAllConversations();

      // Remove existing conversation if it exists
      const filtered = conversations.filter((conv) => conv.id !== conversation.id);

      // Add updated conversation
      filtered.push(conversation);

      // Keep only the most recent MAX_CONVERSATIONS
      const sorted = filtered.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ).slice(0, MAX_CONVERSATIONS);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
      this.notify();
    } catch (error) {
      console.error("Error saving conversation:", error);
    }
  }

  /**
   * Create a new conversation
   */
  createConversation(title: string, initialMessage?: Message): Conversation {
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title || "New Conversation",
      messages: initialMessage ? [initialMessage] : [],
      createdAt: now,
      updatedAt: now,
    };

    this.saveConversation(conversation);
    return conversation;
  }

  /**
   * Update conversation messages
   */
  updateConversation(id: string, messages: Message[], title?: string): void {
    const conversation = this.getConversation(id);
    if (!conversation) return;

    conversation.messages = messages;
    conversation.updatedAt = new Date().toISOString();

    // Update title if provided, or generate from first user message
    if (title) {
      conversation.title = title;
    } else if (messages.length > 0) {
      const firstUserMessage = messages.find((msg) => msg.role === "user");
      if (firstUserMessage) {
        // Use first 50 characters of first user message as title
        // Check if title already has "Report for" prefix (in various languages)
        const existingTitle = conversation.title || "";
        const queryName = firstUserMessage.content.substring(0, 50).trim() || "New Conversation";

        // If title already has a report prefix, preserve it, otherwise use just the query name
        // (The component will add the prefix when creating/updating)
        conversation.title = existingTitle.includes("Report for") ||
                            existingTitle.includes("报告：") ||
                            existingTitle.includes("Informe para") ||
                            existingTitle.includes("Rapport") ||
                            existingTitle.includes("Bericht") ||
                            existingTitle.includes("Отчет") ||
                            existingTitle.includes("レポート") ||
                            existingTitle.includes("보고서") ||
                            existingTitle.includes("Rapporto") ||
                            existingTitle.includes("Raport")
          ? existingTitle
          : queryName;
      }
    }

    this.saveConversation(conversation);
  }

  /**
   * Delete a conversation
   */
  deleteConversation(id: string): void {
    if (typeof window === "undefined") return;

    try {
      const conversations = this.getAllConversations();
      const filtered = conversations.filter((conv) => conv.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      this.notify();
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  }

  /**
   * Clear all conversations
   */
  clearAllConversations(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
    this.notify();
  }

  /**
   * Get the storage event name for cross-tab listening
   */
  getStorageEventName(): string {
    return STORAGE_EVENT_NAME;
  }
}

export const conversationService = new ConversationService();

