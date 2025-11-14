# Google OAuth Setup Guide

This guide will walk you through setting up Google OAuth authentication for this application.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "ToolSense AI")
5. Click "Create"

## Step 2: Enable Google+ API

1. In the Google Cloud Console, navigate to **APIs & Services** > **Library**
2. Search for "Google+ API" or "Google Identity Services"
3. Click on it and click **Enable**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **External** (unless you have a Google Workspace account)
3. Fill in the required information:
   - App name: Your app name
   - User support email: Your email
   - Developer contact information: Your email
4. Click **Save and Continue**
5. Add scopes (if needed):
   - `openid`
   - `email`
   - `profile`
6. Click **Save and Continue**
7. Add test users (for development) or publish the app

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Choose **Web application** as the application type
4. Fill in the details:
   - **Name**: Your app name
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for development)
     - `https://yourdomain.com` (for production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/google` (for development)
     - `https://yourdomain.com/api/auth/google` (for production)
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

## Step 5: Configure Environment Variables

Create a `.env.local` file in the root of your project:

```env
# Google OAuth Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here

# Base URL (change for production)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Gemini API Key (for chatbot)
GEMINI_API_KEY=your_gemini_api_key_here
```

**Important Notes:**
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is used in the client-side code (safe to expose)
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are used in server-side API routes (keep secret)
- Never commit `.env.local` to version control

## Step 6: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000`
3. Click the "Google" button to test authentication
4. You should be redirected to Google's sign-in page
5. After signing in, you'll be redirected back to your app

## Troubleshooting

### "redirect_uri_mismatch" Error

- Make sure the redirect URI in your `.env.local` matches exactly what you configured in Google Cloud Console
- Check that `NEXT_PUBLIC_BASE_URL` is set correctly
- The redirect URI should be: `{NEXT_PUBLIC_BASE_URL}/api/auth/google`

### "invalid_client" Error

- Verify that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Make sure there are no extra spaces or quotes in your `.env.local` file

### "access_denied" Error

- Check that you've added test users in the OAuth consent screen (for development)
- Make sure the app is published or you're using a test user account

### Environment Variables Not Loading

- Restart your development server after adding/changing `.env.local`
- Make sure the file is named exactly `.env.local` (not `.env` or `.env.example`)
- Variables prefixed with `NEXT_PUBLIC_` are available in client-side code
- Other variables are only available in server-side code (API routes)

## Production Deployment

When deploying to production:

1. Update the OAuth consent screen to "Published" status
2. Add your production domain to authorized origins and redirect URIs
3. Update `NEXT_PUBLIC_BASE_URL` to your production URL
4. Set environment variables in your hosting platform (Vercel, Netlify, etc.)
5. Ensure `NODE_ENV=production` is set (for secure cookies)

## Security Best Practices

- Never expose `GOOGLE_CLIENT_SECRET` in client-side code
- Use HTTPS in production
- Keep your `.env.local` file out of version control
- Regularly rotate your OAuth credentials
- Use environment-specific credentials for development and production

