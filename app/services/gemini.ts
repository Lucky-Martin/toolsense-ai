/**
 * Gemini API Service
 *
 * This service provides a clean interface for interacting with the Gemini API.
 * You can use this service directly in server components or API routes.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  message: string;
  success: boolean;
}

class GeminiService {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = "gemini-pro";
  }

  /**
   * Send a message to Gemini and get a response
   * @param message - The user's message
   * @param history - Optional conversation history
   * @returns The assistant's response
   */
  async sendMessage(
    message: string,
    history: ChatMessage[] = []
  ): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });

    // Build conversation history for Gemini
    const chatHistory = history.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    // Start a chat session with history
    const chat = model.startChat({
      history: chatHistory,
    });

    // Send the message and get response
    const result = await chat.sendMessage(message);
    const response = await result.response;
    return response.text();
  }

  /**
   * Get a streaming response from Gemini
   * @param message - The user's message
   * @param history - Optional conversation history
   * @returns An async generator that yields response chunks
   */
  async* streamMessage(
    message: string,
    history: ChatMessage[] = []
  ): AsyncGenerator<string, void, unknown> {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });

    const chatHistory = history.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: chatHistory,
    });

    const result = await chat.sendMessageStream(message);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      yield chunkText;
    }
  }
}

// Export a singleton instance
export const geminiService = new GeminiService();

