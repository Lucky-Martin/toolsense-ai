import { useTranslation } from "@/app/contexts/TranslationContext";

interface AuthToggleProps {
  isLogin: boolean;
  onToggle: (isLogin: boolean) => void;
}

export default function AuthToggle({ isLogin, onToggle }: AuthToggleProps) {
  const { t } = useTranslation();

  return (
    <div className="relative flex mb-8 p-1 bg-gray-100 rounded-2xl border border-gray-200 shadow-sm">
      <button
        type="button"
        onClick={() => onToggle(true)}
        className="relative flex-1 py-2.5 px-4 rounded-xl text-sm font-light transition-colors duration-200 z-10 cursor-pointer"
        style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <span
          className={`relative z-10 transition-colors duration-200 ${
            isLogin ? "text-gray-700" : "text-gray-500"
          }`}
        >
          {t("auth.login")}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onToggle(false)}
        className="relative flex-1 py-2.5 px-4 rounded-xl text-sm font-light transition-colors duration-200 z-10 cursor-pointer"
        style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <span
          className={`relative z-10 transition-colors duration-200 ${
            !isLogin ? "text-gray-700" : "text-gray-500"
          }`}
        >
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
  );
}

