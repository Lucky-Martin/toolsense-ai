"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithPopup, signInWithRedirect, GoogleAuthProvider, getRedirectResult } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function Authentication() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check for redirect result after Firebase authentication
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          // User signed in via redirect
          router.push("/chat");
        }
      })
      .catch((error) => {
        console.error("Redirect sign-in error:", error);
        setErrors({ general: "Authentication failed" });
      });

    // Check for any URL error parameters
    const error = searchParams.get("error");
    if (error) {
      setErrors({ general: error });
    }
  }, [searchParams, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const checkPasswordRequirements = () => {
    const password = formData.password;
    return {
      minLength: password.length >= 6,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
    };
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!isLogin) {
      const requirements = checkPasswordRequirements();
      if (!requirements.minLength || !requirements.hasUpperCase || !requirements.hasLowerCase || !requirements.hasNumber) {
        newErrors.password = "Password does not meet requirements";
      }
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!isLogin) {
      if (!formData.name) {
        newErrors.name = "Name is required";
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Handle form submission here
      console.log(isLogin ? "Login" : "Signup", formData);
      // You can add API calls here
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrors({});

    try {
      const provider = new GoogleAuthProvider();
      
      // Try popup first, fallback to redirect if blocked
      try {
        const result = await signInWithPopup(auth, provider);
        // User signed in successfully
        router.push("/chat");
      } catch (popupError: any) {
        if (popupError.code === "auth/popup-blocked" || popupError.code === "auth/popup-closed-by-user") {
          // Fallback to redirect if popup is blocked
          await signInWithRedirect(auth, provider);
          // Note: signInWithRedirect will navigate away, so we don't need to handle the result here
          // The useEffect will handle the redirect result
        } else {
          throw popupError;
        }
      }
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      setIsLoading(false);
      
      if (error.code === "auth/popup-closed-by-user") {
        setErrors({ general: "Sign-in was cancelled" });
      } else if (error.code === "auth/popup-blocked") {
        setErrors({ general: "Popup was blocked. Using redirect instead..." });
        // Will be handled by redirect flow
      } else {
        setErrors({ general: error.message || "Failed to sign in with Google" });
      }
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
              {isLogin ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-gray-500 text-sm font-light">
              {isLogin
                ? "Sign in to your account to continue"
                : "Sign up to get started"}
            </p>
          </div>

          {/* Toggle Buttons */}
          <div className="relative flex mb-8 p-1 bg-gray-100 rounded-2xl border border-gray-200 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setErrors({});
                setFormData({
                  email: "",
                  password: "",
                  confirmPassword: "",
                  name: "",
                });
              }}
              className="relative flex-1 py-2.5 px-4 rounded-xl text-sm font-light transition-colors duration-200 z-10 cursor-pointer"
              style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <span className={`relative z-10 transition-colors duration-200 ${
                isLogin ? "text-gray-700" : "text-gray-500"
              }`}>
                Login
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setErrors({});
                setFormData({
                  email: "",
                  password: "",
                  confirmPassword: "",
                  name: "",
                });
              }}
              className="relative flex-1 py-2.5 px-4 rounded-xl text-sm font-light transition-colors duration-200 z-10 cursor-pointer"
              style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <span className={`relative z-10 transition-colors duration-200 ${
                !isLogin ? "text-gray-700" : "text-gray-500"
              }`}>
                Sign Up
              </span>
            </button>
            <div
              className="absolute top-1 bottom-1 rounded-xl bg-white border border-gray-200 shadow-sm transition-all duration-200 ease-in-out"
              style={{
                left: isLogin ? '0.25rem' : 'calc(50% + 0.25rem)',
                width: 'calc(50% - 0.5rem)',
              }}
            />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5 relative">
            {/* Error Message - Absolute positioned */}
            {errors.general && (
              <div className="absolute -top-6 left-0 right-0 h-4 animate-in fade-in duration-200 z-20">
                <p className="pt-0.5 text-xs text-red-500 font-light">{errors.general}</p>
              </div>
            )}
            {!isLogin && (
              <div className="relative">
                <label
                  htmlFor="name"
                  className="block text-xs font-light text-gray-500 mb-2 uppercase tracking-wider"
                >
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-2xl bg-white border ${
                    errors.name
                      ? "border-red-400 focus:border-red-500"
                      : "border-gray-200 focus:border-gray-300"
                  } text-gray-700 placeholder-gray-400 focus:outline-none transition-all font-light shadow-sm focus:shadow-md`}
                  placeholder="John Doe"
                />
                <div className="h-4 relative">
                  {errors.name && (
                    <p className="absolute top-0.5 left-0 text-xs text-red-500 font-light animate-in fade-in duration-200">
                      {errors.name}
                    </p>
                  )}
                </div>
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
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-2xl bg-white border ${
                  errors.email
                    ? "border-red-400 focus:border-red-500"
                    : "border-gray-200 focus:border-gray-300"
                } text-gray-700 placeholder-gray-400 focus:outline-none transition-all font-light shadow-sm focus:shadow-md`}
                placeholder="you@example.com"
              />
              <div className="h-4 relative">
                {errors.email && (
                  <p className="absolute top-0.5 left-0 text-xs text-red-500 font-light animate-in fade-in duration-200">
                    {errors.email}
                  </p>
                )}
              </div>
            </div>

            <div className="relative">
              <label
                htmlFor="password"
                className="block text-xs font-light text-gray-500 mb-2 uppercase tracking-wider"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-2xl bg-white border ${
                  errors.password
                    ? "border-red-400 focus:border-red-500"
                    : "border-gray-200 focus:border-gray-300"
                } text-gray-700 placeholder-gray-400 focus:outline-none transition-all font-light shadow-sm focus:shadow-md`}
                placeholder="••••••••"
              />
              <div className="h-4 relative">
                {errors.password && (
                  <p className="absolute top-0.5 left-0 text-xs text-red-500 font-light animate-in fade-in duration-200">
                    {errors.password}
                  </p>
                )}
              </div>
              {/* Password Requirements - Only show on sign up */}
              {!isLogin && (
                <div className="-mt-1 space-y-1.5">
                  {(() => {
                    const requirements = checkPasswordRequirements();
                    return (
                      <>
                        <div className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all duration-200 ${
                            requirements.minLength
                              ? "bg-gray-500 border-gray-500"
                              : "border-gray-300"
                          }`}>
                            {requirements.minLength && (
                              <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-xs font-light transition-colors duration-200 ${
                            requirements.minLength ? "text-gray-600" : "text-gray-400"
                          }`}>
                            At least 6 characters
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all duration-200 ${
                            requirements.hasUpperCase
                              ? "bg-gray-500 border-gray-500"
                              : "border-gray-300"
                          }`}>
                            {requirements.hasUpperCase && (
                              <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-xs font-light transition-colors duration-200 ${
                            requirements.hasUpperCase ? "text-gray-600" : "text-gray-400"
                          }`}>
                            One uppercase letter
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all duration-200 ${
                            requirements.hasLowerCase
                              ? "bg-gray-500 border-gray-500"
                              : "border-gray-300"
                          }`}>
                            {requirements.hasLowerCase && (
                              <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-xs font-light transition-colors duration-200 ${
                            requirements.hasLowerCase ? "text-gray-600" : "text-gray-400"
                          }`}>
                            One lowercase letter
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all duration-200 ${
                            requirements.hasNumber
                              ? "bg-gray-500 border-gray-500"
                              : "border-gray-300"
                          }`}>
                            {requirements.hasNumber && (
                              <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-xs font-light transition-colors duration-200 ${
                            requirements.hasNumber ? "text-gray-600" : "text-gray-400"
                          }`}>
                            One number
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {!isLogin && (
              <div className="relative">
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-light text-gray-500 mb-2 uppercase tracking-wider"
                >
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-2xl bg-white border ${
                    errors.confirmPassword
                      ? "border-red-400 focus:border-red-500"
                      : "border-gray-200 focus:border-gray-300"
                  } text-gray-700 placeholder-gray-400 focus:outline-none transition-all font-light shadow-sm focus:shadow-md`}
                  placeholder="••••••••"
                />
                <div className="h-4 relative">
                  {errors.confirmPassword && (
                    <p className="absolute top-0.5 left-0 text-xs text-red-500 font-light animate-in fade-in duration-200">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>
            )}

            {isLogin && (
              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                        rememberMe
                          ? "bg-gray-500 border-gray-500 shadow-sm"
                          : "bg-white border-gray-300 group-hover:border-gray-400 shadow-sm"
                      }`}
                    >
                      {rememberMe && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="ml-2 text-xs text-gray-600 font-light group-hover:text-gray-700 transition-colors">
                    Remember me
                  </span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-light text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-2xl bg-gray-100 text-gray-700 font-light hover:bg-gray-200 transition-all duration-200 uppercase tracking-wider text-sm border border-gray-200 shadow-sm hover:shadow-md cursor-pointer focus:outline-none"
            >
              {isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 mb-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-400 text-xs font-light">
                  Or continue with
                </span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errors.general && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs text-red-600">{errors.general}</p>
            </div>
          )}

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl border border-gray-200 bg-white text-gray-600 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-100 transition-all font-light text-sm shadow-sm hover:shadow-md cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl border border-gray-200 bg-white text-gray-600 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-100 transition-all font-light text-sm shadow-sm hover:shadow-md cursor-pointer focus:outline-none"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </button>
          </div>

          {/* Test Chatbot Link */}
          <div className="mt-6 text-center">
            <Link
              href="/chat"
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
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              Test Chatbot
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

