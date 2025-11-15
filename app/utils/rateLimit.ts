/**
 * Simple in-memory rate limiting utility
 * For production, consider using Redis or a dedicated rate limiting service
 */

import { NextRequest } from "next/server";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Rate limit check
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60 * 1000 // 1 minute default
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired entry
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(identifier, newEntry);
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      reset: newEntry.resetTime,
    };
  }

  // Increment count
  entry.count++;

  if (entry.count > maxRequests) {
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset: entry.resetTime,
    };
  }

  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - entry.count,
    reset: entry.resetTime,
  };
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: NextRequest): string {
  // Try to get IP address from various headers
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0] || realIp || "unknown";

  return ip;
}

