import React from 'react';

interface WhatsAppFormattedTextProps {
  text: string;
  className?: string;
}

/**
 * Renders WhatsApp-formatted text safely using React elements.
 * Supports:
 * - *bold*
 * - _italic_
 * - ~strikethrough~
 * - `inline code`
 * - ```code block```
 * - Nested formatting combinations
 * - Native emojis, line breaks, and punctuation
 */
export function WhatsAppFormattedText({ text, className }: WhatsAppFormattedTextProps) {
  if (!text) return null;
  return <span className={className}>{parseWhatsAppFormatting(text)}</span>;
}

export function parseWhatsAppFormatting(text: string): React.ReactNode[] {
  if (!text) return [];
  return parseInternal(text);
}

function parseInternal(text: string, keyPrefix = ''): React.ReactNode[] {
  if (!text) return [];

  // 1. Code Block ```...```
  const codeBlockMatch = text.match(/```([\s\S]+?)```/);
  if (codeBlockMatch && codeBlockMatch.index !== undefined) {
    const before = text.slice(0, codeBlockMatch.index);
    const content = codeBlockMatch[1];
    const after = text.slice(codeBlockMatch.index + codeBlockMatch[0].length);

    const nodes: React.ReactNode[] = [];
    if (before) nodes.push(...parseInternal(before, `${keyPrefix}cb-b-`));
    nodes.push(
      <pre
        key={`${keyPrefix}codeblock-${codeBlockMatch.index}`}
        className="bg-black/10 dark:bg-white/10 rounded-md p-2 my-1 font-mono text-xs overflow-x-auto whitespace-pre block"
      >
        {content}
      </pre>
    );
    if (after) nodes.push(...parseInternal(after, `${keyPrefix}cb-a-`));
    return nodes;
  }

  // 2. Inline Code `...`
  const inlineCodeMatch = text.match(/`([^`\n]+)`/);
  if (inlineCodeMatch && inlineCodeMatch.index !== undefined) {
    const before = text.slice(0, inlineCodeMatch.index);
    const content = inlineCodeMatch[1];
    const after = text.slice(inlineCodeMatch.index + inlineCodeMatch[0].length);

    const nodes: React.ReactNode[] = [];
    if (before) nodes.push(...parseInternal(before, `${keyPrefix}ic-b-`));
    nodes.push(
      <code
        key={`${keyPrefix}inlinecode-${inlineCodeMatch.index}`}
        className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded font-mono text-[0.9em]"
      >
        {content}
      </code>
    );
    if (after) nodes.push(...parseInternal(after, `${keyPrefix}ic-a-`));
    return nodes;
  }

  // 3. Combined regex for Bold (*), Italic (_), Strikethrough (~)
  // WhatsApp formatting boundary rules:
  // - Opening symbol must be preceded by start of string, whitespace, or opening punctuation
  // - Closing symbol must be followed by end of string, whitespace, or closing punctuation
  // - Content cannot begin or end with whitespace
  const formatRegex = /(?:^|(?<=[\s(/"'[{<]))(?:\*([^\s*](?:[\s\S]*?[^\s*])?)\*|_([^\s_](?:[\s\S]*?[^\s_])?)_|~([^\s~](?:[\s\S]*?[^\s~])?)~)(?=$|[\s)"'\]}>,.:;!?])/;

  const match = text.match(formatRegex);
  if (match && match.index !== undefined) {
    const matchedFull = match[0];
    const boldContent = match[1];
    const italicContent = match[2];
    const strikeContent = match[3];

    const before = text.slice(0, match.index);
    const after = text.slice(match.index + matchedFull.length);

    const nodes: React.ReactNode[] = [];
    if (before) nodes.push(...parseInternal(before, `${keyPrefix}fmt-b-`));

    if (boldContent !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}bold-${match.index}`} className="font-bold">
          {parseInternal(boldContent, `${keyPrefix}bold-in-`)}
        </strong>
      );
    } else if (italicContent !== undefined) {
      nodes.push(
        <em key={`${keyPrefix}italic-${match.index}`} className="italic">
          {parseInternal(italicContent, `${keyPrefix}italic-in-`)}
        </em>
      );
    } else if (strikeContent !== undefined) {
      nodes.push(
        <del key={`${keyPrefix}strike-${match.index}`} className="line-through opacity-80">
          {parseInternal(strikeContent, `${keyPrefix}strike-in-`)}
        </del>
      );
    }

    if (after) nodes.push(...parseInternal(after, `${keyPrefix}fmt-a-`));
    return nodes;
  }

  return [text];
}
