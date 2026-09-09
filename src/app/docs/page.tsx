'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Zap, Key, MessageSquare, Webhook, ShieldCheck, Database, FileCode, CheckCircle2 } from 'lucide-react';
import { CodeBlock } from '@/components/docs/CodeBlock';

export default function DocsIndexPage() {
  return (
    <div className="space-y-12 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div>
        <div className="flex items-center space-x-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">
          <span>Documentation</span>
          <span>•</span>
          <span>v1 REST API</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
          Pingstack Developer Platform
        </h1>
        <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
          Integrate official Meta WhatsApp Cloud API messaging with your CRM, school ERP, billing software, and custom applications with 0% message markup.
        </p>
      </div>

      {/* Quickstart Callout Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-linear-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 text-zinc-900 dark:text-zinc-100">
        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2">
          <Zap className="w-4 h-4" />
          <span>Recommended First Step</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold mb-2">5-Minute Quickstart Guide</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-6 max-w-xl leading-relaxed">
          Follow our step-by-step tutorial to connect your WhatsApp number, generate an API key, and send your first template notification in less than 5 minutes.
        </p>
        <Link
          href="/docs/quickstart"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-sm group"
        >
          <span>Start Quickstart</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Core API Highlights */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Core API Capabilities</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/docs/messages"
            className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-indigo-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center justify-between">
              <span>Messages API</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-500" />
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Send pre-approved Meta WhatsApp templates with positional variables and 24h session text messages.
            </p>
          </Link>

          <Link
            href="/docs/campaigns"
            className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-indigo-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center justify-between">
              <span>Campaigns & Broadcasts</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-500" />
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Target audience groups, contact lists, or pass direct CRM recipient arrays without prior contact synchronization.
            </p>
          </Link>

          <Link
            href="/docs/webhooks"
            className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-indigo-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <Webhook className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center justify-between">
              <span>Outbound Webhooks</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-500" />
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Receive real-time notifications for incoming customer messages, delivery receipts, and campaign completions.
            </p>
          </Link>

          <Link
            href="/docs/contacts"
            className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-indigo-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
              <Database className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center justify-between">
              <span>Contacts & Audiences</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-500" />
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Synchronize customer profiles, manage custom fields, apply tags, and organize audience segments.
            </p>
          </Link>
        </div>
      </div>

      {/* Code Snippet Preview */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Instant Code Example</h3>
        <CodeBlock
          title="Send a WhatsApp Template Notification"
          snippets={[
            {
              language: 'bash',
              label: 'cURL',
              code: `curl -X POST https://app.pingstack.in/api/v1/messages \\\n  -H "Authorization: Bearer ps_secret_live_xxxxxxxxxxxxxxxx" \\\n  -H "Content-Type: application/json" \\\n  -H "Idempotency-Key: invoice-reminder-998" \\\n  -d '{\n    "to": "919876543210",\n    "template": "fee_reminder",\n    "variables": ["Rahul", "₹2,500"]\n  }'`
            },
            {
              language: 'javascript',
              label: 'Node.js',
              code: `const res = await fetch('https://app.pingstack.in/api/v1/messages', {\n  method: 'POST',\n  headers: {\n    'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY,\n    'Content-Type': 'application/json',\n    'Idempotency-Key': 'invoice-reminder-998'\n  },\n  body: JSON.stringify({\n    to: '919876543210',\n    template: 'fee_reminder',\n    variables: ['Rahul', '₹2,500']\n  })\n});\nconsole.log(await res.json());`
            }
          ]}
        />
      </div>
    </div>
  );
}
