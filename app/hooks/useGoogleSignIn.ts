import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { useTranslation } from "@/app/contexts/TranslationContext";
import { auth } from "@/app/lib/firebase";
import { getFirebaseErrorMessage } from "@/app/utils/authErrors";

export function useGoogleSignIn() {
  const { t } = useTranslation();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const provider = new GoogleAuthProvider();

      try {
        await signInWithPopup(auth, provider);
        router.push("/chat");
      } catch (popupError) {
        if (
          popupError instanceof FirebaseError &&
          (popupError.code === "auth/popup-blocked" || popupError.code === "auth/popup-closed-by-user")
        ) {
          await signInWithRedirect(auth, provider);
        } else {
          throw popupError;
        }
      }
    } catch (error) {
      console.error("Google sign-in error:", error);

      if (error instanceof FirebaseError) {
        if (error.code === "auth/popup-closed-by-user") {
          setError(t("auth.errors.signInCancelled"));
          return;
        }

        if (error.code === "auth/popup-blocked") {
          setError(t("auth.errors.popupBlocked"));
          return;
        }

        setError(getFirebaseErrorMessage(error, t));
        return;
      }

      if (error instanceof Error) {
        setError(error.message);
        return;
      }

      setError(t("auth.errors.googleSignInFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  return { signIn, isLoading, error };
}

