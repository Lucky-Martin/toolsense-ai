import { NextRequest, NextResponse } from "next/server";
import { geminiService, ChatMessage } from "../../services/gemini";
import { cacheService } from "../../services/cache";

export async function POST(request: NextRequest) {
  try {
    const { message, history = [], languageId = "en" } = await request.json();

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
    // If there's no history, it's likely a new assessment request
    const isNewQuery = history.length === 0;
    let response: string;
    let fromCache = false;

    if (isNewQuery) {
      // Check cache for this specific language
      const cachedResponse = cacheService.get(message, language);
      if (cachedResponse) {
        response = cachedResponse;
        fromCache = true;
      } else {
        // Use the Gemini service to send the message with language
        response = await geminiService.sendMessage(
          message,
          history as ChatMessage[],
          language
        );

        // Cache the response with language
        cacheService.set(message, response, "gemini-2.5-pro", language);
      }
    } else {
      // For follow-up questions, don't use cache but still use language
      response = await geminiService.sendMessage(
        message,
        history as ChatMessage[],
        language
      );
    }

    return NextResponse.json({
      message: response,
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

