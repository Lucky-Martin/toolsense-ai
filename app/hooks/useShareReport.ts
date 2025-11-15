import { Message } from "@/app/services/conversations";
import { copyToClipboard } from "./useClipboard";
import { useTranslation } from "@/app/contexts/TranslationContext";

export function useShareReport(messages: Message[]) {
  const { t } = useTranslation();

  const share = async () => {
    const conversationText = messages
      .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
      .join("\n\n");

    try {
      if (navigator.share) {
        await navigator.share({
          title: "ToolSense AI Report",
          text: conversationText,
        });
        return;
      }
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      console.log("Web Share API failed, trying clipboard fallback");
    }

    const success = await copyToClipboard(conversationText);
    if (success) {
      alert(t("chatbot.copiedToClipboard"));
    } else {
      prompt(t("chatbot.copyTextPrompt"), conversationText);
    }
  };

  return { share };
}

