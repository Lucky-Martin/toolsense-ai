"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { useTranslation } from "@/app/contexts/TranslationContext";
import { auth } from "@/app/lib/firebase";
import Navbar from "./Navbar";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateEmail = () => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = t("auth.errors.emailRequired");
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = t("auth.errors.emailInvalid");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getFirebaseErrorMessage = (error: FirebaseError): string => {
    switch (error.code) {
      case "auth/user-not-found":
        return t("auth.errors.userNotFound");
      case "auth/invalid-email":
        return t("auth.errors.emailInvalid");
      case "auth/too-many-requests":
        return t("auth.errors.tooManyRequests");
      case "auth/network-request-failed":
        return t("auth.errors.networkError");
      default:
        return t("auth.forgotPasswordPage.failedToSend");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await sendPasswordResetEmail(auth, email);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Failed to send reset email:", error);
      if (error instanceof FirebaseError) {
        setErrors({
          general: getFirebaseErrorMessage(error),
        });
      } else if (error instanceof Error) {
        setErrors({
          general: error.message || t("auth.forgotPasswordPage.failedToSend"),
        });
      } else {
        setErrors({
          general: t("auth.forgotPasswordPage.failedToSend"),
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-12">
      <Navbar />
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-3xl bg-white p-8 border border-gray-200 shadow-lg shadow-gray-200/50">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-light text-gray-700 mb-2 tracking-wide">
              {t("auth.forgotPasswordPage.title")}
            </h1>
            <p className="text-gray-500 text-sm font-light">
              {t("auth.forgotPasswordPage.description")}
            </p>
          </div>

          {isSubmitted ? (
            /* Success Message */
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-green-50 border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-light text-gray-700">
                      {t("auth.forgotPasswordPage.emailSent")}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {t("auth.forgotPasswordPage.checkInbox")} <span className="font-medium">{email}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => router.push("/")}
                  className="w-full py-3 px-4 rounded-2xl bg-gray-100 text-gray-700 font-light hover:bg-gray-200 transition-all duration-200 uppercase tracking-wider text-sm border border-gray-200 shadow-sm hover:shadow-md cursor-pointer focus:outline-none"
                >
                  {t("auth.forgotPasswordPage.backToLogin")}
                </button>
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setEmail("");
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-white text-gray-700 font-light hover:bg-gray-100 transition-all duration-200 uppercase tracking-wider text-sm border border-gray-200 shadow-sm hover:shadow-md cursor-pointer focus:outline-none"
                >
                  {t("auth.forgotPasswordPage.sendAnotherEmail")}
                </button>
              </div>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} noValidate className="space-y-5 relative">
              {/* Error Message - Absolute positioned */}
              {errors.general && (
                <div className="absolute -top-7 left-0 right-0 animate-in fade-in duration-200 z-20">
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-xs text-red-600 font-light">{errors.general}</p>
                  </div>
                </div>
              )}

              <div className="relative">
                <label
                  htmlFor="email"
                  className="block text-xs font-light text-gray-500 mb-2 uppercase tracking-wider"
                >
                  {t("auth.emailAddress")}
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) {
                      setErrors((prev) => ({ ...prev, email: "" }));
                    }
                  }}
                  className={`w-full px-4 py-3 rounded-2xl bg-white border ${
                    errors.email
                      ? "border-red-400 focus:border-red-500"
                      : "border-gray-200 focus:border-gray-300"
                  } text-gray-700 placeholder-gray-400 focus:outline-none transition-all font-light shadow-sm focus:shadow-md`}
                  placeholder="you@example.com"
                  disabled={isLoading}
                />
                <div className="h-4 relative">
                  {errors.email && (
                    <p className="absolute top-0.5 left-0 text-xs text-red-500 font-light animate-in fade-in duration-200">
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-2xl bg-gray-100 text-gray-700 font-light hover:bg-gray-200 transition-all duration-200 uppercase tracking-wider text-sm border border-gray-200 shadow-sm hover:shadow-md cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? t("auth.forgotPasswordPage.sending") : t("auth.forgotPasswordPage.sendResetLink")}
              </button>
            </form>
          )}

          {/* Back to Login Link */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-xs text-gray-500 hover:text-gray-700 font-light transition-colors inline-flex items-center gap-1"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              {t("auth.forgotPasswordPage.backToLogin")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

