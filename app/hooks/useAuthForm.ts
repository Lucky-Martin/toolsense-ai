import { useState } from "react";
import { useTranslation } from "@/app/contexts/TranslationContext";
import { getFirebaseErrorMessage } from "@/app/utils/authErrors";

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
}

interface UseAuthFormOptions {
  isLogin: boolean;
  onSubmit: (formData: FormData) => Promise<void>;
}

export function useAuthForm({ isLogin, onSubmit }: UseAuthFormOptions) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }

    if (errors.general) {
      setErrors((prev) => ({ ...prev, general: "" }));
    }
  };

  const handleConfirmPasswordBlur = () => {
    if (!isLogin && formData.password && formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        setErrors((prev) => ({ ...prev, confirmPassword: t("auth.errors.passwordsDoNotMatch") }));
      } else {
        setErrors((prev) => ({ ...prev, confirmPassword: "" }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(formData);
    } catch (error: any) {
      if (error?.code) {
        setErrors({ general: getFirebaseErrorMessage(error, t) });
      } else if (error instanceof Error) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: t("auth.errors.authenticationFailed") });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
    });
    setErrors({});
  };

  return {
    formData,
    errors,
    isSubmitting,
    checkPasswordRequirements,
    handleInputChange,
    handleConfirmPasswordBlur,
    handleSubmit,
    resetForm,
    setErrors,
  };
}

