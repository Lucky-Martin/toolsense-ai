import { NextRequest, NextResponse } from "next/server";
import { geminiService, ChatMessage } from "../../services/gemini";
import { firebaseCacheService } from "../../services/firebaseCache";
import { validateInput, validateHistory } from "../../utils/inputValidation";
import { checkRateLimit, getClientIdentifier } from "../../utils/rateLimit";
import { getUserIdFromRequest } from "../../utils/auth";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 20 requests per minute per IP
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, 20, 60 * 1000);

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          details: "Too many requests. Maximum 20 requests per minute."
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.reset.toString(),
            "Retry-After": Math.ceil((rateLimit.reset - Date.now()) / 1000).toString(),
          }
        }
      );
    }

    const { message, history = [], languageId = "en", userId } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate input for security
    const inputValidation = validateInput(message);
    if (!inputValidation.isValid) {
      return NextResponse.json(
        {
          error: "Invalid input. Please provide a product name, company name, or URL.",
        },
        { status: 400 }
      );
    }

    // Validate conversation history
    if (history && history.length > 0) {
      if (!Array.isArray(history)) {
        return NextResponse.json(
          { error: "Invalid conversation history format." },
          { status: 400 }
        );
      }

      const historyValidation = validateHistory(history);
      if (!historyValidation.isValid) {
        return NextResponse.json(
          { error: "Invalid conversation history." },
          { status: 400 }
        );
      }
    }

    // Use sanitized input
    const sanitizedMessage = inputValidation.sanitizedInput || message;

    // Validate languageId - ensure it's a valid language code
    // Cache is language-specific: same query in different languages creates separate cache entries
    // Example: "gitlab:en" and "gitlab:ru" are different cache entries
    const validLanguages = [
      "en", "zh", "es", "fi", "de", "fr", "ru", "hi", "ar", "pt", "bn", "ja",
      "pa", "jv", "ko", "te", "vi", "it", "tr", "pl", "uk", "th", "nl", "el",
      "cs", "sv", "ro", "hu", "id", "ms"
    ];
    const normalizedLanguage = (languageId || "en").toLowerCase().trim();
    const finalLanguage = validLanguages.includes(normalizedLanguage) ? normalizedLanguage : "en";

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again later." },
        { status: 500 }
      );
    }

    // Get authenticated user ID (optional - for analytics)
    const authenticatedUserId = await getUserIdFromRequest(request);
    const userIdForCache = authenticatedUserId || userId || null;

    // Check cache first (only for new queries, not follow-up questions)
    // NOTE: Cache is shared across ALL users. If User 1 asked for "gitlab" in English
    // and it was cached, User 2 asking for "gitlab" in English will get the cached response.
    const isNewQuery = history.length === 0;

    let cachedResponse: string | null = null;
    let fromCache = false;

    if (isNewQuery) {
      // IMPORTANT: Cache is language-specific
      // Cache lookup is based on normalized query + language only
      // Example: "gitlab" in English ("gitlab:en") and "gitlab" in Russian ("gitlab:ru")
      // are separate cache entries. If cache exists for "gitlab:en" but user requests
      // "gitlab:ru", this will return null and trigger a new API call in Russian.
      // userId is passed for analytics tracking only, not for cache filtering
      cachedResponse = await firebaseCacheService.get(sanitizedMessage, finalLanguage, userIdForCache);
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
        sanitizedMessage,
        history as ChatMessage[],
        finalLanguage
      );

      responseData = {
        message: response.message,
        model: response.model,
      };

      // Cache the response if it's a new query
      // IMPORTANT: Response is cached with the specific language code
      // This ensures that the same query in different languages creates separate cache entries
      // Example: "gitlab" requested in Russian will be cached as "gitlab:ru"
      // and will NOT be returned when someone requests "gitlab" in English
      if (isNewQuery && responseData.message) {
        try {
          await firebaseCacheService.set(
            sanitizedMessage,
            responseData.message,
            responseData.model,
            finalLanguage,
            userIdForCache
          );
        } catch (cacheError) {
          // Log cache errors but don't fail the request
          // Cache failures should not affect user experience
        }
      }
    }

    return NextResponse.json(
      {
        message: responseData.message,
        model: responseData.model,
        success: true,
        cached: fromCache,
      },
      {
        headers: {
          "X-RateLimit-Limit": rateLimit.limit.toString(),
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Reset": rateLimit.reset.toString(),
        }
      }
    );
  } catch (error) {
    // Don't expose internal error details
    return NextResponse.json(
      {
        error: "An error occurred while processing your request. Please try again later.",
      },
      { status: 500 }
    );
  }
}

