# Firestore Security Rules Setup

This document explains the Firestore security rules implementation and how to deploy them.

## Security Rules Overview

The `firestore.rules` file implements secure access controls for two collections:

### 1. `cachedResponses` Collection
- **Read Access**: All authenticated users can read cached responses
  - This enables the core functionality where users can reuse cached responses if they ask the same query
- **Write Access**: Denied for client-side operations
  - Only server-side operations using Firebase Admin SDK can write (Admin SDK bypasses security rules)

### 2. `users` Collection
- **Read Access**: Users can only read their own document
- **Write Access**: Users can only write to their own document
  - Server-side operations (Admin SDK) can write to any user document to track cache access

## Deployment

### Option 1: Using Firebase CLI (Recommended)

1. Install Firebase CLI if you haven't already:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project (if not already done):
   ```bash
   firebase init firestore
   ```

4. Deploy the security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Option 2: Using Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to Firestore Database → Rules
4. Copy the contents of `firestore.rules` and paste into the rules editor
5. Click "Publish"

## Firebase Admin SDK Setup

The server-side cache service uses Firebase Admin SDK, which bypasses security rules. This is the correct approach for server-side operations.

### Local Development

For local development, you have several options:

1. **Application Default Credentials** (Recommended for production-like environments):
   ```bash
   gcloud auth application-default login
   ```

2. **Service Account Key File**:
   - Download a service account key from Firebase Console
   - Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable:
     ```bash
     export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
     ```

3. **Environment Variable**:
   - Set `FIREBASE_SERVICE_ACCOUNT_KEY` to the JSON string of your service account key
   - Set `FIREBASE_PROJECT_ID` to your Firebase project ID

### Production Deployment

In production environments (Firebase Cloud Functions, App Engine, etc.), Firebase Admin SDK will automatically use Application Default Credentials, so no additional setup is needed.

## Security Features

1. **Client-side writes to cachedResponses are blocked**: Only server-side code can create/update cached responses
2. **User data isolation**: Users can only access their own user document
3. **Shared cache access**: All authenticated users can read cached responses, enabling the reuse functionality
4. **Server-side operations**: Admin SDK bypasses rules for legitimate server operations

## Testing

After deploying the rules, test them using the Firebase Console Rules Playground or by testing your application:

1. Try reading a cached response as an authenticated user (should succeed)
2. Try writing to cachedResponses from client-side (should fail)
3. Try reading another user's document (should fail)
4. Verify server-side operations work correctly (should succeed via Admin SDK)

## Notes

- The Admin SDK bypasses all security rules, which is intentional for server-side operations
- Client-side code should never directly write to `cachedResponses` - all writes go through the API route
- The security rules ensure that only authenticated users can access cached responses
- User tracking in the `users` collection is handled server-side for security

