import { NextRequest, NextResponse } from "next/server";
import { geminiService, ChatMessage } from "../../services/gemini";
import { firebaseCacheService } from "../../services/firebaseCache";
import { validateInput, validateHistory } from "../../utils/inputValidation";

export async function POST(request: NextRequest) {
  try {
    console.log("[API Chat] POST - Request received");
    const { message, history = [], languageId = "en", userId } = await request.json();
    console.log(`[API Chat] POST - Request data: message="${message}", history.length=${history.length}, languageId="${languageId}", userId="${userId || "none"}"`);

    if (!message) {
      console.error("[API Chat] POST - Error: Message is required");
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Validate input for security
    const inputValidation = validateInput(message);
    if (!inputValidation.isValid) {
      console.error("[API Chat] POST - Input validation failed:", inputValidation.error);
      return NextResponse.json(
        {
          error: inputValidation.error || "Invalid input. Please provide a product name, company name, or URL.",
          details: "Input validation failed for security reasons."
        },
        { status: 400 }
      );
    }

    // Validate conversation history
    if (history && history.length > 0) {
      const historyValidation = validateHistory(history);
      if (!historyValidation.isValid) {
        console.error("[API Chat] POST - History validation failed:", historyValidation.error);
        return NextResponse.json(
          {
            error: historyValidation.error || "Invalid conversation history.",
            details: "History validation failed for security reasons."
          },
          { status: 400 }
        );
      }
    }

    // Use sanitized input
    const sanitizedMessage = inputValidation.sanitizedInput || message;

    if (!process.env.GEMINI_API_KEY) {
      console.error("[API Chat] POST - Error: GEMINI_API_KEY not configured");
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured. Please set it in your .env.local file." },
        { status: 500 }
      );
    }

    // Normalize language code (default to "en" if not provided)
    const language = languageId || "en";
    console.log(`[API Chat] POST - Using language: ${language}`);

    // Check cache first (only for new queries, not follow-up questions)
    // NOTE: Cache is shared across ALL users. If User 1 asked for "gitlab" in English
    // and it was cached, User 2 asking for "gitlab" in English will get the cached response.
    const isNewQuery = history.length === 0;
    console.log(`[API Chat] POST - Is new query: ${isNewQuery}`);

    let cachedResponse: string | null = null;
    let fromCache = false;

    if (isNewQuery) {
      console.log(`[API Chat] POST - Checking Firebase cache for new query: "${sanitizedMessage}"`);
      // userId is passed for analytics tracking only, not for cache filtering
      // Cache lookup is based on normalized query + language only
      cachedResponse = await firebaseCacheService.get(sanitizedMessage, language, userId);
      if (cachedResponse) {
        fromCache = true;
        console.log(`[API Chat] POST - Cache hit! Using cached response (length: ${cachedResponse.length})`);
      } else {
        console.log(`[API Chat] POST - Cache miss, will call Gemini API`);
      }
    } else {
      console.log(`[API Chat] POST - Follow-up question, skipping cache check`);
    }

    let responseData: { message: string; model: string };

    if (fromCache && cachedResponse) {
      // Use cached response
      console.log(`[API Chat] POST - Returning cached response`);
      responseData = {
        message: cachedResponse,
        model: "gemini-2.5-pro", // Default model name for cached responses
      };
    } else {
      // Use the Gemini service to send the message with language
      console.log(`[API Chat] POST - Calling Gemini API...`);
      const response = await geminiService.sendMessage(
        sanitizedMessage,
        history as ChatMessage[],
        language
      );
      console.log(`[API Chat] POST - Gemini API responded, model: ${response.model}, message length: ${response.message.length}`);

      responseData = {
        message: response.message,
        model: response.model,
      };

      // Cache the response if it's a new query
      if (isNewQuery && responseData.message) {
        console.log(`[API Chat] POST - Attempting to cache response to Firebase...`);
        try {
          await firebaseCacheService.set(
            sanitizedMessage,
            responseData.message,
            responseData.model,
            language,
            userId
          );
          console.log(`[API Chat] POST - Successfully cached response for: ${sanitizedMessage} (language: ${language})`);
        } catch (cacheError) {
          // Log cache errors but don't fail the request
          console.error("[API Chat] POST - Failed to cache response to Firebase:", cacheError);
          console.error("[API Chat] POST - Cache error details:", cacheError instanceof Error ? cacheError.message : String(cacheError));
          // Still return the response even if caching fails
        }
      } else {
        console.log(`[API Chat] POST - Skipping cache (isNewQuery: ${isNewQuery}, hasMessage: ${!!responseData.message})`);
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

