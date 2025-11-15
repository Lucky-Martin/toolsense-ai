import { FirebaseError } from "firebase/app";
import { useTranslation } from "@/app/contexts/TranslationContext";

/**
 * Get user-friendly error message from Firebase error
 */
export function getFirebaseErrorMessage(error: FirebaseError, t: (key: string) => string): string {
  switch (error.code) {
    case "auth/email-already-in-use":
      return t("auth.errors.emailAlreadyInUse");
    case "auth/invalid-email":
      return t("auth.errors.emailInvalid");
    case "auth/operation-not-allowed":
      return t("auth.errors.operationNotAllowed");
    case "auth/weak-password":
      return t("auth.errors.passwordRequirements");
    case "auth/user-disabled":
      return t("auth.errors.userDisabled");
    case "auth/user-not-found":
      return t("auth.errors.userNotFound");
    case "auth/wrong-password":
      return t("auth.errors.wrongPassword");
    case "auth/invalid-credential":
      return t("auth.errors.invalidCredential");
    case "auth/too-many-requests":
      return t("auth.errors.tooManyRequests");
    case "auth/network-request-failed":
      return t("auth.errors.networkError");
    case "auth/popup-closed-by-user":
      return t("auth.errors.signInCancelled");
    case "auth/popup-blocked":
      return t("auth.errors.popupBlocked");
    default:
      return error.message || t("auth.errors.authenticationFailed");
  }
}

