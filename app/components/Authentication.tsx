"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { useTranslation } from "@/app/contexts/TranslationContext";
import { auth } from "@/app/lib/firebase";
import { useAuthForm } from "@/app/hooks/useAuthForm";
import { useGoogleSignIn } from "@/app/hooks/useGoogleSignIn";
import AuthToggle from "./auth/AuthToggle";
import FormField from "./ui/FormField";
import ErrorDisplay from "./ui/ErrorDisplay";
import PasswordRequirements from "./auth/PasswordRequirements";
import GoogleSignInButton from "./auth/GoogleSignInButton";

export default function Authentication() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);

  const { signIn: handleGoogleSignIn, isLoading: isGoogleLoading, error: googleError } = useGoogleSignIn();

  const handleEmailPasswordSubmit = async (formData: {
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
  }) => {
    if (isLogin) {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
    } else {
      if (formData.password !== formData.confirmPassword) {
        throw new Error(t("auth.errors.passwordsDoNotMatch"));
      }
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      if (formData.name) {
        await updateProfile(userCredential.user, { displayName: formData.name });
      }
    }
    router.push("/chat");
  };

  const {
    formData,
    errors,
    isSubmitting: isFormSubmitting,
    checkPasswordRequirements,
    handleInputChange,
    handleConfirmPasswordBlur,
    handleSubmit,
    resetForm,
    setErrors,
  } = useAuthForm({
    isLogin,
    onSubmit: handleEmailPasswordSubmit,
  });

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "register") {
      setIsLogin(false);
    } else {
      setIsLogin(true);
    }

    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          router.push("/chat");
        }
      })
      .catch((error) => {
        console.error("Redirect sign-in error:", error);
        setErrors({ general: t("auth.errors.authenticationFailed") });
      });

    const error = searchParams.get("error");
    if (error) {
      setErrors({ general: error });
    }
  }, [searchParams, router, t, setErrors]);

  const handleToggle = (newIsLogin: boolean) => {
    setIsLogin(newIsLogin);
    setErrors({});
    resetForm();
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-12">
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
          <AuthToggle isLogin={isLogin} onToggle={handleToggle} />

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5 relative">
            {/* Error Message - Absolute positioned */}
            {(errors.general || googleError) && (
              <div className="absolute -top-7 left-0 right-0 animate-in fade-in duration-200 z-20">
                <ErrorDisplay error={errors.general || googleError || ""} />
              </div>
            )}

            {!isLogin && (
              <FormField
                label={t("auth.fullName")}
                  id="name"
                  name="name"
                type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                error={errors.name}
              />
            )}

            <FormField
              label={t("auth.emailAddress")}
                id="email"
                name="email"
              type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@example.com"
              error={errors.email}
            />

            <div className="relative">
              <FormField
                label={t("auth.password")}
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                error={errors.password}
              />
              {!isLogin && (
                <PasswordRequirements requirements={checkPasswordRequirements()} />
              )}
            </div>

            {!isLogin && (
              <FormField
                label={t("auth.confirmPassword")}
                  id="confirmPassword"
                  name="confirmPassword"
                type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  onBlur={handleConfirmPasswordBlur}
                  placeholder="••••••••"
                error={errors.confirmPassword}
              />
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


          {/* Social Login */}
          <div className="flex flex-col">
            <GoogleSignInButton
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isFormSubmitting}
            />
          </div>

        </div>
      </div>
    </div>
  );
}

