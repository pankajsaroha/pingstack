'use client';

import React from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Code2, Copy, Check } from 'lucide-react';
import { CodeBlock } from '@/components/docs/CodeBlock';

interface EndpointSpec {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  title: string;
  description: string;
  headers?: { name: string; required: boolean; description: string }[];
  params?: { name: string; type: string; required: boolean; description: string }[];
  bodyParams?: { name: string; type: string; required: boolean; description: string }[];
  exampleRequest: {
    curl: string;
    node: string;
    python: string;
  };
  exampleResponse: string;
}

const SECTION_DATA: Record<string, { title: string; description: string; endpoints: EndpointSpec[] }> = {
  'messages': {
    title: 'Messages Reference',
    description: 'Endpoints for sending outbound WhatsApp template/session messages and querying delivery history.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/messages',
        title: 'Send WhatsApp Message',
        description: 'Dispatches a template message with positional variables or direct session text.',
        headers: [
          { name: 'Authorization', required: true, description: 'Bearer ps_secret_live_...' },
          { name: 'Idempotency-Key', required: false, description: 'Unique request key for safe network retries' }
        ],
        bodyParams: [
          { name: 'to', type: 'string', required: true, description: 'Recipient phone number with country code (e.g. 919876543210)' },
          { name: 'template', type: 'string | object', required: false, description: 'Template name or object { name, language }' },
          { name: 'variables', type: 'object | array', required: false, description: 'Positional placeholders {"1": "Val", "2": "Val"}' },
          { name: 'text', type: 'string', required: false, description: 'Freeform text body (24h window active)' },
          { name: 'language', type: 'string', required: false, description: 'Language code (default: en_US)' }
        ],
        exampleRequest: {
          curl: `curl -X POST https://app.pingstack.in/api/v1/messages \\\n  -H "Authorization: Bearer ps_secret_live_..." \\\n  -H "Content-Type: application/json" \\\n  -H "Idempotency-Key: msg-001" \\\n  -d '{"to": "919876543210", "template": "fee_reminder", "variables": ["Rahul", "₹2,500"]}'`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/messages', {\n  method: 'POST',\n  headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },\n  body: JSON.stringify({ to: '919876543210', template: 'fee_reminder', variables: ['Rahul', '₹2,500'] })\n});`,
          python: `import requests\nres = requests.post('https://app.pingstack.in/api/v1/messages', headers={'Authorization': f'Bearer {KEY}'}, json={'to': '919876543210', 'template': 'fee_reminder', 'variables': ['Rahul', '₹2,500']})`
        },
        exampleResponse: `{\n  "success": true,\n  "data": {\n    "message_id": "8b9e6722-1d54-4a2e-b6a1-cb9e4f509d2a",\n    "recipient": "919876543210",\n    "status": "queued",\n    "message_type": "template",\n    "template": "fee_reminder",\n    "created_at": "2026-09-09T22:00:00.000Z"\n  },\n  "request_id": "req_8a9b0c1d"\n}`
      },
      {
        method: 'GET',
        path: '/api/v1/messages',
        title: 'List Messages',
        description: 'Returns paginated message logs for your workspace with status and recipient filters.',
        params: [
          { name: 'page', type: 'integer', required: false, description: 'Page number (default: 1)' },
          { name: 'pageSize', type: 'integer', required: false, description: 'Items per page (max: 100, default: 50)' },
          { name: 'status', type: 'string', required: false, description: 'Filter by status: queued, sent, delivered, read, failed' },
          { name: 'phone', type: 'string', required: false, description: 'Filter by recipient phone number' }
        ],
        exampleRequest: {
          curl: `curl "https://app.pingstack.in/api/v1/messages?page=1&pageSize=20&status=delivered" \\\n  -H "Authorization: Bearer ps_secret_live_..."`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/messages?status=delivered', {\n  headers: { 'Authorization': 'Bearer ' + KEY }\n});`,
          python: `res = requests.get('https://app.pingstack.in/api/v1/messages?status=delivered', headers={'Authorization': f'Bearer {KEY}'})`
        },
        exampleResponse: `{\n  "success": true,\n  "data": [\n    {\n      "id": "8b9e6722-...",\n      "phone_number": "919876543210",\n      "status": "delivered",\n      "direction": "outbound",\n      "created_at": "2026-09-09T22:00:00.000Z"\n    }\n  ],\n  "pagination": {\n    "page": 1,\n    "pageSize": 20,\n    "totalCount": 1,\n    "hasMore": false\n  },\n  "request_id": "req_9b0c1d2e"\n}`
      }
    ]
  },

  'contacts': {
    title: 'Contacts Reference',
    description: 'Endpoints for managing individual customer profiles, custom fields, and bulk operations.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/contacts',
        title: 'List Contacts',
        description: 'Returns a paginated list of contacts with optional search and tag filters.',
        exampleRequest: {
          curl: `curl "https://app.pingstack.in/api/v1/contacts?search=Rahul" \\\n  -H "Authorization: Bearer ps_secret_live_..."`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/contacts?search=Rahul', {\n  headers: { 'Authorization': 'Bearer ' + KEY }\n});`,
          python: `res = requests.get('https://app.pingstack.in/api/v1/contacts?search=Rahul', headers={'Authorization': f'Bearer {KEY}'})`
        },
        exampleResponse: `{\n  "success": true,\n  "data": [\n    {\n      "id": "c1...",\n      "name": "Rahul Sharma",\n      "phone_number": "919876543210",\n      "email": "rahul@example.com",\n      "tags": ["vip"]\n    }\n  ],\n  "request_id": "req_1c2d3e4f"\n}`
      },
      {
        method: 'POST',
        path: '/api/v1/contacts/bulk',
        title: 'Bulk Upsert Contacts',
        description: 'Batch imports up to 500 contacts per request with partial failure handling.',
        exampleRequest: {
          curl: `curl -X POST https://app.pingstack.in/api/v1/contacts/bulk \\\n  -H "Authorization: Bearer ps_secret_live_..." \\\n  -H "Content-Type: application/json" \\\n  -d '{"contacts": [{"name": "Aarav", "phone": "919876543210"}]}'`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/contacts/bulk', {\n  method: 'POST',\n  headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },\n  body: JSON.stringify({ contacts: [{ name: 'Aarav', phone: '919876543210' }] })\n});`,
          python: `res = requests.post('https://app.pingstack.in/api/v1/contacts/bulk', headers={'Authorization': f'Bearer {KEY}'}, json={'contacts': [{'name': 'Aarav', 'phone': '919876543210'}]})`
        },
        exampleResponse: `{\n  "success": true,\n  "data": {\n    "total_submitted": 1,\n    "processed_count": 1,\n    "failed_count": 0,\n    "contacts": [{ "id": "c1...", "name": "Aarav", "phone_number": "919876543210" }]\n  },\n  "request_id": "req_2d3e4f5a"\n}`
      }
    ]
  },

  'groups': {
    title: 'Groups Reference',
    description: 'Endpoints for managing audience groups and contact memberships.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/groups',
        title: 'List Groups',
        description: 'Returns audience groups with dynamic contact membership counts.',
        exampleRequest: {
          curl: `curl https://app.pingstack.in/api/v1/groups \\\n  -H "Authorization: Bearer ps_secret_live_..."`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/groups', { headers: { 'Authorization': 'Bearer ' + KEY } });`,
          python: `res = requests.get('https://app.pingstack.in/api/v1/groups', headers={'Authorization': f'Bearer {KEY}'})`
        },
        exampleResponse: `{\n  "success": true,\n  "data": [\n    {\n      "id": "g1...",\n      "name": "VIP Customers",\n      "contacts_count": 42\n    }\n  ],\n  "request_id": "req_3e4f5a6b"\n}`
      }
    ]
  },

  'templates': {
    title: 'Templates Reference',
    description: 'Endpoints for querying approved Meta WhatsApp message templates.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/templates',
        title: 'List Templates',
        description: 'Lists approved templates with variable placeholders and language codes.',
        exampleRequest: {
          curl: `curl "https://app.pingstack.in/api/v1/templates?status=APPROVED" \\\n  -H "Authorization: Bearer ps_secret_live_..."`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/templates?status=APPROVED', { headers: { 'Authorization': 'Bearer ' + KEY } });`,
          python: `res = requests.get('https://app.pingstack.in/api/v1/templates?status=APPROVED', headers={'Authorization': f'Bearer {KEY}'})`
        },
        exampleResponse: `{\n  "success": true,\n  "data": [\n    {\n      "id": "tpl_1...",\n      "name": "fee_reminder",\n      "language": "en_US",\n      "status": "APPROVED",\n      "content": "Dear {{1}}, your fee of {{2}} is due."\n    }\n  ],\n  "request_id": "req_4f5a6b7c"\n}`
      }
    ]
  },

  'campaigns': {
    title: 'Campaigns Reference',
    description: 'Endpoints for creating, launching, and monitoring broadcast campaigns across groups, contacts, and direct CRM recipients.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/campaigns',
        title: 'Create Campaign Draft',
        description: 'Creates a new broadcast campaign draft associated with an approved template.',
        headers: [
          { name: 'Authorization', required: true, description: 'Bearer ps_secret_live_...' }
        ],
        bodyParams: [
          { name: 'name', type: 'string', required: true, description: 'Human-readable campaign name' },
          { name: 'template_id', type: 'string', required: false, description: 'Template UUID in Pingstack' },
          { name: 'template_name', type: 'string', required: false, description: 'Approved Meta template name (e.g. fee_reminder)' },
          { name: 'scheduled_at', type: 'string', required: false, description: 'ISO-8601 future timestamp for scheduled dispatch (Growth plan)' }
        ],
        exampleRequest: {
          curl: `curl -X POST https://app.pingstack.in/api/v1/campaigns \\\n  -H "Authorization: Bearer ps_secret_live_..." \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "September Fee Reminders", "template_name": "fee_reminder"}'`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/campaigns', {\n  method: 'POST',\n  headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },\n  body: JSON.stringify({ name: 'September Fee Reminders', template_name: 'fee_reminder' })\n});`,
          python: `res = requests.post('https://app.pingstack.in/api/v1/campaigns', headers={'Authorization': f'Bearer {KEY}'}, json={'name': 'September Fee Reminders', 'template_name': 'fee_reminder'})`
        },
        exampleResponse: `{\n  "success": true,\n  "data": {\n    "id": "c8a1b2c3-1d2e-4f5a-b6c7-8d9e0f1a2b3c",\n    "public_id": "c_9f0e1d2c",\n    "name": "September Fee Reminders",\n    "template_id": "tpl_fee_01",\n    "status": "draft",\n    "scheduled_at": null,\n    "created_at": "2026-09-10T08:00:00.000Z"\n  },\n  "request_id": "req_1a2b3c4d"\n}`
      },
      {
        method: 'POST',
        path: '/api/v1/campaigns/{id}/launch',
        title: 'Launch Campaign',
        description: 'Triggers broadcast delivery across audience groups, contact lists, or direct CRM recipient arrays with template variables.',
        headers: [
          { name: 'Authorization', required: true, description: 'Bearer ps_secret_live_...' },
          { name: 'Idempotency-Key', required: false, description: 'Unique request key for safe network retries' }
        ],
        bodyParams: [
          { name: 'recipients', type: 'array', required: false, description: 'Direct CRM recipient objects: [{ phone, variables: {"1": "Val"}, name }]' },
          { name: 'group_ids', type: 'array', required: false, description: 'Array of audience group IDs in Pingstack' },
          { name: 'contact_ids', type: 'array', required: false, description: 'Array of contact IDs in Pingstack' },
          { name: 'template_variables', type: 'object', required: false, description: 'Shared template variables applied to all group/contact recipients (supports {{name}} and {{phone}} macros)' }
        ],
        exampleRequest: {
          curl: `curl -X POST https://app.pingstack.in/api/v1/campaigns/c8a1b2c3-1d2e-4f5a-b6c7-8d9e0f1a2b3c/launch \\\n  -H "Authorization: Bearer ps_secret_live_..." \\\n  -H "Content-Type: application/json" \\\n  -H "Idempotency-Key: fee-batch-sep-01" \\\n  -d '{\n    "recipients": [\n      { "phone": "919876543210", "variables": { "1": "Rahul", "2": "₹2,500" } },\n      { "phone": "919876543211", "variables": { "1": "Amit", "2": "₹1,800" } }\n    ]\n  }'`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/campaigns/c8a1b2c3-1d2e-4f5a-b6c7-8d9e0f1a2b3c/launch', {\n  method: 'POST',\n  headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json', 'Idempotency-Key': 'fee-batch-sep-01' },\n  body: JSON.stringify({\n    recipients: [\n      { phone: '919876543210', variables: { '1': 'Rahul', '2': '₹2,500' } },\n      { phone: '919876543211', variables: { '1': 'Amit', '2': '₹1,800' } }\n    ]\n  })\n});`,
          python: `res = requests.post(\n    'https://app.pingstack.in/api/v1/campaigns/c8a1b2c3-1d2e-4f5a-b6c7-8d9e0f1a2b3c/launch',\n    headers={'Authorization': f'Bearer {KEY}', 'Idempotency-Key': 'fee-batch-sep-01'},\n    json={\n        'recipients': [\n            {'phone': '919876543210', 'variables': {'1': 'Rahul', '2': '₹2,500'}},\n            {'phone': '919876543211', 'variables': {'1': 'Amit', '2': '₹1,800'}}\n        ]\n    }\n)`
        },
        exampleResponse: `{\n  "success": true,\n  "data": {\n    "campaign_id": "c8a1b2c3-1d2e-4f5a-b6c7-8d9e0f1a2b3c",\n    "name": "September Fee Reminders",\n    "status": "running",\n    "queued_at": "2026-09-10T08:00:00.000Z",\n    "audience": {\n      "contact_ids_count": 0,\n      "group_ids_count": 0,\n      "direct_recipients_count": 2\n    }\n  },\n  "request_id": "req_5a6b7c8d"\n}`
      },
      {
        method: 'GET',
        path: '/api/v1/campaigns/{id}/results',
        title: 'Get Campaign Results',
        description: 'Returns real-time delivery metrics, sent counts, read rates, and failure tallies for a campaign.',
        headers: [
          { name: 'Authorization', required: true, description: 'Bearer ps_secret_live_...' }
        ],
        exampleRequest: {
          curl: `curl https://app.pingstack.in/api/v1/campaigns/c8a1b2c3-1d2e-4f5a-b6c7-8d9e0f1a2b3c/results \\\n  -H "Authorization: Bearer ps_secret_live_..."`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/campaigns/c8a1b2c3-1d2e-4f5a-b6c7-8d9e0f1a2b3c/results', {\n  headers: { 'Authorization': 'Bearer ' + KEY }\n});`,
          python: `res = requests.get('https://app.pingstack.in/api/v1/campaigns/c8a1b2c3-1d2e-4f5a-b6c7-8d9e0f1a2b3c/results', headers={'Authorization': f'Bearer {KEY}'})`
        },
        exampleResponse: `{\n  "success": true,\n  "data": {\n    "campaign_id": "c8a1b2c3-1d2e-4f5a-b6c7-8d9e0f1a2b3c",\n    "name": "September Fee Reminders",\n    "status": "completed",\n    "metrics": {\n      "total_messages": 250,\n      "pending": 0,\n      "sent": 248,\n      "delivered": 245,\n      "read": 192,\n      "failed": 2,\n      "delivered_rate_pct": 98,\n      "read_rate_pct": 77\n    }\n  },\n  "request_id": "req_6b7c8d9e"\n}`
      }
    ]
  },

  'webhooks': {
    title: 'Webhooks Reference',
    description: 'Endpoints for subscribing to outbound webhook events and testing endpoints.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/webhooks',
        title: 'Register Webhook Endpoint',
        description: 'Creates a webhook subscription and returns the HMAC signing secret once.',
        exampleRequest: {
          curl: `curl -X POST https://app.pingstack.in/api/v1/webhooks \\\n  -H "Authorization: Bearer ps_secret_live_..." \\\n  -H "Content-Type: application/json" \\\n  -d '{"url": "https://api.mycrm.com/webhooks/pingstack", "events": ["message.received", "message.delivered"]}'`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/webhooks', {\n  method: 'POST',\n  headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },\n  body: JSON.stringify({ url: 'https://api.mycrm.com/webhooks/pingstack', events: ['message.received', 'message.delivered'] })\n});`,
          python: `res = requests.post('https://app.pingstack.in/api/v1/webhooks', headers={'Authorization': f'Bearer {KEY}'}, json={'url': 'https://api.mycrm.com/webhooks/pingstack', 'events': ['message.received', 'message.delivered']})`
        },
        exampleResponse: `{\n  "success": true,\n  "data": {\n    "id": "wh_1...",\n    "url": "https://api.mycrm.com/webhooks/pingstack",\n    "signing_secret": "whsec_xxxxxxxxxxxxxxxxxxxxxxxx"\n  },\n  "request_id": "req_6b7c8d9e"\n}`
      }
    ]
  },

  'keys': {
    title: 'API Keys Reference',
    description: 'Endpoints for managing developer API keys.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/keys',
        title: 'List API Keys',
        description: 'Returns active developer keys with masked prefixes and last used timestamps.',
        exampleRequest: {
          curl: `curl https://app.pingstack.in/api/v1/keys \\\n  -H "Authorization: Bearer ps_secret_live_..."`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/keys', { headers: { 'Authorization': 'Bearer ' + KEY } });`,
          python: `res = requests.get('https://app.pingstack.in/api/v1/keys', headers={'Authorization': f'Bearer {KEY}'})`
        },
        exampleResponse: `{\n  "success": true,\n  "data": [\n    {\n      "id": "k1...",\n      "name": "Production Key",\n      "api_key_prefix": "ps_secret_live_..."\n    }\n  ],\n  "request_id": "req_7c8d9e0f"\n}`
      }
    ]
  },

  'usage': {
    title: 'Usage & Telemetry Reference',
    description: 'Endpoints for querying API request volume, latencies, and operational logs.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/usage',
        title: 'Get Usage Metrics',
        description: 'Returns aggregated API request counts, success rates, and endpoint breakdowns.',
        exampleRequest: {
          curl: `curl "https://app.pingstack.in/api/v1/usage?days=30" \\\n  -H "Authorization: Bearer ps_secret_live_..."`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/usage?days=30', { headers: { 'Authorization': 'Bearer ' + KEY } });`,
          python: `res = requests.get('https://app.pingstack.in/api/v1/usage?days=30', headers={'Authorization': f'Bearer {KEY}'})`
        },
        exampleResponse: `{\n  "success": true,\n  "data": {\n    "period_days": 30,\n    "overview": {\n      "total_requests": 1420,\n      "successful_requests": 1410,\n      "failed_requests": 10,\n      "success_rate_pct": 99,\n      "avg_latency_ms": 42\n    }\n  },\n  "request_id": "req_8d9e0f1a"\n}`
      }
    ]
  }
};

