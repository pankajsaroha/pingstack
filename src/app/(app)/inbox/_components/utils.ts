'use client';

// Shared date utility used by DateSeparator and ChatThread
export const formatSeparatorDate = (dateString: string) => {
  const d = new Date(dateString);
  const now = new Date();

  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffDays = Math.round((nowDate.getTime() - dDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

/**
 * Extract copyable text from a message.
 * Returns the rendered text content or media caption, preserving Unicode, emojis, newlines.
 * Returns null if the message only contains binary media without text or an internal placeholder.
 */
export function getCopyableMessageText(msg: {
  content: string | null;
  message_type?: string | null;
  media_path?: string | null;
}): string | null {
  if (!msg || !msg.content) return null;
  const raw = msg.content.trim();

  // Non-copyable internal tokens
  const nonCopyablePlaceholders = [
    '[Document]',
    '[Photo]',
    '[Video]',
    '[Voice message]',
    '[Audio]',
    '[UNSUPPORTED]',
    '[Sticker]',
  ];

  if (nonCopyablePlaceholders.includes(raw)) {
    return null;
  }

  if (raw.startsWith('[Unsupported WhatsApp message format')) {
    return null;
  }

  return msg.content;
}

/**
 * Robust cross-platform clipboard copy supporting desktop, iOS Safari, Android, and PWAs.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Modern navigator.clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('[Clipboard] navigator.clipboard.writeText failed, using fallback:', err);
    }
  }

  // 2. Fallback for iOS Safari, older mobile browsers, and webviews
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch (err) {
    console.error('[Clipboard] execCommand copy failed:', err);
    return false;
  }
}
