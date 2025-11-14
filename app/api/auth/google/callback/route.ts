import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // This route handles the OAuth callback
  // The actual processing is done in the main route
  return NextResponse.redirect(new URL("/api/auth/google", request.url));
}

