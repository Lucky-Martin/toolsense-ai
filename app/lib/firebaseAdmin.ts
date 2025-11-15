/**
 * Firebase Admin SDK Initialization
 *
 * Used for server-side operations in API routes.
 * Admin SDK bypasses Firestore security rules, so it's perfect for server-side caching.
 */

import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let adminApp: App | null = null;
let adminDb: FirebaseFirestore.Firestore | null = null;

function initializeAdminApp(): App {
  if (adminApp) {
    console.log("[Firebase Admin] Using existing initialized app");
    return adminApp;
  }

  // Check if app is already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    console.log(`[Firebase Admin] Found ${existingApps.length} existing app(s), reusing first one`);
    adminApp = existingApps[0];
    adminDb = getFirestore(adminApp);
    return adminApp;
  }

  console.log("[Firebase Admin] Initializing new Firebase Admin app...");
  console.log("[Firebase Admin] Environment check:");
  console.log(`  - FIREBASE_SERVICE_ACCOUNT_KEY: ${process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? "SET (length: " + process.env.FIREBASE_SERVICE_ACCOUNT_KEY.length + ")" : "NOT SET"}`);
  console.log(`  - GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || "NOT SET"}`);
  console.log(`  - FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID || "NOT SET (using default: gen-lang-client-0685314272)"}`);

  // Initialize with project ID (works if running in Firebase environment or with GOOGLE_APPLICATION_CREDENTIALS)
  // For local development, you can set GOOGLE_APPLICATION_CREDENTIALS environment variable
  // pointing to a service account key JSON file
  try {
    // Try to initialize with service account if credentials are provided
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.log("[Firebase Admin] Attempting to initialize with FIREBASE_SERVICE_ACCOUNT_KEY...");
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0685314272",
        });
        console.log("[Firebase Admin] Successfully initialized with FIREBASE_SERVICE_ACCOUNT_KEY");
      } catch (parseError) {
        console.error("[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", parseError);
        throw parseError;
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log(`[Firebase Admin] Attempting to initialize with GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
      // Use the service account file path
      // Note: In production, prefer using Application Default Credentials
      // For local development, you can set GOOGLE_APPLICATION_CREDENTIALS to point to a service account JSON file
      try {
        // Dynamic import for ES modules compatibility
        const fs = require("fs");
        const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        console.log(`[Firebase Admin] Reading service account file from: ${path}`);

        if (!fs.existsSync(path)) {
          throw new Error(`Service account file not found at: ${path}`);
        }

        const fileContent = fs.readFileSync(path, "utf8");
        const serviceAccount = JSON.parse(fileContent);
        console.log(`[Firebase Admin] Successfully parsed service account file, project_id: ${serviceAccount.project_id}`);

        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id || "gen-lang-client-0685314272",
        });
        console.log("[Firebase Admin] Successfully initialized with GOOGLE_APPLICATION_CREDENTIALS");
      } catch (fileError) {
        console.error("[Firebase Admin] Failed to load service account from GOOGLE_APPLICATION_CREDENTIALS:", fileError);
        throw fileError;
      }
    }

    if (!adminApp) {
      console.warn("[Firebase Admin] No credentials found, attempting to initialize with project ID only...");
      console.warn("[Firebase Admin] This will only work in Firebase Cloud Functions, App Engine, or with Application Default Credentials");
      // Initialize with project ID only (works in Firebase Cloud Functions, App Engine, etc.)
      // For local development, you may need to set up Application Default Credentials
      // or set FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS
      adminApp = initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0685314272",
      });
      console.log("[Firebase Admin] Initialized with project ID only (may fail on first use without credentials)");
    }

    adminDb = getFirestore(adminApp);
    console.log("[Firebase Admin] Firebase Admin app initialized successfully");
    return adminApp;
  } catch (error) {
    console.error("[Firebase Admin] Error initializing Firebase Admin:", error);
    console.error("[Firebase Admin] Error details:", error instanceof Error ? error.message : String(error));
    console.error("[Firebase Admin] Stack:", error instanceof Error ? error.stack : "No stack trace");
    throw error;
  }
}

export function getAdminDb(): FirebaseFirestore.Firestore {
  if (!adminDb) {
    try {
      initializeAdminApp();
    } catch (error) {
      console.error("Failed to initialize Firebase Admin:", error);
      throw new Error(`Failed to initialize Firebase Admin: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (!adminDb) {
    const errorMsg = "Failed to initialize Firebase Admin Firestore. Please check your Firebase credentials.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  return adminDb;
}

export function getAdminApp(): App {
  return initializeAdminApp();
}

