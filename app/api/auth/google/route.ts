import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Handle OAuth errors from Google
  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent("Authentication failed")}`, request.url)
    );
  }

  // If no code, redirect to home (user might have navigated here directly)
  if (!code) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Validate environment variables
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(
      new URL("/?error=oauth_not_configured", request.url)
    );
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/auth/google`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for tokens");
    }

    const tokens = await tokenResponse.json();

    // Get user info from Google
    const userResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    if (!userResponse.ok) {
      throw new Error("Failed to get user info");
    }

    const user = await userResponse.json();

    // SECURITY: Do not store access token in session
    // Only store minimal user info needed for session
    // Access token should not be stored client-side
    const sessionData = {
      email: user.email,
      name: user.name,
      picture: user.picture,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
    };

    // Create a session token (in production, use proper session management like JWT)
    // For now, using base64 but this should be replaced with proper JWT signing
    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString("base64");

    // Redirect to home (don't pass token in URL for security)
    const redirectUrl = new URL("/", request.url);

    // Set cookie with session token (httpOnly prevents XSS access)
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set("auth_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    // Don't log sensitive error details
    return NextResponse.redirect(
      new URL(
        `/?error=${encodeURIComponent("Authentication failed")}`,
        request.url
      )
    );
  }
}

