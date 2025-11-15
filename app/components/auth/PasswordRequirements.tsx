import { useTranslation } from "@/app/contexts/TranslationContext";

interface PasswordRequirementsProps {
  requirements: {
    minLength: boolean;
    hasUpperCase: boolean;
    hasLowerCase: boolean;
    hasNumber: boolean;
  };
}

export default function PasswordRequirements({ requirements }: PasswordRequirementsProps) {
  const { t } = useTranslation();

  const RequirementItem = ({ met, text }: { met: boolean; text: string }) => (
    <div className="flex items-center gap-2">
      <div
        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all duration-200 ${
          met ? "bg-gray-500 border-gray-500" : "border-gray-300"
        }`}
      >
        {met && (
          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      <span
        className={`text-xs font-light transition-colors duration-200 ${
          met ? "text-gray-600" : "text-gray-400"
        }`}
      >
        {text}
      </span>
    </div>
  );

  return (
    <div className="-mt-1 space-y-1.5">
      <RequirementItem
        met={requirements.minLength}
        text={t("auth.passwordRequirements.minLength")}
      />
      <RequirementItem
        met={requirements.hasUpperCase}
        text={t("auth.passwordRequirements.hasUpperCase")}
      />
      <RequirementItem
        met={requirements.hasLowerCase}
        text={t("auth.passwordRequirements.hasLowerCase")}
      />
      <RequirementItem
        met={requirements.hasNumber}
        text={t("auth.passwordRequirements.hasNumber")}
      />
    </div>
  );
}

