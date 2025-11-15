/**
 * Authentication utilities for API routes
 */

import { NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/app/lib/firebaseAdmin";

/**
 * Verify Firebase ID token from Authorization header
 */
export async function verifyFirebaseToken(
  request: NextRequest
): Promise<{ uid: string; email?: string } | null> {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const idToken = authHeader.split("Bearer ")[1];

    if (!idToken) {
      return null;
    }

    // Verify token using Firebase Admin SDK
    try {
      const admin = getAdminApp();
      const adminAuth = getAuth(admin);
      const decodedToken = await adminAuth.verifyIdToken(idToken);

      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
      };
    } catch (adminError) {
      // Admin SDK not available or initialization failed
      // This allows the app to work but without server-side auth verification
      return null;
    }
  } catch (error) {
    // Token verification failed
    return null;
  }
}

/**
 * Get user ID from request (checks both Authorization header and userId param)
 * For client-side requests, userId may be passed in body
 */
export async function getUserIdFromRequest(
  request: NextRequest
): Promise<string | null> {
  // First try to verify Firebase token
  const tokenData = await verifyFirebaseToken(request);
  if (tokenData) {
    return tokenData.uid;
  }

  // Fallback: check if userId is in request body (for client-side calls)
  // Note: This is less secure but allows the app to function
  // In production, always require Authorization header
  try {
    const body = await request.clone().json();
    if (body?.userId && typeof body.userId === "string") {
      return body.userId;
    }
  } catch {
    // Body parsing failed, ignore
  }

  return null;
}

