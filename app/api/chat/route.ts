import { NextRequest, NextResponse } from "next/server";
import { geminiService, ChatMessage } from "../../services/gemini";
import { firebaseCacheService } from "../../services/firebaseCache";

export async function POST(request: NextRequest) {
  try {
    const { message, history = [], languageId = "en", userId } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured. Please set it in your .env.local file." },
        { status: 500 }
      );
    }

    // Normalize language code (default to "en" if not provided)
    const language = languageId || "en";

    // Check cache first (only for new queries, not follow-up questions)
    const isNewQuery = history.length === 0;
    let cachedResponse: string | null = null;
    let fromCache = false;

    if (isNewQuery) {
      cachedResponse = await firebaseCacheService.get(message, language, userId);
      if (cachedResponse) {
        fromCache = true;
      }
    }

    let responseData: { message: string; model: string };

    if (fromCache && cachedResponse) {
      // Use cached response
      responseData = {
        message: cachedResponse,
        model: "gemini-2.5-pro", // Default model name for cached responses
      };
    } else {
      // Use the Gemini service to send the message with language
      const response = await geminiService.sendMessage(
        message,
        history as ChatMessage[],
        language
      );

      responseData = {
        message: response.message,
        model: response.model,
      };

      // Cache the response if it's a new query
      if (isNewQuery && responseData.message) {
        await firebaseCacheService.set(
          message,
          responseData.message,
          responseData.model,
          language,
          userId
        );
      }
    }

    return NextResponse.json({
      message: responseData.message,
      model: responseData.model,
      success: true,
      cached: fromCache,
    });
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return NextResponse.json(
      {
        error: "Failed to get response from Gemini API",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

