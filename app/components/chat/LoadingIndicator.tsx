import { useTranslation } from "@/app/contexts/TranslationContext";

interface LoadingIndicatorProps {
  message: string;
}

export default function LoadingIndicator({ message }: LoadingIndicatorProps) {
  return (
    <div className="w-full">
      <div className="bg-gray-50 text-gray-800 border border-gray-200 rounded-lg px-4 py-3 w-full">
        <div className="flex items-center gap-3">
          <div className="flex gap-1 flex-shrink-0">
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
            <div
              className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
            <div
              className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.4s" }}
            ></div>
          </div>
          <span className="text-sm text-gray-600">{message}</span>
        </div>
      </div>
    </div>
  );
}

