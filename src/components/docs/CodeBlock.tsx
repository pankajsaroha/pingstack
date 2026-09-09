import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export interface CodeSnippet {
  language: string; // 'bash' | 'javascript' | 'python' | 'json'
  label: string;    // 'cURL' | 'Node.js' | 'Python' | 'JSON'
  code: string;
}

interface CodeBlockProps {
  snippets?: CodeSnippet[];
  code?: string;
  language?: string;
  title?: string;
}

export function CodeBlock({ snippets, code, language = 'bash', title }: CodeBlockProps) {
  const activeSnippets: CodeSnippet[] = snippets || [
    {
      language,
      label: language === 'bash' ? 'cURL' : language === 'javascript' ? 'Node.js' : language === 'python' ? 'Python' : language.toUpperCase(),
      code: code || '',
    }
  ];

  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const currentSnippet = activeSnippets[activeTab] || activeSnippets[0];

  const handleCopy = async () => {
    if (!currentSnippet?.code) return;
    try {
      await navigator.clipboard.writeText(currentSnippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="my-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-900 text-zinc-100 overflow-hidden shadow-sm">
      {/* Header with Title & Language Tabs */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-950 border-b border-zinc-800/80">
        <div className="flex items-center space-x-2">
          {title && <span className="text-xs font-semibold text-zinc-400 mr-2">{title}</span>}
          {activeSnippets.length > 1 && (
            <div className="flex items-center space-x-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
              {activeSnippets.map((s, idx) => (
                <button
                  key={s.label}
                  onClick={() => setActiveTab(idx)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    activeTab === idx
                      ? 'bg-zinc-800 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          {activeSnippets.length === 1 && !title && (
            <span className="text-xs font-mono font-medium text-zinc-400">{currentSnippet.label}</span>
          )}
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-md border border-zinc-800 transition-colors"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Area */}
      <div className="p-4 overflow-x-auto text-[13px] font-mono leading-relaxed selection:bg-indigo-500/30">
        <pre className="text-zinc-200 whitespace-pre">
          <code>{currentSnippet.code}</code>
        </pre>
      </div>
    </div>
  );
}
