import { useRef, useState, useEffect } from "react";
import { useTranslation } from "@/app/contexts/TranslationContext";

interface ChatActionsProps {
  onDownloadMarkdown: () => void;
  onDownloadPDF: () => void;
  onShare: () => void;
  onEdit: () => void;
}

export default function ChatActions({
  onDownloadMarkdown,
  onDownloadPDF,
  onShare,
  onEdit,
}: ChatActionsProps) {
  const { t } = useTranslation();
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const downloadDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        downloadDropdownRef.current &&
        !downloadDropdownRef.current.contains(event.target as Node)
      ) {
        setShowDownloadDropdown(false);
      }
    };

    if (showDownloadDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDownloadDropdown]);

  return (
    <div className="flex items-center justify-center gap-4">
      <div className="relative" ref={downloadDropdownRef}>
        <button
          type="button"
          onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors cursor-pointer"
          title={t("chatbot.download")}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M8 12l4 4m0 0l4-4m-4 4V4"
            />
          </svg>
          <span className="text-sm font-medium">{t("chatbot.download")}</span>
          <svg
            className={`w-4 h-4 transition-transform ${showDownloadDropdown ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {showDownloadDropdown && (
          <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            <button
              type="button"
              onClick={() => {
                onDownloadMarkdown();
                setShowDownloadDropdown(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {t("chatbot.markdown")}
            </button>
            <button
              type="button"
              onClick={() => {
                onDownloadPDF();
                setShowDownloadDropdown(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
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
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              {t("chatbot.pdf")}
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onShare}
        className="flex items-center gap-2 lg:gap-2 gap-0 px-4 lg:px-4 px-2.5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors cursor-pointer"
        title={t("chatbot.share")}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        <span className="text-sm font-medium lg:inline hidden">{t("chatbot.share")}</span>
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="flex items-center gap-2 lg:gap-2 gap-0 px-4 lg:px-4 px-2.5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors cursor-pointer"
        title={t("chatbot.edit")}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        <span className="text-sm font-medium lg:inline hidden">{t("chatbot.edit")}</span>
      </button>
    </div>
  );
}

