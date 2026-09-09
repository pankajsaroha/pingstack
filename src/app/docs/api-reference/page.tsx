'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Code2, Globe, Shield, Zap, Database, MessageSquare, Webhook, Key, BarChart3 } from 'lucide-react';
import { CodeBlock } from '@/components/docs/CodeBlock';

const REFERENCE_SECTIONS = [
  {
    id: 'messages',
    title: 'Messages Reference',
    icon: MessageSquare,
    description: 'POST & GET endpoints for single message dispatch and conversation history.',
    endpoints: [
      { method: 'POST', path: '/api/v1/messages', desc: 'Send WhatsApp template or text message' },
      { method: 'GET', path: '/api/v1/messages', desc: 'List workspace messages with pagination' },
      { method: 'GET', path: '/api/v1/messages/{id}', desc: 'Retrieve single message status and metadata' },
    ]
  },
  {
    id: 'contacts',
    title: 'Contacts Reference',
    icon: Database,
    description: 'CRUD and batch endpoints for managing contact records and custom fields.',
    endpoints: [
      { method: 'GET', path: '/api/v1/contacts', desc: 'List contacts with search and tags' },
      { method: 'POST', path: '/api/v1/contacts', desc: 'Create or upsert a contact' },
      { method: 'GET', path: '/api/v1/contacts/{id}', desc: 'Get contact profile' },
      { method: 'PATCH', path: '/api/v1/contacts/{id}', desc: 'Update contact fields' },
      { method: 'DELETE', path: '/api/v1/contacts/{id}', desc: 'Delete contact' },
      { method: 'POST', path: '/api/v1/contacts/bulk', desc: 'Bulk upsert up to 500 contacts' },
      { method: 'DELETE', path: '/api/v1/contacts/bulk', desc: 'Bulk delete contacts' },
    ]
  },
  {
    id: 'groups',
    title: 'Groups Reference',
    icon: Globe,
    description: 'Audience segment creation and contact membership association.',
    endpoints: [
      { method: 'GET', path: '/api/v1/groups', desc: 'List groups with live contact counts' },
      { method: 'POST', path: '/api/v1/groups', desc: 'Create a new audience group' },
      { method: 'GET', path: '/api/v1/groups/{id}', desc: 'Get group details' },
      { method: 'PATCH', path: '/api/v1/groups/{id}', desc: 'Update group name/description' },
      { method: 'DELETE', path: '/api/v1/groups/{id}', desc: 'Delete group' },
      { method: 'GET', path: '/api/v1/groups/{id}/contacts', desc: 'List group member contacts' },
      { method: 'POST', path: '/api/v1/groups/{id}/contacts', desc: 'Add contact IDs to group' },
      { method: 'DELETE', path: '/api/v1/groups/{id}/contacts', desc: 'Remove contact IDs from group' },
    ]
  },
  {
    id: 'templates',
    title: 'Templates Reference',
    icon: Code2,
    description: 'Query approved Meta WhatsApp templates, languages, and variable schemas.',
    endpoints: [
      { method: 'GET', path: '/api/v1/templates', desc: 'List approved templates' },
      { method: 'GET', path: '/api/v1/templates/{id}', desc: 'Get template content and variable placeholders' },
    ]
  },
  {
    id: 'campaigns',
    title: 'Campaigns Reference',
    icon: Zap,
    description: 'Broadcast lifecycle management and audience delivery execution.',
    endpoints: [
      { method: 'GET', path: '/api/v1/campaigns', desc: 'List broadcast campaigns and delivery stats' },
      { method: 'POST', path: '/api/v1/campaigns', desc: 'Create campaign draft or scheduled broadcast' },
      { method: 'GET', path: '/api/v1/campaigns/{id}', desc: 'Get campaign details' },
      { method: 'DELETE', path: '/api/v1/campaigns/{id}', desc: 'Delete campaign' },
      { method: 'POST', path: '/api/v1/campaigns/{id}/launch', desc: 'Launch broadcast (contacts, groups, direct recipients)' },
      { method: 'GET', path: '/api/v1/campaigns/{id}/results', desc: 'Get campaign delivery metrics and read rates' },
    ]
  },
  {
    id: 'webhooks',
    title: 'Webhooks Reference',
    icon: Webhook,
    description: 'Manage outbound webhook subscriptions and test ping dispatches.',
    endpoints: [
      { method: 'GET', path: '/api/v1/webhooks', desc: 'List registered webhook subscriptions' },
      { method: 'POST', path: '/api/v1/webhooks', desc: 'Register new webhook endpoint (secret generated)' },
      { method: 'GET', path: '/api/v1/webhooks/{id}', desc: 'Get webhook endpoint and delivery logs' },
      { method: 'DELETE', path: '/api/v1/webhooks/{id}', desc: 'Delete webhook subscription' },
      { method: 'POST', path: '/api/v1/webhooks/{id}/test', desc: 'Trigger immediate test ping event' },
    ]
  },
  {
    id: 'keys',
    title: 'API Keys Reference',
    icon: Key,
    description: 'Programmatic API key provisioning and revocation.',
    endpoints: [
      { method: 'GET', path: '/api/v1/keys', desc: 'List active API keys' },
      { method: 'POST', path: '/api/v1/keys', desc: 'Generate new API key' },
      { method: 'DELETE', path: '/api/v1/keys', desc: 'Revoke API key' },
    ]
  },
  {
    id: 'usage',
    title: 'Usage & Telemetry Reference',
    icon: BarChart3,
    description: 'Integration metrics, latency averages, and persistent operational request logs.',
    endpoints: [
      { method: 'GET', path: '/api/v1/usage', desc: 'Get request totals, success rate, and latency metrics' },
      { method: 'GET', path: '/api/v1/logs', desc: 'Query paginated operational request logs' },
    ]
  }
];

export default function ApiReferenceIndexPage() {
  return (
    <div className="space-y-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-8">
        <div className="flex items-center space-x-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">
          <span>API Reference</span>
          <span>•</span>
          <span>v1 REST API</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
          Pingstack REST API Reference
        </h1>
        <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-3xl">
          Complete catalog of all 22 official endpoints with request parameters, schemas, headers, and copy-paste code snippets.
        </p>
      </div>

      {/* Sections Catalog */}
      <div className="space-y-12">
        {REFERENCE_SECTIONS.map(section => (
          <div key={section.id} id={section.id} className="space-y-4 scroll-mt-24">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <section.icon className="w-4 h-4" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{section.title}</h2>
              </div>
              <Link
                href={`/docs/api-reference/${section.id}`}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
              >
                <span>View Full {section.title}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{section.description}</p>

            {/* Endpoints Table */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
              {section.endpoints.map((ep, idx) => (
                <div key={idx} className="p-3.5 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors gap-2">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-0.5 text-[10px] font-bold font-mono uppercase rounded ${
                      ep.method === 'POST'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                        : ep.method === 'GET'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : ep.method === 'PATCH'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    }`}>
                      {ep.method}
                    </span>
                    <span className="text-xs font-mono font-semibold text-zinc-900 dark:text-zinc-200">
                      {ep.path}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 sm:text-right">
                    {ep.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
