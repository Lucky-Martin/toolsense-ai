/**
 * Hook for clipboard operations with fallback support
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Ensure the document is focused
    if (document.hasFocus && !document.hasFocus()) {
      window.focus();
      await new Promise(resolve => requestAnimationFrame(resolve));
    }

    // Try modern clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    throw new Error("Clipboard API not available");
  } catch (error) {
    // Fallback to execCommand
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      return successful;
    } catch (fallbackError) {
      console.error("Failed to copy to clipboard:", fallbackError);
      return false;
    }
  }
}

