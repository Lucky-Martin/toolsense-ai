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
    return adminApp;
  }

  // Check if app is already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    adminDb = getFirestore(adminApp);
    return adminApp;
  }

  // Initialize with project ID (works if running in Firebase environment or with GOOGLE_APPLICATION_CREDENTIALS)
  // For local development, you can set GOOGLE_APPLICATION_CREDENTIALS environment variable
  // pointing to a service account key JSON file
  try {
    // Try to initialize with service account if credentials are provided
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0685314272",
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Use the service account file path
      // Note: In production, prefer using Application Default Credentials
      // For local development, you can set GOOGLE_APPLICATION_CREDENTIALS to point to a service account JSON file
      try {
        // Dynamic import for ES modules compatibility
        const fs = require("fs");
        const serviceAccount = JSON.parse(
          fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8")
        );
        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0685314272",
        });
      } catch (error) {
        console.warn("Failed to load service account from GOOGLE_APPLICATION_CREDENTIALS, using default credentials");
        // Fall through to default initialization
      }
    }

    if (!adminApp) {
      // Initialize with project ID only (works in Firebase Cloud Functions, App Engine, etc.)
      // For local development, you may need to set up Application Default Credentials
      // or set FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS
      adminApp = initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0685314272",
      });
    }

    adminDb = getFirestore(adminApp);
    return adminApp;
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);
    throw error;
  }
}

export function getAdminDb(): FirebaseFirestore.Firestore {
  if (!adminDb) {
    initializeAdminApp();
  }
  if (!adminDb) {
    throw new Error("Failed to initialize Firebase Admin Firestore");
  }
  return adminDb;
}

export function getAdminApp(): App {
  return initializeAdminApp();
}

