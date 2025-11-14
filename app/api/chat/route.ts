import { NextRequest, NextResponse } from "next/server";
import { geminiService, ChatMessage } from "../../services/gemini";

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

    // Use the Gemini service to send the message with language
    // Caching is now handled client-side using IndexedDB
    const response = await geminiService.sendMessage(
      message,
      history as ChatMessage[],
      language
    );

    return NextResponse.json({
      message: response,
      success: true,
      cached: false, // Cache is handled client-side, so API always returns false
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

