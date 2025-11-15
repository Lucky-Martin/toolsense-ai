"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { useTranslation } from "@/app/contexts/TranslationContext";
import { auth } from "@/lib/firebase";
import Navbar from "./Navbar";

export default function Authentication() {
  const { t } = useTranslation();
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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

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
        setErrors({ general: t("auth.errors.authenticationFailed") });
      });

    // Check for any URL error parameters
    const error = searchParams.get("error");
    if (error) {
      setErrors({ general: error });
    }
  }, [searchParams, router, t]);

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
      newErrors.email = t("auth.errors.emailRequired");
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t("auth.errors.emailInvalid");
    }

    if (!formData.password) {
      newErrors.password = t("auth.errors.passwordRequired");
    } else if (!isLogin) {
      const requirements = checkPasswordRequirements();
      if (!requirements.minLength || !requirements.hasUpperCase || !requirements.hasLowerCase || !requirements.hasNumber) {
        newErrors.password = t("auth.errors.passwordRequirements");
      }
    } else if (formData.password.length < 6) {
      newErrors.password = t("auth.errors.passwordMinLength");
    }

    if (!isLogin) {
      if (!formData.name) {
        newErrors.name = t("auth.errors.nameRequired");
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = t("auth.errors.confirmPasswordRequired");
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = t("auth.errors.passwordsDoNotMatch");
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsFormSubmitting(true);
    setErrors({});

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        if (formData.name) {
          await updateProfile(userCredential.user, { displayName: formData.name });
        }
      }
      router.push("/chat");
    } catch (error) {
      console.error("Email/password authentication error:", error);
      if (error instanceof FirebaseError) {
        setErrors({ general: error.message || t("auth.errors.authenticationFailed") });
      } else if (error instanceof Error) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: t("auth.errors.authenticationFailed") });
      }
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrors({});

    try {
      const provider = new GoogleAuthProvider();

      // Try popup first, fallback to redirect if blocked
      try {
        await signInWithPopup(auth, provider);
        router.push("/chat");
      } catch (popupError) {
        if (
          popupError instanceof FirebaseError &&
          (popupError.code === "auth/popup-blocked" || popupError.code === "auth/popup-closed-by-user")
        ) {
          // Fallback to redirect if popup is blocked
          await signInWithRedirect(auth, provider);
          // Note: signInWithRedirect will navigate away, so we don't need to handle the result here
          // The useEffect will handle the redirect result
        } else {
          throw popupError;
        }
      }
    } catch (error) {
      console.error("Google sign-in error:", error);

      if (error instanceof FirebaseError) {
        if (error.code === "auth/popup-closed-by-user") {
          setErrors({ general: "Sign-in was cancelled" });
          return;
        }

        if (error.code === "auth/popup-blocked") {
          setErrors({ general: "Popup was blocked. Using redirect instead..." });
          return;
        }

        setErrors({ general: error.message || "Failed to sign in with Google" });
        return;
      }

      if (error instanceof Error) {
        setErrors({ general: error.message });
        return;
      }

      setErrors({ general: "Failed to sign in with Google" });
    } finally {
      setIsGoogleLoading(false);
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
              {isLogin ? t("auth.welcomeBack") : t("auth.createAccount")}
            </h1>
            <p className="text-gray-500 text-sm font-light">
              {isLogin
                ? t("auth.signInToContinue")
                : t("auth.signUpToGetStarted")}
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
              <span className={`relative z-10 transition-colors duration-200 ${isLogin ? "text-gray-700" : "text-gray-500"
                }`}>
                {t("auth.login")}
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
              <span className={`relative z-10 transition-colors duration-200 ${!isLogin ? "text-gray-700" : "text-gray-500"
                }`}>
                {t("auth.signUp")}
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
                  {t("auth.fullName")}
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-2xl bg-white border ${errors.name
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
                {t("auth.emailAddress")}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-2xl bg-white border ${errors.email
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
                {t("auth.password")}
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-2xl bg-white border ${errors.password
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
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all duration-200 ${requirements.minLength
                            ? "bg-gray-500 border-gray-500"
                            : "border-gray-300"
                            }`}>
                            {requirements.minLength && (
                              <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-xs font-light transition-colors duration-200 ${requirements.minLength ? "text-gray-600" : "text-gray-400"
                            }`}>
                            {t("auth.passwordRequirements.minLength")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all duration-200 ${requirements.hasUpperCase
                            ? "bg-gray-500 border-gray-500"
                            : "border-gray-300"
                            }`}>
                            {requirements.hasUpperCase && (
                              <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-xs font-light transition-colors duration-200 ${requirements.hasUpperCase ? "text-gray-600" : "text-gray-400"
                            }`}>
                            {t("auth.passwordRequirements.hasUpperCase")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all duration-200 ${requirements.hasLowerCase
                            ? "bg-gray-500 border-gray-500"
                            : "border-gray-300"
                            }`}>
                            {requirements.hasLowerCase && (
                              <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-xs font-light transition-colors duration-200 ${requirements.hasLowerCase ? "text-gray-600" : "text-gray-400"
                            }`}>
                            {t("auth.passwordRequirements.hasLowerCase")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all duration-200 ${requirements.hasNumber
                            ? "bg-gray-500 border-gray-500"
                            : "border-gray-300"
                            }`}>
                            {requirements.hasNumber && (
                              <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-xs font-light transition-colors duration-200 ${requirements.hasNumber ? "text-gray-600" : "text-gray-400"
                            }`}>
                            {t("auth.passwordRequirements.hasNumber")}
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
                  {t("auth.confirmPassword")}
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-2xl bg-white border ${errors.confirmPassword
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
                      className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${rememberMe
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
                    {t("auth.rememberMe")}
                  </span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-light text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {t("auth.forgotPassword")}
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={isFormSubmitting}
              className="w-full py-3 px-4 rounded-2xl bg-gray-100 text-gray-700 font-light hover:bg-gray-200 transition-all duration-200 uppercase tracking-wider text-sm border border-gray-200 shadow-sm hover:shadow-md cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLogin ? t("auth.signIn") : t("auth.createAccount")}
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
                  {t("auth.orContinueWith")}
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
          <div className="flex flex-col">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isFormSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl border border-gray-200 bg-white text-gray-600 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-100 transition-all font-light text-sm shadow-sm hover:shadow-md cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>

        </div>
      </div>
    </div>
  );
}