export default function ApiReferenceSectionPage() {
  const params = useParams();
  const sectionKey = params?.section as string;

  const section = SECTION_DATA[sectionKey];
  if (!section) {
    notFound();
  }

  return (
    <article className="space-y-12 animate-in fade-in duration-200">
      {/* Breadcrumb & Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-8">
        <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
          <Link href="/docs" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Docs</Link>
          <span>/</span>
          <Link href="/docs/api-reference" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">API Reference</Link>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
          {section.title}
        </h1>

        <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-3xl">
          {section.description}
        </p>
      </div>

      {/* Endpoints List */}
      <div className="space-y-16">
        {section.endpoints.map((ep, idx) => (
          <div key={idx} className="space-y-6">
            <div className="flex items-center space-x-3">
              <span className={`px-2.5 py-1 text-xs font-bold font-mono uppercase rounded-lg ${
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
              <h2 className="text-lg sm:text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">{ep.path}</h2>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{ep.description}</p>

            {/* Request Parameters */}
            {ep.bodyParams && ep.bodyParams.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Request Body Parameters</h4>
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold border-b border-zinc-200 dark:border-zinc-800">
                      <tr>
                        <th className="px-4 py-2.5">Field</th>
                        <th className="px-4 py-2.5">Type</th>
                        <th className="px-4 py-2.5">Required</th>
                        <th className="px-4 py-2.5">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {ep.bodyParams.map(p => (
                        <tr key={p.name}>
                          <td className="px-4 py-2.5 font-mono font-bold text-zinc-900 dark:text-zinc-200">{p.name}</td>
                          <td className="px-4 py-2.5 font-mono text-indigo-500">{p.type}</td>
                          <td className="px-4 py-2.5">{p.required ? <span className="text-amber-500 font-bold">Yes</span> : 'No'}</td>
                          <td className="px-4 py-2.5">{p.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Code Examples */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Code Example</h4>
              <CodeBlock
                snippets={[
                  { language: 'bash', label: 'cURL', code: ep.exampleRequest.curl },
                  { language: 'javascript', label: 'Node.js', code: ep.exampleRequest.node },
                  { language: 'python', label: 'Python', code: ep.exampleRequest.python },
                ]}
              />
            </div>

            {/* Response Example */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Response Example</h4>
              <CodeBlock language="json" code={ep.exampleResponse} />
            </div>
          </div>
        ))}
      </div>

      {/* Footer Navigation */}
      <div className="pt-10 border-t border-zinc-200 dark:border-zinc-800 flex justify-between">
        <Link
          href="/docs/api-reference"
          className="inline-flex items-center space-x-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Reference Endpoints</span>
        </Link>
      </div>
    </article>
  );
}
