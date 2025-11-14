"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateEmail = () => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail()) {
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement API call to send password reset email
      // const response = await fetch("/api/auth/forgot-password", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ email }),
      // });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setIsSubmitted(true);
    } catch (error) {
      setErrors({
        general: "Failed to send reset email. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-3xl bg-white p-8 border border-gray-200 shadow-lg shadow-gray-200/50">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-light text-gray-700 mb-2 tracking-wide">
              Forgot Password
            </h1>
            <p className="text-gray-500 text-sm font-light">
              Enter your email address and we'll send you a link to reset your password
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
                      Password reset email sent!
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Check your inbox at <span className="font-medium">{email}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => router.push("/")}
                  className="w-full py-3 px-4 rounded-2xl bg-gray-100 text-gray-700 font-light hover:bg-gray-200 transition-all duration-200 uppercase tracking-wider text-sm border border-gray-200 shadow-sm hover:shadow-md cursor-pointer focus:outline-none"
                >
                  Back to Login
                </button>
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setEmail("");
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-white text-gray-700 font-light hover:bg-gray-100 transition-all duration-200 uppercase tracking-wider text-sm border border-gray-200 shadow-sm hover:shadow-md cursor-pointer focus:outline-none"
                >
                  Send Another Email
                </button>
              </div>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} noValidate className="space-y-5 relative">
              {/* Error Message - Absolute positioned */}
              {errors.general && (
                <div className="absolute -top-6 left-0 right-0 h-4 animate-in fade-in duration-200 z-20">
                  <p className="pt-0.5 text-xs text-red-500 font-light">{errors.general}</p>
                </div>
              )}

              <div className="relative">
                <label
                  htmlFor="email"
                  className="block text-xs font-light text-gray-500 mb-2 uppercase tracking-wider"
                >
                  Email Address
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
                {isLoading ? "Sending..." : "Send Reset Link"}
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
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

