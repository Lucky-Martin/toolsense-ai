import { NextRequest, NextResponse } from "next/server";
import { geminiService, ChatMessage } from "../../services/gemini";
import { cacheService } from "../../services/cache";

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();

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

    // Check cache first (only for new queries, not follow-up questions)
    // If there's no history, it's likely a new assessment request
    const isNewQuery = history.length === 0;
    let response: string;
    let fromCache = false;

    if (isNewQuery) {
      const cachedResponse = cacheService.get(message);
      if (cachedResponse) {
        response = cachedResponse;
        fromCache = true;
      } else {
        // Use the Gemini service to send the message
        response = await geminiService.sendMessage(
          message,
          history as ChatMessage[]
        );

        // Cache the response
        cacheService.set(message, response, "gemini-2.5-pro");
      }
    } else {
      // For follow-up questions, don't use cache
      response = await geminiService.sendMessage(
        message,
        history as ChatMessage[]
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

