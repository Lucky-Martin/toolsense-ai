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

class ConversationService {
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
  }
}

export const conversationService = new ConversationService();

