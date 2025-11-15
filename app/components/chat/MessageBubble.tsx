import ReactMarkdown from "react-markdown";
import { useTranslation } from "@/app/contexts/TranslationContext";
import { Message } from "@/app/services/conversations";
import { parseResponse, isSecurityAssessment } from "@/app/utils/responseParser";
import ReportSummary from "../ReportSummary";
import { markdownComponents } from "../markdown/MarkdownComponents";

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const { t } = useTranslation();

  if (message.role === "user") {
    return (
      <div className="rounded-lg px-4 py-3.5 bg-gray-100 text-black whitespace-pre-wrap break-words leading-relaxed">
        {`${t("chatbot.reportFor")} ${message.content}`}
      </div>
    );
  }

  if (isSecurityAssessment(message.content)) {
    return (
      <ReportSummary
        parsedResponse={parseResponse(message.content)}
        isCached={message.cached}
      />
    );
  }

  return (
    <div className="rounded-lg px-4 pt-3 lg:pb-3 bg-gray-50 text-gray-800 border border-gray-200 markdown-content overflow-x-hidden break-words">
      {message.cached && (
        <div className="mb-2 text-xs text-gray-500 italic flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {t("chatbot.cachedResponse")} - <span className="text-[#006994] flex items-center gap-1">
            <svg className="w-3 h-3 rotate-180" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.69c-3.37 0-6 2.63-6 6 0 3.37 6 10.31 6 10.31s6-6.94 6-10.31c0-3.37-2.63-6-6-6z" />
            </svg>
            {t("chatbot.waterSaved")}
          </span>
        </div>
      )}
      <ReactMarkdown components={markdownComponents}>
        {message.content}
      </ReactMarkdown>
    </div>
  );
}

