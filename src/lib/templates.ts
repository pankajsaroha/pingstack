export interface TemplateRejectionDetails {
  code: string;
  reason: string;
  why?: string;
  suggestedFix?: string;
}

/**
 * Maps raw Meta rejection codes to user-friendly explanations and practical fixes.
 * Derives accurate diagnostic guidance based on official Meta WhatsApp template guidelines.
 */
export function parseMetaRejectionReason(rawReason?: string | null): TemplateRejectionDetails {
  const code = (rawReason || '').trim().toUpperCase();

  switch (code) {
    case 'TAG_CONTENT_MISMATCH':
    case 'INCORRECT_CATEGORY':
      return {
        code,
        reason: 'The selected category does not match the content of this template.',
        why: 'The message appears to be a promotional, marketing, or general announcement, but was submitted under Utility (or vice-versa).',
        suggestedFix: 'Switch the category to Marketing, or ensure the content strictly relates to an existing transaction/service confirmation before resubmitting.'
      };

    case 'INVALID_FORMAT':
      return {
        code,
        reason: 'The template contains formatting or variable syntax errors.',
        why: 'Meta requires variables to follow sequential numbers like {{1}}, {{2}} with proper spacing, and variables cannot start or end the message alone without surrounding context text.',
        suggestedFix: 'Ensure all variables are formatted as {{1}}, {{2}} in order, surrounded by descriptive context words, and provide valid sample text.'
      };

    case 'PROMOTIONAL':
      return {
        code,
        reason: 'The template contains promotional content in a non-marketing category.',
        why: 'Meta classifies discounts, offers, coupons, upsells, and marketing language strictly under the Marketing category.',
        suggestedFix: 'Change the category to Marketing or remove promotional phrasing from the message body.'
      };

    case 'VARIABLE_FORMAT':
    case 'FLOATING_VARIABLE':
      return {
        code,
        reason: 'Variable placement is invalid or missing surrounding context.',
        why: 'Meta rejects floating variables that stand alone on a line or are placed without explanatory words around them.',
        suggestedFix: 'Add descriptive text before and after each variable (e.g., "Your invoice amount is {{1}} and due by {{2}}").'
      };

    case 'URL_SHORTENER':
    case 'INVALID_URL':
      return {
        code,
        reason: 'Shortened URLs or invalid link formats were detected.',
        why: 'Meta prohibits link shorteners (such as bit.ly or tinyurl) to protect users from misleading destination URLs.',
        suggestedFix: 'Use your full verified business domain link or use a template button with dynamic URL parameters.'
      };

    case 'SCAM':
    case 'ABUSIVE_CONTENT':
    case 'POLICY_VIOLATION':
      return {
        code,
        reason: 'Template violates WhatsApp Business Messaging or Commerce Policy.',
        why: 'The wording was flagged by automated filters for sensitive topics, restricted goods, or misleading financial claims.',
        suggestedFix: 'Review WhatsApp Business Messaging Policies and rephrase the message to remove sensitive keywords.'
      };

    case 'NONE':
    case '':
    case 'UNKNOWN':
    default:
      if (!code || code === 'NONE') {
        return {
          code: code || 'NOT_SPECIFIED',
          reason: 'Meta did not provide a detailed rejection reason.',
          why: 'Meta automated review rejected the template without a specific reason code.',
          suggestedFix: 'Review the template content, category, and variables for WhatsApp policy compliance before resubmitting.'
        };
      }
      return {
        code,
        reason: `Meta rejected this template (${code.replace(/_/g, ' ')}).`,
        why: 'The template was flagged during Meta automated compliance review.',
        suggestedFix: 'Review the message content and category to ensure alignment with WhatsApp template guidelines.'
      };
  }
}

/**
 * Extracts {{1}}, {{2}} variables from body text and generates safe default sample values
 * required by Meta Cloud API when creating or updating message templates with variables.
 */
export function generateVariableExamples(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/\{\{(\d+)\}\}/g);
  if (!matches || matches.length === 0) return [];

  const uniqueIndices = Array.from(new Set(matches.map(m => parseInt(m.replace(/[{}]/g, ''), 10)))).sort((a, b) => a - b);
  return uniqueIndices.map(idx => `SampleValue${idx}`);
}
