This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Firebase project (for authentication)
- Gemini API key (for chatbot)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

### Environment Variables Setup

Create a `.env.local` file in the root directory with the following variables:

```env
# Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here
```

**Note:** Firebase configuration is already set up in `app/lib/firebase.ts`. If you need to use your own Firebase project, update the configuration in that file.

### Firebase Authentication Setup

This project uses Firebase Authentication for Google sign-in. The Firebase configuration is already set up in `app/lib/firebase.ts` with the following credentials:

- **Project ID**: `gen-lang-client-0685314272`
- **Auth Domain**: `gen-lang-client-0685314272.firebaseapp.com`

#### To use your own Firebase project:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable Authentication:
   - Navigate to "Authentication" > "Sign-in method"
   - Enable "Google" as a sign-in provider
   - Add your domain to authorized domains if needed
4. Get your Firebase config:
   - Go to Project Settings > General
   - Scroll down to "Your apps" and click the web icon (`</>`)
   - Copy the Firebase configuration object
5. Update `app/lib/firebase.ts` with your Firebase configuration

### Running the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
