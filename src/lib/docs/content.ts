import React from 'react';

export interface DocNavigationItem {
  title: string;
  href: string;
  badge?: string;
  description?: string;
}

export interface DocNavigationGroup {
  category: string;
  items: DocNavigationItem[];
}

export interface DocSection {
  id: string;
  title: string;
  content?: string;
  codeSnippets?: {
    language: string;
    label: string;
    code: string;
  }[];
  tableData?: {
    headers: string[];
    rows: string[][];
  };
  callout?: {
    type: 'note' | 'tip' | 'warning' | 'important';
    text: string;
  };
}

export interface DocArticle {
  slug: string;
  title: string;
  category: string;
  description: string;
  readTime: string;
  sections: DocSection[];
}

export const DOCS_NAVIGATION: DocNavigationGroup[] = [
  {
    category: 'GETTING STARTED',
    items: [
      { title: 'Overview & Introduction', href: '/docs/introduction', description: 'Architecture, Base URL, and API Versioning' },
      { title: '5-Minute Quickstart', href: '/docs/quickstart', badge: 'Start here', description: 'Zero to first WhatsApp API message in 5 minutes' },
      { title: 'Authentication & API Keys', href: '/docs/authentication', description: 'Bearer tokens, hashing, and security best practices' },
    ]
  },
  {
    category: 'CORE APIs',
    items: [
      { title: 'Messages API', href: '/docs/messages', description: 'Send template and text messages with positional variables' },
      { title: 'Contacts API', href: '/docs/contacts', description: 'CRUD, bulk import/delete, phone normalization, custom fields' },
      { title: 'Groups & Audiences', href: '/docs/groups', description: 'Audience management and contact memberships' },
      { title: 'Templates & Variables', href: '/docs/templates', description: 'Meta WABA templates, languages, approval status' },
      { title: 'Campaigns & Broadcasts', href: '/docs/campaigns', description: 'Broadcast pipelines (Contacts, Groups, Direct recipients)' },
    ]
  },
  {
    category: 'EVENTS & WEBHOOKS',
    items: [
      { title: 'Outbound Webhooks', href: '/docs/webhooks', description: 'Real-time event subscriptions, payloads, and testing' },
      { title: 'Signature Verification', href: '/docs/webhook-security', description: 'HMAC-SHA256 signature verification code examples' },
      { title: 'Retries & Failure Policy', href: '/docs/webhook-retries', description: '3-attempt exponential backoff and timeout rules' },
    ]
  },
  {
    category: 'PLATFORM & RELIABILITY',
    items: [
      { title: 'Error Handling', href: '/docs/errors', description: 'Standard error envelope, HTTP status codes, Meta error codes' },
      { title: 'API Rate Limiting', href: '/docs/rate-limits', description: 'Token bucket request limits, burst capacity, Retry-After' },
      { title: 'Idempotency', href: '/docs/idempotency', description: 'Idempotency-Key header, duplicate prevention, 24h TTL' },
      { title: 'API Usage & Telemetry', href: '/docs/api-usage', description: 'Request counts, latency breakdown, operational logs' },
    ]
  },
  {
    category: 'INTEGRATION GUIDES',
    items: [
      { title: 'CRM / ERP Integration', href: '/docs/guides/crm-integration', description: 'Direct recipients vs. contact sync architecture trade-offs' },
      { title: 'Bulk File vs. JSON API', href: '/docs/guides/csv-campaigns', description: 'When to use CSV bulk upload vs. programmatic JSON API' },
    ]
  },
  {
    category: 'API REFERENCE',
    items: [
      { title: 'Full API Reference', href: '/docs/api-reference', description: 'Complete interactive endpoint index and schema catalog' },
      { title: 'Messages Reference', href: '/docs/api-reference/messages' },
      { title: 'Contacts Reference', href: '/docs/api-reference/contacts' },
      { title: 'Groups Reference', href: '/docs/api-reference/groups' },
      { title: 'Templates Reference', href: '/docs/api-reference/templates' },
      { title: 'Campaigns Reference', href: '/docs/api-reference/campaigns' },
      { title: 'Webhooks Reference', href: '/docs/api-reference/webhooks' },
      { title: 'API Keys Reference', href: '/docs/api-reference/keys' },
      { title: 'Usage & Logs Reference', href: '/docs/api-reference/usage' },
    ]
  }
];

export const DOCS_ARTICLES: Record<string, DocArticle> = {
  'introduction': {
    slug: 'introduction',
    title: 'Overview & Introduction',
    category: 'Getting Started',
    description: 'Welcome to the PingStack Developer Platform. Integrate WhatsApp Cloud API messaging with your CRM, billing, and backend applications.',
    readTime: '4 min',
    sections: [
      {
        id: 'welcome',
        title: 'Welcome to PingStack Developer API',
        content: `PingStack is an enterprise-grade WhatsApp Business platform built on the direct Meta WhatsApp Cloud API with 0% message markup.

The PingStack REST API enables developers to programmatically dispatch template notifications, synchronize contacts, organize audiences, trigger broadcast campaigns, and subscribe to real-time outbound webhooks with built-in idempotency, rate limiting, and failure isolation.`,
      },
      {
        id: 'meta-relationship',
        title: 'PingStack & Meta WhatsApp Architecture',
        content: `Understanding the architectural pipeline ensures seamless integration:

\`\`\`
Your Application
  │  (HTTPS Bearer Token)
  ▼
PingStack Developer API (/api/v1/...)
  │  (Quota validation, phone normalization, idempotency caching, Redis BullMQ queues)
  ▼
PingStack Background Workers
  │  (Rate smoothing, circuit-breakers, retry policies)
  ▼
Meta WhatsApp Cloud API
  │  (Telco routing, template validation, policy enforcement)
  ▼
Recipient WhatsApp Device
\`\`\`

* **PingStack Responsibilities**: Authentication, tenant isolation, request logging, idempotent dispatch, queue management, retry orchestration, and outbound webhook delivery.
* **Meta Responsibilities**: Message template approvals, telco carrier message routing, 24-hour customer service window enforcement, and end-user handset delivery.`,
      },
      {
        id: 'base-url',
        title: 'Base URL & API Versioning',
        content: `All API requests must be made over HTTPS. The current version of the PingStack Developer API is **v1**.

All endpoints reside under the \`/api/v1\` namespace.`,
        codeSnippets: [
          {
            language: 'bash',
            label: 'Production URL',
            code: 'https://app.pingstack.in/api/v1'
          },
          {
            language: 'bash',
            label: 'Local Dev URL',
            code: 'http://localhost:3000/api/v1'
          }
        ]
      },
      {
        id: 'response-envelope',
        title: 'Standard JSON Response Envelope',
        content: `Every response returned by the PingStack API follows a standard, predictable JSON structure containing a \`success\` flag, a \`request_id\` for tracing, and either \`data\` or an \`error\` object.`,
        codeSnippets: [
          {
            language: 'json',
            label: 'Success Response (200 / 201)',
            code: `{\n  "success": true,\n  "data": {\n    "message_id": "8b9e6722-1d54-4a2e-b6a1-cb9e4f509d2a",\n    "recipient": "919876543210",\n    "status": "queued"\n  },\n  "request_id": "req_7f2b9a1c0d3e"\n}`
          },
          {
            language: 'json',
            label: 'Error Response (4xx / 5xx)',
            code: `{\n  "success": false,\n  "error": {\n    "code": "VALIDATION_ERROR",\n    "message": "Recipient phone number is invalid.",\n    "details": [\n      { "field": "to", "message": "Phone number must include country code" }\n    ]\n  },\n  "request_id": "req_7f2b9a1c0d3e"\n}`
          }
        ]
      }
    ]
  },

  'quickstart': {
    slug: 'quickstart',
    title: '5-Minute Quickstart Guide',
    category: 'Getting Started',
    description: 'Get from zero to your first authenticated WhatsApp message in less than 5 minutes using cURL, Node.js, Python, Java, or Go.',
    readTime: '5 min',
    sections: [
      {
        id: 'step-1-account',
        title: 'Step 1: Connect your WhatsApp Account',
        content: `1. Log in to your **PingStack Workspace** at [https://app.pingstack.in](https://app.pingstack.in).
2. Navigate to **Workspace Settings → WhatsApp Connection**.
3. Complete the Meta Embedded Signup to link your WhatsApp Business Phone Number.

*Note: If your WhatsApp connection is pending, PingStack automatically routes requests in **Sandbox Mode**, returning mock delivery responses for safe local integration testing.*`
      },
      {
        id: 'step-2-api-key',
        title: 'Step 2: Generate a Developer API Key',
        content: `1. In your Workspace, navigate to **Settings → Developer API** (or use the API key provisioning endpoint).
2. Click **Create API Key** and provide a label (e.g. \`Production Backend\`).
3. Copy your plaintext key starting with \`ps_secret_live_...\`.

*Important: Save this key in your server's environment variables. The plaintext secret is shown only once upon creation.*`
      },
      {
        id: 'step-3-send-message',
        title: 'Step 3: Send Your First WhatsApp Message',
        content: `Make a \`POST /api/v1/messages\` request with your Bearer API key. Provide the recipient phone number with country code and your template name with positional variables.`,
        codeSnippets: [
          {
            language: 'bash',
            label: 'cURL',
            code: `curl -X POST https://app.pingstack.in/api/v1/messages \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: quickstart-order-001" \\
  -d '{
    "to": "919876543210",
    "template": {
      "name": "fee_reminder",
      "language": "en_US"
    },
    "variables": {
      "1": "Rahul Sharma",
      "2": "₹2,500"
    }
  }'`
          },
          {
            language: 'javascript',
            label: 'Node.js',
            code: `const response = await fetch('https://app.pingstack.in/api/v1/messages', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY,
    'Content-Type': 'application/json',
    'Idempotency-Key': 'quickstart-order-001'
  },
  body: JSON.stringify({
    to: '919876543210',
    template: {
      name: 'fee_reminder',
      language: 'en_US'
    },
    variables: {
      '1': 'Rahul Sharma',
      '2': '₹2,500'
    }
  })
});

const data = await response.json();
console.log(data);`
          },
          {
            language: 'python',
            label: 'Python',
            code: `import os
import requests

url = "https://app.pingstack.in/api/v1/messages"
headers = {
    "Authorization": f"Bearer {os.getenv('PINGSTACK_API_KEY')}",
    "Content-Type": "application/json",
    "Idempotency-Key": "quickstart-order-001"
}
payload = {
    "to": "919876543210",
    "template": {
        "name": "fee_reminder",
        "language": "en_US"
    },
    "variables": {
        "1": "Rahul Sharma",
        "2": "₹2,500"
    }
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`
          },
          {
            language: 'java',
            label: 'Java',
            code: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Quickstart {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv().getOrDefault("PINGSTACK_API_KEY", "ps_secret_live_YOUR_API_KEY");
        String payload = """
            {
              "to": "919876543210",
              "template": {
                "name": "fee_reminder",
                "language": "en_US"
              },
              "variables": {
                "1": "Rahul Sharma",
                "2": "₹2,500"
              }
            }
            """;

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://app.pingstack.in/api/v1/messages"))
            .header("Authorization", "Bearer " + apiKey)
            .header("Content-Type", "application/json")
            .header("Idempotency-Key", "quickstart-order-001")
            .POST(HttpRequest.BodyPublishers.ofString(payload))
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println("Status: " + response.statusCode());
        System.out.println("Response: " + response.body());
    }
}`
          },
          {
            language: 'go',
            label: 'Go',
            code: `package main

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	apiKey := os.Getenv("PINGSTACK_API_KEY")
	if apiKey == "" {
		apiKey = "ps_secret_live_YOUR_API_KEY"
	}

	payload := []byte(\`{
		"to": "919876543210",
		"template": {
			"name": "fee_reminder",
			"language": "en_US"
		},
		"variables": {
			"1": "Rahul Sharma",
			"2": "₹2,500"
		}
	}\`)

	req, err := http.NewRequest("POST", "https://app.pingstack.in/api/v1/messages", bytes.NewBuffer(payload))
	if err != nil {
		panic(err)
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", "quickstart-order-001")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("Status: %d\\nResponse: %s\\n", resp.StatusCode, string(body))
}`
          }
        ]
      },
      {
        id: 'step-4-verify',
        title: 'Step 4: Inspect Response & Message Status',
        content: `When the request succeeds, PingStack returns \`HTTP 201 Created\` with the internal message ID. The message is queued in Redis BullMQ, dispatched to Meta Cloud API, and immediately visible in your PingStack Workspace Inbox.`,
        codeSnippets: [
          {
            language: 'json',
            label: 'Response (201 Created)',
            code: `{\n  "success": true,\n  "data": {\n    "message_id": "8b9e6722-1d54-4a2e-b6a1-cb9e4f509d2a",\n    "recipient": "919876543210",\n    "status": "queued",\n    "message_type": "template",\n    "template": "fee_reminder",\n    "content": "Dear Rahul Sharma, your pending fee of ₹2,500 is due.",\n    "created_at": "2026-09-09T22:00:00.000Z",\n    "sandbox": false\n  },\n  "request_id": "req_0a1b2c3d4e5f"\n}`
          }
        ]
      }
    ]
  },

  'authentication': {
    slug: 'authentication',
    title: 'Authentication & API Keys',
    category: 'Getting Started',
    description: 'Learn how API keys are formatted, authenticated, securely stored via SHA-256, and managed server-side.',
    readTime: '4 min',
    sections: [
      {
        id: 'bearer-token',
        title: 'Bearer Token Authentication',
        content: `PingStack uses Bearer authentication. You must pass your secret API key in the \`Authorization\` header of every HTTPS request.`,
        codeSnippets: [
          {
            language: 'bash',
            label: 'Header Format',
            code: 'Authorization: Bearer ps_secret_live_YOUR_API_KEY'
          }
        ]
      },
      {
        id: 'key-security',
        title: 'How Keys are Stored & Protected',
        content: `* **SHA-256 Hashing**: PingStack stores only the cryptographically secure SHA-256 hash of your API key in the database (\`api_secret_hash\`).
* **One-Time Secret Display**: Plaintext secrets are revealed **once** during key generation and can never be read again from the database or logs.
* **Server-Side Tenant Scoping**: Every API key is strictly scoped to its owning workspace. Client-supplied tenant IDs are ignored.
* **Last Used Tracking**: PingStack updates \`last_used_at\` asynchronously without slowing down request execution.`,
        callout: {
          type: 'warning',
          text: 'Never expose your API keys in client-side code, browser JavaScript, mobile apps, or public Git repositories. All API calls must originate from your secure backend server.'
        }
      },
      {
        id: 'managing-keys',
        title: 'Managing API Keys Programmatically',
        content: `You can list, create, and revoke API keys via \`/api/v1/keys\`.`,
        codeSnippets: [
          {
            language: 'bash',
            label: 'cURL',
            code: `# List Keys
curl https://app.pingstack.in/api/v1/keys \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY"

# Create Key
curl -X POST https://app.pingstack.in/api/v1/keys \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Billing Service Key", "description": "Used by invoices worker"}'

# Revoke Key
curl -X DELETE "https://app.pingstack.in/api/v1/keys?id=KEY_UUID" \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY"`
          },
          {
            language: 'javascript',
            label: 'Node.js',
            code: `// Create API Key
const createRes = await fetch('https://app.pingstack.in/api/v1/keys', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Billing Service Key',
    description: 'Used by invoices worker'
  })
});
const { data: newKey } = await createRes.json();
console.log('Plaintext API Key (save this now):', newKey.key);`
          },
          {
            language: 'python',
            label: 'Python',
            code: `import os
import requests

headers = {
    "Authorization": f"Bearer {os.getenv('PINGSTACK_API_KEY')}",
    "Content-Type": "application/json"
}

# Create new developer API key
response = requests.post(
    "https://app.pingstack.in/api/v1/keys",
    headers=headers,
    json={"name": "Billing Service Key", "description": "Used by invoices worker"}
)
print("Plaintext Key:", response.json()["data"]["key"])`
          },
          {
            language: 'java',
            label: 'Java',
            code: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class ManageKeys {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("PINGSTACK_API_KEY");
        HttpClient client = HttpClient.newHttpClient();

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://app.pingstack.in/api/v1/keys"))
            .header("Authorization", "Bearer " + apiKey)
            .GET()
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println("Active Keys: " + response.body());
    }
}`
          },
          {
            language: 'go',
            label: 'Go',
            code: `package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	apiKey := os.Getenv("PINGSTACK_API_KEY")
	req, _ := http.NewRequest("GET", "https://app.pingstack.in/api/v1/keys", nil)
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Println("Keys:", string(body))
}`
          }
        ]
      }
    ]
  },

  'messages': {
    slug: 'messages',
    title: 'Messages API',
    category: 'Core APIs',
    description: 'Send template and text messages, manage positional variables, normalize phone numbers, and query message history.',
    readTime: '6 min',
    sections: [
      {
        id: 'overview',
        title: 'Messaging Overview',
        content: `The Messages API allows sending individual WhatsApp messages to customers. When an outbound message is dispatched:
1. It is validated against plan template sending quotas (\`checkTemplateSendLimit\`).
2. Phone numbers are normalized into standard format with country code (e.g. \`919876543210\`).
3. Existing contacts are linked or automatically created on the fly.
4. The message is persisted in the \`messages\` table and enqueued into BullMQ \`message-queue\`.
5. The worker delivers the message to Meta Cloud API with circuit-breaker protection and exponential retries.`
      },
      {
        id: 'positional-variables',
        title: 'Template Positional Variables',
        content: `Meta WhatsApp templates use numbered positional placeholders: \`{{1}}\`, \`{{2}}\`, \`{{3}}\`, etc.

You can provide variables as:
* **A JSON Object**: \`{ "1": "Rahul", "2": "2500" }\`
* **A JSON Array**: \`["Rahul", "2500"]\`

*Note: Do not assume Var 1 means "name" unless your approved template specifically expects a name in slot 1.*`,
        codeSnippets: [
          {
            language: 'json',
            label: 'Positional Variables Object',
            code: `{\n  "to": "919876543210",\n  "template": {\n    "name": "fee_reminder",\n    "language": "en_US"\n  },\n  "variables": {\n    "1": "Rahul Sharma",\n    "2": "₹2,500"\n  }\n}`
          }
        ]
      },
      {
        id: 'send-message',
        title: 'Send Message Endpoint',
        content: `\`POST /api/v1/messages\``,
        tableData: {
          headers: ['Field', 'Type', 'Required', 'Description'],
          rows: [
            ['to', 'string', 'Yes', 'Recipient phone number with country code (e.g. 919876543210).'],
            ['template', 'string | object', 'Conditional', 'Template name or object { name, language }. Required for template sends.'],
            ['variables', 'object | array', 'No', 'Positional variables for template placeholders {{1}}, {{2}}, etc.'],
            ['text', 'string', 'Conditional', 'Direct session text body (allowed when 24h service window is active).'],
            ['language', 'string', 'No', 'Template language code. Defaults to "en_US".']
          ]
        },
        codeSnippets: [
          {
            language: 'bash',
            label: 'cURL',
            code: `curl -X POST https://app.pingstack.in/api/v1/messages \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: msg-tx-99124" \\
  -d '{
    "to": "919876543210",
    "template": "fee_reminder",
    "variables": ["Rahul", "₹2,500"]
  }'`
          },
          {
            language: 'javascript',
            label: 'Node.js',
            code: `const response = await fetch('https://app.pingstack.in/api/v1/messages', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY,
    'Content-Type': 'application/json',
    'Idempotency-Key': 'msg-tx-99124'
  },
  body: JSON.stringify({
    to: '919876543210',
    template: 'fee_reminder',
    variables: ['Rahul', '₹2,500']
  })
});
const data = await response.json();
console.log(data);`
          },
          {
            language: 'python',
            label: 'Python',
            code: `import os
import requests

url = "https://app.pingstack.in/api/v1/messages"
headers = {
    "Authorization": f"Bearer {os.getenv('PINGSTACK_API_KEY')}",
    "Content-Type": "application/json",
    "Idempotency-Key": "msg-tx-99124"
}
payload = {
    "to": "919876543210",
    "template": "fee_reminder",
    "variables": ["Rahul", "₹2,500"]
}
response = requests.post(url, json=payload, headers=headers)
print(response.json())`
          },
          {
            language: 'java',
            label: 'Java',
            code: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class SendMessage {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("PINGSTACK_API_KEY");
        String payload = """
            {
              "to": "919876543210",
              "template": "fee_reminder",
              "variables": ["Rahul", "₹2,500"]
            }
            """;

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://app.pingstack.in/api/v1/messages"))
            .header("Authorization", "Bearer " + apiKey)
            .header("Content-Type", "application/json")
            .header("Idempotency-Key", "msg-tx-99124")
            .POST(HttpRequest.BodyPublishers.ofString(payload))
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`
          },
          {
            language: 'go',
            label: 'Go',
            code: `package main

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	apiKey := os.Getenv("PINGSTACK_API_KEY")
	payload := []byte(\`{
		"to": "919876543210",
		"template": "fee_reminder",
		"variables": ["Rahul", "₹2,500"]
	}\`)

	req, _ := http.NewRequest("POST", "https://app.pingstack.in/api/v1/messages", bytes.NewBuffer(payload))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", "msg-tx-99124")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
          }
        ]
      },
      {
        id: 'list-messages',
        title: 'List Messages',
        content: `\`GET /api/v1/messages?page=1&pageSize=50&status=sent&phone=919876543210\``,
        codeSnippets: [
          {
            language: 'bash',
            label: 'cURL',
            code: 'curl "https://app.pingstack.in/api/v1/messages?page=1&pageSize=20&status=delivered" \\\n  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY"'
          }
        ]
      },
      {
        id: 'get-message',
        title: 'Get Message Details',
        content: `\`GET /api/v1/messages/{id}\``,
        codeSnippets: [
          {
            language: 'bash',
            label: 'cURL',
            code: 'curl https://app.pingstack.in/api/v1/messages/8b9e6722-1d54-4a2e-b6a1-cb9e4f509d2a \\\n  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY"'
          }
        ]
      }
    ]
  },

  'contacts': {
    slug: 'contacts',
    title: 'Contacts API',
    category: 'Core APIs',
    description: 'Manage workspace contacts, search customer records, handle custom metadata fields, and perform bulk batch imports.',
    readTime: '5 min',
    sections: [
      {
        id: 'overview',
        title: 'Contacts Overview',
        content: `Contacts represent individual customer records identified by their normalized phone number. Phone normalization strips spaces, hyphens, and non-numeric characters, ensuring seamless cross-referencing between international and local formats.`
      },
      {
        id: 'endpoints',
        title: 'Available Endpoints',
        content: `* \`GET /api/v1/contacts\` — List contacts with search and pagination (\`page\`, \`pageSize\`, \`search\`, \`tag\`).
* \`POST /api/v1/contacts\` — Create or upsert a contact (\`name\`, \`phone_number\`, \`email\`, \`custom_fields\`, \`tags\`).
* \`GET /api/v1/contacts/{id}\` — Retrieve single contact.
* \`PATCH /api/v1/contacts/{id}\` — Update contact fields.
* \`DELETE /api/v1/contacts/{id}\` — Delete contact.
* \`POST /api/v1/contacts/bulk\` — Bulk upsert up to 500 contacts per batch.
* \`DELETE /api/v1/contacts/bulk\` — Bulk delete contacts.`
      },
      {
        id: 'bulk-import',
        title: 'Bulk Contact Operations',
        content: `The bulk endpoint processes arrays of contact records and reports partial failures with per-index error details.`,
        codeSnippets: [
          {
            language: 'bash',
            label: 'cURL',
            code: `curl -X POST https://app.pingstack.in/api/v1/contacts/bulk \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "contacts": [
      { "name": "Aarav", "phone": "919876543210", "tags": ["vip"] },
      { "name": "Meera", "phone": "919876543211", "custom_fields": { "plan": "Enterprise" } }
    ]
  }'`
          },
          {
            language: 'javascript',
            label: 'Node.js',
            code: `const res = await fetch('https://app.pingstack.in/api/v1/contacts/bulk', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    contacts: [
      { name: 'Aarav', phone: '919876543210', tags: ['vip'] },
      { name: 'Meera', phone: '919876543211', custom_fields: { plan: 'Enterprise' } }
    ]
  })
});
const data = await res.json();
console.log(data);`
          },
          {
            language: 'python',
            label: 'Python',
            code: `import os
import requests

headers = {
    "Authorization": f"Bearer {os.getenv('PINGSTACK_API_KEY')}",
    "Content-Type": "application/json"
}
payload = {
    "contacts": [
        {"name": "Aarav", "phone": "919876543210", "tags": ["vip"]},
        {"name": "Meera", "phone": "919876543211", "custom_fields": {"plan": "Enterprise"}}
    ]
}
response = requests.post("https://app.pingstack.in/api/v1/contacts/bulk", headers=headers, json=payload)
print(response.json())`
          },
          {
            language: 'java',
            label: 'Java',
            code: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class BulkContacts {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("PINGSTACK_API_KEY");
        String payload = """
            {
              "contacts": [
                { "name": "Aarav", "phone": "919876543210", "tags": ["vip"] },
                { "name": "Meera", "phone": "919876543211" }
              ]
            }
            """;

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://app.pingstack.in/api/v1/contacts/bulk"))
            .header("Authorization", "Bearer " + apiKey)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(payload))
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`
          },
          {
            language: 'go',
            label: 'Go',
            code: `package main

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	apiKey := os.Getenv("PINGSTACK_API_KEY")
	payload := []byte(\`{
		"contacts": [
			{ "name": "Aarav", "phone": "919876543210", "tags": ["vip"] },
			{ "name": "Meera", "phone": "919876543211" }
		]
	}\`)

	req, _ := http.NewRequest("POST", "https://app.pingstack.in/api/v1/contacts/bulk", bytes.NewBuffer(payload))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
          }
        ]
      }
    ]
  },

  'groups': {
    slug: 'groups',
    title: 'Groups & Audiences API',
    category: 'Core APIs',
    description: 'Create segmented customer groups and manage contact memberships for broadcast campaigns.',
    readTime: '4 min',
    sections: [
      {
        id: 'overview',
        title: 'Audience Groups Overview',
        content: `Groups allow organizing contacts into reusable audience segments (e.g. "VIP Customers", "September Invoices"). Groups can be directly targeted in broadcast campaigns.`
      },
      {
        id: 'group-crud',
        title: 'Group Operations',
        content: `* \`GET /api/v1/groups\` — List all groups with dynamic contact counts.
* \`POST /api/v1/groups\` — Create a new group (\`name\`, \`description\`).
* \`GET /api/v1/groups/{id}\` — Get group details.
* \`PATCH /api/v1/groups/{id}\` — Update group name/description.
* \`DELETE /api/v1/groups/{id}\` — Delete group and memberships.`
      },
      {
        id: 'membership-crud',
        title: 'Managing Group Memberships',
        content: `Add or remove contact IDs from groups dynamically:`,
        codeSnippets: [
          {
            language: 'bash',
            label: 'cURL',
            code: `# Add Contacts
curl -X POST https://app.pingstack.in/api/v1/groups/GROUP_UUID/contacts \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"contact_ids": ["CONTACT_UUID_1", "CONTACT_UUID_2"]}'

# Remove Contacts
curl -X DELETE https://app.pingstack.in/api/v1/groups/GROUP_UUID/contacts \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"contact_ids": ["CONTACT_UUID_1"]}'`
          },
          {
            language: 'javascript',
            label: 'Node.js',
            code: `// Add contacts to group
const res = await fetch(\`https://app.pingstack.in/api/v1/groups/\${groupId}/contacts\`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    contact_ids: ['CONTACT_UUID_1', 'CONTACT_UUID_2']
  })
});
const data = await res.json();
console.log(data);`
          },
          {
            language: 'python',
            label: 'Python',
            code: `import os
import requests

headers = {
    "Authorization": f"Bearer {os.getenv('PINGSTACK_API_KEY')}",
    "Content-Type": "application/json"
}
group_id = "GROUP_UUID"
res = requests.post(
    f"https://app.pingstack.in/api/v1/groups/{group_id}/contacts",
    headers=headers,
    json={"contact_ids": ["CONTACT_UUID_1", "CONTACT_UUID_2"]}
)
print(res.json())`
          },
          {
            language: 'java',
            label: 'Java',
            code: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class ManageGroup {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("PINGSTACK_API_KEY");
        String groupId = "GROUP_UUID";
        String payload = "{\"contact_ids\": [\"CONTACT_UUID_1\"]}";

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://app.pingstack.in/api/v1/groups/" + groupId + "/contacts"))
            .header("Authorization", "Bearer " + apiKey)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(payload))
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`
          },
          {
            language: 'go',
            label: 'Go',
            code: `package main

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	apiKey := os.Getenv("PINGSTACK_API_KEY")
	groupId := "GROUP_UUID"
	payload := []byte(\`{"contact_ids": ["CONTACT_UUID_1"]}\`)

	req, _ := http.NewRequest("POST", "https://app.pingstack.in/api/v1/groups/"+groupId+"/contacts", bytes.NewBuffer(payload))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
          }
        ]
      }
    ]
  },

  'templates': {
    slug: 'templates',
    title: 'Templates & Variables API',
    category: 'Core APIs',
    description: 'Query approved Meta WhatsApp templates, inspection variable formats, language codes, and understand template synchronization.',
    readTime: '5 min',
    sections: [
      {
        id: 'overview',
        title: 'Meta WhatsApp Template Lifecycle',
        content: `WhatsApp requires business-initiated messages outside the 24-hour service window to use pre-approved Meta message templates.

* **PingStack Template Registry**: Mirrors approved templates from your WhatsApp Business Account (WABA).
* **Meta WhatsApp Cloud API**: Performs template review, approval (\`APPROVED\`, \`PENDING\`, \`REJECTED\`), and quality rating monitoring.
* **Synchronization**: PingStack continuously synchronizes approved templates so that newly approved templates in Meta Business Manager become instantly available for Developer API dispatches.`
      },
      {
        id: 'variable-mapping',
        title: 'Positional Variables Schema',
        content: `Approved templates use numbered placeholders: \`{{1}}\`, \`{{2}}\`, \`{{3}}\`.

When sending via API:
1. Provide variables matching the exact placeholder count.
2. Positional variables can be supplied as a numbered object (\`{"1": "Value", "2": "Value"}\`) or an ordered array (\`["Value1", "Value2"]\`).
3. Always supply the exact \`language\` code (e.g. \`en_US\`, \`hi\`, \`es\`) configured for that template variation.`
      },
      {
        id: 'list-templates',
        title: 'List & Fetch Templates',
        content: `* \`GET /api/v1/templates?status=APPROVED\` — Lists approved templates ready for messaging.
* \`GET /api/v1/templates/{id}\` — Fetches template details, variable structure, and category.`,
        codeSnippets: [
          {
            language: 'bash',
            label: 'cURL',
            code: `# List Approved Templates
curl "https://app.pingstack.in/api/v1/templates?status=APPROVED" \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY"

# Fetch Template by ID or Name
curl "https://app.pingstack.in/api/v1/templates/fee_reminder" \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY"`
          },
          {
            language: 'javascript',
            label: 'Node.js',
            code: `const res = await fetch('https://app.pingstack.in/api/v1/templates?status=APPROVED', {
  headers: { 'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY }
});
const { data: templates } = await res.json();
console.log(templates);`
          },
          {
            language: 'python',
            label: 'Python',
            code: `import os
import requests

headers = {"Authorization": f"Bearer {os.getenv('PINGSTACK_API_KEY')}"}
res = requests.get("https://app.pingstack.in/api/v1/templates?status=APPROVED", headers=headers)
print(res.json())`
          },
          {
            language: 'java',
            label: 'Java',
            code: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class ListTemplates {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("PINGSTACK_API_KEY");
        HttpClient client = HttpClient.newHttpClient();

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://app.pingstack.in/api/v1/templates?status=APPROVED"))
            .header("Authorization", "Bearer " + apiKey)
            .GET()
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`
          },
          {
            language: 'go',
            label: 'Go',
            code: `package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	apiKey := os.Getenv("PINGSTACK_API_KEY")
	req, _ := http.NewRequest("GET", "https://app.pingstack.in/api/v1/templates?status=APPROVED", nil)
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
          }
        ]
      }
    ]
  },

  'campaigns': {
    slug: 'campaigns',
    title: 'Campaigns & Broadcasts API',
    category: 'Core APIs',
    description: 'Orchestrate high-volume broadcast campaigns across saved contacts, audience groups, or direct external CRM recipient lists with template variables.',
    readTime: '8 min',
    sections: [
      {
        id: 'overview',
        title: 'Campaigns Overview',
        content: `The PingStack Campaigns API allows developers and backend systems to dispatch bulk WhatsApp template notifications to hundreds or thousands of recipients in a single background operation.

When a campaign is launched:
1. The API validates plan daily template allowances and idempotency keys.
2. Recipients from selected groups, saved contacts, and direct CRM arrays are normalized and automatically deduplicated by phone number.
3. The batch job is enqueued into Redis BullMQ (\`campaign-queue\`), immediately returning an asynchronous \`running\` status without risking HTTP request timeouts.
4. The background worker resolves template positional placeholders, persists message records, and queues dispatches to Meta WhatsApp Cloud API with built-in rate smoothing.`
      },
      {
        id: 'when-to-use',
        title: 'When to Use Campaigns vs. Messages API',
        content: `PingStack provides two distinct ways to send outbound WhatsApp messages:

* **Messages API (\`POST /api/v1/messages\`)**: Best for individual, real-time transactional alerts triggered by immediate user actions (e.g. OTP verification, login confirmation, instant order payment receipt).
* **Campaigns API (\`POST /api/v1/campaigns/{id}/launch\`)**: Best for batch notifications, fee reminders, monthly statements, marketing announcements, and broadcast newsletters sent to multiple recipients simultaneously with aggregated delivery reporting.`
      },
      {
        id: 'decision-guide',
        title: 'Audience Decision Guide',
        content: `Choose the integration model that best fits your system architecture:`,
        tableData: {
          headers: ['Your Requirement', 'Recommended Model', 'API Parameters Used'],
          rows: [
            ['I maintain customers in my own CRM / ERP database', 'Direct JSON Recipients (No contact sync needed)', 'recipients: [{ phone, variables }]'],
            ['I want PingStack to manage my contact database & segments', 'Saved Contacts & Groups', 'group_ids: ["..."] or contact_ids: ["..."]'],
            ['I want the exact same variable values for everyone', 'Shared Template Variables', 'template_variables: { "1": "Sep", "2": "₹2500" }'],
            ['Every recipient has different customized variable data', 'Per-Recipient Variable Mapping', 'recipients: [{ phone, variables: { "1": "...", "2": "..." } }]'],
            ['The template has no variables (static message)', 'No Variables Required', 'Pass group_ids, contact_ids, or recipients without variables'],
            ['I have an Excel / CSV spreadsheet file', 'Web UI File Upload or Backend JSON Script', 'Upload in PingStack Console or parse in backend to JSON']
          ]
        }
      },
      {
        id: 'scenario-1-no-variables',
        title: '1. Audience + Template with No Variables',
        content: `If your approved Meta WhatsApp template does not contain any variable placeholders (e.g. a general holiday announcement or terms update), you can launch the campaign by simply providing the target audience. No variable mapping is required.

* **Audience**: \`group_ids\`, \`contact_ids\`, or \`recipients\`
* **Variables**: None`
      },
      {
        id: 'scenario-2-shared-variables',
        title: '2. Audience + Template with Shared Variables (Same Values for All)',
        content: `When sending to a group or contact list where all recipients should receive the **exact same placeholder values** (e.g. Month = "September", Due Date = "15th September"):

Pass the \`group_ids\` or \`contact_ids\` along with a top-level \`template_variables\` object. Every resolved recipient in the audience receives these shared values.

* **Dynamic Macros**: In \`template_variables\`, you can optionally use \`{{name}}\` (resolves to the contact's saved name) or \`{{phone}}\` (resolves to the contact's phone number).`,
        codeSnippets: [
          {
            language: 'json',
            label: 'Shared Variables Payload',
            code: `{\n  "group_ids": ["g_parents_grade_10"],\n  "template_variables": {\n    "1": "{{name}}",\n    "2": "September 2026",\n    "3": "15th Sep"\n  }\n}`
          }
        ]
      },
      {
        id: 'scenario-3-per-recipient-variables',
        title: '3. Template with Per-Recipient Variables (Customized Values)',
        content: `When each recipient requires unique, individual variable data (e.g. individual invoice amounts or student fee balances):

* **Rahul** (919876543210) → Var 1: "Rahul", Var 2: "₹2,500"
* **Amit** (919876543211) → Var 1: "Amit", Var 2: "₹1,800"
* **Neha** (919876543212) → Var 1: "Neha", Var 2: "₹3,200"

Pass the \`recipients\` array where each item contains the recipient's phone number and their specific positional \`variables\`.

*Important: The phone number is the recipient identity, NOT variable 1. Template variables remain positional placeholders corresponding to Meta template slots {{1}}, {{2}}, etc.*`,
        codeSnippets: [
          {
            language: 'json',
            label: 'Per-Recipient Payload',
            code: `{\n  "recipients": [\n    {\n      "phone": "919876543210",\n      "name": "Rahul Sharma",\n      "variables": {\n        "1": "Rahul",\n        "2": "₹2,500",\n        "3": "15 Sep"\n      }\n    },\n    {\n      "phone": "919876543211",\n      "name": "Amit Kumar",\n      "variables": {\n        "1": "Amit",\n        "2": "₹1,800",\n        "3": "15 Sep"\n      }\n    }\n  ]\n}`
          }
        ]
      },
      {
        id: 'lifecycle-examples',
        title: 'Complete Lifecycle Code Examples',
        content: `### Step 1: Create Campaign Draft (\`POST /api/v1/campaigns\`)`,
        codeSnippets: [
          {
            language: 'bash',
            label: 'cURL Create Campaign',
            code: `curl -X POST https://app.pingstack.in/api/v1/campaigns \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "September Fee Reminders",
    "template_name": "fee_reminder"
  }'`
          },
          {
            language: 'javascript',
            label: 'Node.js Create Campaign',
            code: `const createRes = await fetch('https://app.pingstack.in/api/v1/campaigns', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'September Fee Reminders',
    template_name: 'fee_reminder'
  })
});
const { data: campaign } = await createRes.json();
console.log('Created Campaign ID:', campaign.id);`
          },
          {
            language: 'python',
            label: 'Python Create Campaign',
            code: `import os
import requests

headers = {
    "Authorization": f"Bearer {os.getenv('PINGSTACK_API_KEY')}",
    "Content-Type": "application/json"
}

res = requests.post(
    "https://app.pingstack.in/api/v1/campaigns",
    headers=headers,
    json={"name": "September Fee Reminders", "template_name": "fee_reminder"}
)
campaign = res.json()["data"]
print("Created Campaign ID:", campaign["id"])`
          },
          {
            language: 'java',
            label: 'Java Create Campaign',
            code: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class CreateCampaign {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("PINGSTACK_API_KEY");
        String payload = """
            {
              "name": "September Fee Reminders",
              "template_name": "fee_reminder"
            }
            """;

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://app.pingstack.in/api/v1/campaigns"))
            .header("Authorization", "Bearer " + apiKey)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(payload))
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`
          },
          {
            language: 'go',
            label: 'Go Create Campaign',
            code: `package main

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	apiKey := os.Getenv("PINGSTACK_API_KEY")
	payload := []byte(\`{
		"name": "September Fee Reminders",
		"template_name": "fee_reminder"
	}\`)

	req, _ := http.NewRequest("POST", "https://app.pingstack.in/api/v1/campaigns", bytes.NewBuffer(payload))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
          }
        ]
      },
      {
        id: 'launch-examples',
        title: 'Step 2: Launch Campaign with Audience (\`POST /api/v1/campaigns/{id}/launch\`)',
        content: `Pass \`group_ids\`, \`contact_ids\`, or direct \`recipients\` with positional variables:`,
        codeSnippets: [
          {
            language: 'bash',
            label: 'cURL Launch',
            code: `curl -X POST https://app.pingstack.in/api/v1/campaigns/CAMPAIGN_ID/launch \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: fee-batch-2026-09-01" \\
  -d '{
    "recipients": [
      {
        "phone": "919876543210",
        "variables": { "1": "Rahul", "2": "₹2,500", "3": "15 Sep" }
      },
      {
        "phone": "919876543211",
        "variables": { "1": "Amit", "2": "₹1,800", "3": "15 Sep" }
      }
    ]
  }'`
          },
          {
            language: 'javascript',
            label: 'Node.js Launch',
            code: `const launchRes = await fetch(\`https://app.pingstack.in/api/v1/campaigns/\${campaign.id}/launch\`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY,
    'Content-Type': 'application/json',
    'Idempotency-Key': 'fee-batch-2026-09-01'
  },
  body: JSON.stringify({
    recipients: [
      { phone: '919876543210', variables: { '1': 'Rahul', '2': '₹2,500', '3': '15 Sep' } },
      { phone: '919876543211', variables: { '1': 'Amit', '2': '₹1,800', '3': '15 Sep' } }
    ]
  })
});
const launchData = await launchRes.json();
console.log(launchData);`
          },
          {
            language: 'python',
            label: 'Python Launch',
            code: `launch_res = requests.post(
    f"https://app.pingstack.in/api/v1/campaigns/{campaign['id']}/launch",
    headers={**headers, "Idempotency-Key": "fee-batch-2026-09-01"},
    json={
        "recipients": [
            {"phone": "919876543210", "variables": {"1": "Rahul", "2": "₹2,500", "3": "15 Sep"}},
            {"phone": "919876543211", "variables": {"1": "Amit", "2": "₹1,800", "3": "15 Sep"}}
        ]
    }
)
print(launch_res.json())`
          },
          {
            language: 'java',
            label: 'Java Launch',
            code: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class LaunchCampaign {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("PINGSTACK_API_KEY");
        String campaignId = "CAMPAIGN_ID";
        String payload = """
            {
              "recipients": [
                {
                  "phone": "919876543210",
                  "variables": { "1": "Rahul", "2": "₹2,500" }
                }
              ]
            }
            """;

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://app.pingstack.in/api/v1/campaigns/" + campaignId + "/launch"))
            .header("Authorization", "Bearer " + apiKey)
            .header("Content-Type", "application/json")
            .header("Idempotency-Key", "fee-batch-2026-09-01")
            .POST(HttpRequest.BodyPublishers.ofString(payload))
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`
          },
          {
            language: 'go',
            label: 'Go Launch',
            code: `package main

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	apiKey := os.Getenv("PINGSTACK_API_KEY")
	campaignId := "CAMPAIGN_ID"
	payload := []byte(\`{
		"recipients": [
			{
				"phone": "919876543210",
				"variables": { "1": "Rahul", "2": "₹2,500" }
			}
		]
	}\`)

	req, _ := http.NewRequest("POST", "https://app.pingstack.in/api/v1/campaigns/"+campaignId+"/launch", bytes.NewBuffer(payload))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", "fee-batch-2026-09-01")

	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
          }
        ]
      },
      {
        id: 'status-results',
        title: 'Status Lifecycle & Querying Results',
        content: `* **Campaign Statuses**: \`draft\` → \`scheduled\` (Growth plan) → \`running\` (processing in BullMQ) → \`completed\` (or \`failed\`).
* **Query Live Metrics**: \`GET /api/v1/campaigns/{id}/results\` returns delivery counts and read rates:`,
        codeSnippets: [
          {
            language: 'json',
            label: 'Results Response Format',
            code: `{\n  "success": true,\n  "data": {\n    "campaign_id": "c8a1b2c3-1d2e-4f5a-b6c7-8d9e0f1a2b3c",\n    "name": "September Fee Reminders",\n    "status": "completed",\n    "metrics": {\n      "total_messages": 250,\n      "pending": 0,\n      "sent": 248,\n      "delivered": 245,\n      "read": 192,\n      "failed": 2,\n      "delivered_rate_pct": 98,\n      "read_rate_pct": 77\n    }\n  },\n  "request_id": "req_9f0e1d2c"\n}`
          }
        ]
      },
      {
        id: 'idempotency-and-quotas',
        title: 'Idempotency, Quotas & Rate Limits',
        content: `* **Idempotency**: Always pass an \`Idempotency-Key\` header when launching campaigns. If network latency triggers an automatic client retry within 24 hours, PingStack replays the existing launch response without creating duplicate message jobs.
* **Plan Quota Checking**: Before queueing campaign messages, PingStack checks your daily template message allowance. If your plan limit is insufficient, the launch request returns \`HTTP 403 LIMIT_EXCEEDED\`.
* **Rate Smoothing**: Background dispatches are rate-smoothed across Redis workers to prevent Meta Cloud API throughput spikes.`
      },
      {
        id: 'troubleshooting',
        title: 'Common Errors & Troubleshooting',
        tableData: {
          headers: ['Error Code', 'HTTP Status', 'Cause & Resolution'],
          rows: [
            ['VALIDATION_ERROR', '400', 'No audience provided. Ensure at least one of "contact_ids", "group_ids", or "recipients" is non-empty.'],
            ['NOT_FOUND', '404', 'Campaign ID does not exist or belongs to another workspace.'],
            ['LIMIT_EXCEEDED', '403', 'Daily template message allowance reached for your plan. Upgrade required.'],
            ['FEATURE_GATED', '403', 'Campaign scheduling ("scheduled_at") is restricted to Growth and Pro plans.'],
            ['CONFLICT', '409', 'Idempotency-Key was already used with a differing request payload body.'],
            ['INTERNAL_SERVER_ERROR', '500', 'Unexpected backend error. Retry with backoff.']
          ]
        }
      }
    ]
  },

  'webhooks': {
    slug: 'webhooks',
    title: 'Outbound Developer Webhooks',
    category: 'Events & Webhooks',
    description: 'Subscribe to real-time events for incoming customer messages, delivery receipts, and campaign updates.',
    readTime: '5 min',
    sections: [
      {
        id: 'supported-events',
        title: 'Supported Event Types',
        content: `PingStack emits real-time HTTP POST webhooks for the following domain events:

* \`message.received\` — A customer sent a WhatsApp message to your number.
* \`message.sent\` — A message was accepted by Meta Cloud API.
* \`message.delivered\` — Delivered to the recipient's phone.
* \`message.read\` — Read by the recipient.
* \`message.failed\` — Delivery failed (includes Meta error code).
* \`campaign.started\` — Broadcast execution started in background.
* \`campaign.completed\` — Broadcast execution finished.
* \`contact.created\` / \`contact.updated\` / \`contact.deleted\` — Contact database mutations.
* \`ping\` — Verification ping emitted during webhook setup/testing.`
      },
      {
        id: 'register-endpoint',
        title: 'Registering a Webhook Endpoint',
        content: `\`POST /api/v1/webhooks\``,
        codeSnippets: [
          {
            language: 'bash',
            label: 'cURL',
            code: `curl -X POST https://app.pingstack.in/api/v1/webhooks \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://api.mycrm.com/webhooks/pingstack",
    "events": ["message.received", "message.delivered", "message.failed"]
  }'`
          },
          {
            language: 'javascript',
            label: 'Node.js',
            code: `const res = await fetch('https://app.pingstack.in/api/v1/webhooks', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://api.mycrm.com/webhooks/pingstack',
    events: ['message.received', 'message.delivered', 'message.failed']
  })
});
const data = await res.json();
console.log('Signing Secret (shown once):', data.data.signing_secret);`
          },
          {
            language: 'python',
            label: 'Python',
            code: `import os
import requests

headers = {
    "Authorization": f"Bearer {os.getenv('PINGSTACK_API_KEY')}",
    "Content-Type": "application/json"
}
res = requests.post(
    "https://app.pingstack.in/api/v1/webhooks",
    headers=headers,
    json={"url": "https://api.mycrm.com/webhooks/pingstack", "events": ["message.received", "message.delivered"]}
)
print("Signing Secret:", res.json()["data"]["signing_secret"])`
          },
          {
            language: 'java',
            label: 'Java',
            code: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class RegisterWebhook {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("PINGSTACK_API_KEY");
        String payload = """
            {
              "url": "https://api.mycrm.com/webhooks/pingstack",
              "events": ["message.received", "message.delivered"]
            }
            """;

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://app.pingstack.in/api/v1/webhooks"))
            .header("Authorization", "Bearer " + apiKey)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(payload))
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`
          },
          {
            language: 'go',
            label: 'Go',
            code: `package main

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	apiKey := os.Getenv("PINGSTACK_API_KEY")
	payload := []byte(\`{
		"url": "https://api.mycrm.com/webhooks/pingstack",
		"events": ["message.received", "message.delivered"]
	}\`)

	req, _ := http.NewRequest("POST", "https://app.pingstack.in/api/v1/webhooks", bytes.NewBuffer(payload))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
          }
        ]
      }
    ]
  },

  'webhook-security': {
    slug: 'webhook-security',
    title: 'Webhook Signature Verification',
    category: 'Events & Webhooks',
    description: 'Verify HMAC-SHA256 signatures to ensure webhook payloads originate genuinely from PingStack.',
    readTime: '4 min',
    sections: [
      {
        id: 'headers',
        title: 'Webhook Security Headers',
        content: `Every webhook POST request dispatched by PingStack contains security headers:

* \`X-Pingstack-Event\`: Event name (e.g. \`message.received\`).
* \`X-Pingstack-Event-Id\`: Unique event UUID (\`evt_...\`).
* \`X-Pingstack-Timestamp\`: Unix timestamp in milliseconds.
* \`X-Pingstack-Signature\`: \`v1=<hex>\` HMAC-SHA256 signature calculated over \`\${timestamp}.\${rawBody}\` using your endpoint's \`signing_secret\`.`
      },
      {
        id: 'verification-code',
        title: 'Verification Implementation in 5 Languages',
        content: `Use timing-safe comparison over the raw UTF-8 request body:`,
        codeSnippets: [
          {
            language: 'javascript',
            label: 'Node.js / Express',
            code: `import crypto from 'crypto';

export function verifyWebhook(rawBody, signatureHeader, timestampHeader, signingSecret) {
  const expected = crypto
    .createHmac('sha256', signingSecret)
    .update(\`\${timestampHeader}.\${rawBody}\`)
    .digest('hex');

  const received = (signatureHeader || '').replace('v1=', '');
  
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}`
          },
          {
            language: 'python',
            label: 'Python (FastAPI / Flask)',
            code: `import hmac
import hashlib

def verify_webhook(raw_body: bytes, signature_header: str, timestamp_header: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode('utf-8'),
        f"{timestamp_header}.".encode('utf-8') + raw_body,
        hashlib.sha256
    ).hexdigest()
    received = signature_header.replace("v1=", "")
    return hmac.compare_digest(received, expected)`
          },
          {
            language: 'java',
            label: 'Java (Spring Boot / Javalin)',
            code: `import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

public class WebhookVerifier {
    public static boolean verifyWebhook(String rawBody, String signatureHeader, String timestampHeader, String secret) {
        try {
            String payloadToSign = timestampHeader + "." + rawBody;
            Mac sha256Hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256Hmac.init(secretKey);
            byte[] hash = sha256Hmac.doFinal(payloadToSign.getBytes(StandardCharsets.UTF_8));
            
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                hexString.append(String.format("%02x", b));
            }
            String expected = hexString.toString();
            String received = (signatureHeader != null ? signatureHeader : "").replace("v1=", "");
            
            return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), received.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            return false;
        }
    }
}`
          },
          {
            language: 'go',
            label: 'Go (net/http / Gin)',
            code: `package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"strings"
)

func VerifyWebhook(rawBody []byte, signatureHeader string, timestampHeader string, secret string) bool {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(timestampHeader + "."))
	mac.Write(rawBody)
	expectedSignature := hex.EncodeToString(mac.Sum(nil))

	receivedSignature := strings.TrimPrefix(signatureHeader, "v1=")
	return hmac.Equal([]byte(receivedSignature), []byte(expectedSignature))
}`
          },
          {
            language: 'bash',
            label: 'CLI / OpenSSL',
            code: `# Calculate HMAC-SHA256 signature in bash
TIMESTAMP=$(date +%s%3N)
SIGNATURE=$(echo -n "\${TIMESTAMP}.\${RAW_BODY}" | openssl dgst -sha256 -hmac "whsec_YOUR_SIGNING_SECRET" | awk '{print $2}')
echo "X-Pingstack-Signature: v1=\${SIGNATURE}"`
          }
        ]
      }
    ]
  },

  'webhook-retries': {
    slug: 'webhook-retries',
    title: 'Webhook Retries & Failure Handling',
    category: 'Events & Webhooks',
    description: 'Understand the webhook retry policy, exponential backoff intervals, timeout limits, and failure logging.',
    readTime: '4 min',
    sections: [
      {
        id: 'retry-policy',
        title: 'Delivery Policy & Timeouts',
        content: `* **HTTP Timeout**: Webhook requests timeout after **10 seconds**.
* **Success Definition**: Any \`2xx\` HTTP status code (e.g. \`200 OK\`, \`202 Accepted\`) is marked as successful.
* **Retry Schedule**: On non-\`2xx\` status or network timeout, the BullMQ \`developer-webhook-queue\` retries **3 times** with exponential backoff:
  * Attempt 1: Immediate
  * Attempt 2: ~5 seconds
  * Attempt 3: ~15 seconds
  * Attempt 4: ~45 seconds
* **Failure Isolation**: A webhook delivery failure **never** prevents WhatsApp message delivery, contact persistence, or webhook responses to Meta.`
      },
      {
        id: 'delivery-logs',
        title: 'Inspecting Delivery Logs',
        content: `You can query recent delivery attempts, status codes, and error messages via \`GET /api/v1/webhooks/{id}\`.`
      }
    ]
  },

  'errors': {
    slug: 'errors',
    title: 'Error Handling',
    category: 'Platform & Reliability',
    description: 'Reference for standard API error codes, HTTP status codes, and Meta WhatsApp error code meanings.',
    readTime: '4 min',
    sections: [
      {
        id: 'error-codes',
        title: 'Standard API Error Codes',
        tableData: {
          headers: ['Error Code', 'HTTP Status', 'Description & Resolution'],
          rows: [
            ['UNAUTHORIZED', '401', 'Missing or invalid API key Bearer token in Authorization header.'],
            ['FORBIDDEN', '403', 'API key has been revoked or access is denied to this workspace.'],
            ['NOT_FOUND', '404', 'The requested resource (message, contact, group, template) was not found.'],
            ['VALIDATION_ERROR', '400', 'Invalid payload parameters. Check details field for parameter issues.'],
            ['RATE_LIMIT_EXCEEDED', '429', 'Too many requests. Check Retry-After header and throttle requests.'],
            ['LIMIT_EXCEEDED', '403', 'Plan daily template quota or contact limit reached. Upgrade required.'],
            ['FEATURE_GATED', '403', 'This feature (e.g. campaign scheduling) requires Growth/Pro plan.'],
            ['CONFLICT', '409', 'Idempotency-Key reuse with a different request payload body.'],
            ['PAYLOAD_TOO_LARGE', '413', 'Payload size exceeds 5MB or bulk array limit exceeds 500 items.'],
            ['INTERNAL_SERVER_ERROR', '500', 'Unexpected server error. Retry with backoff.']
          ]
        }
      },
      {
        id: 'meta-errors',
        title: 'Common Meta WhatsApp Error Codes',
        tableData: {
          headers: ['Meta Code', 'Description', 'Resolution'],
          rows: [
            ['131047', '24-hour service window closed', 'Must use an APPROVED template message instead of freeform text.'],
            ['131049', 'Template does not exist or language mismatch', 'Verify exact template name and language code in /api/v1/templates.'],
            ['131056', 'Positional variable count mismatch', 'Number of variables provided did not match template placeholder count.'],
            ['130429', 'Rate limit hit on Meta API', 'Meta Cloud API rate limit. Automatically retried by PingStack worker.']
          ]
        }
      }
    ]
  },

  'rate-limits': {
    slug: 'rate-limits',
    title: 'API Rate Limiting',
    category: 'Platform & Reliability',
    description: 'API request limits, token bucket burst behavior, Retry-After headers, and how they differ from daily messaging quotas.',
    readTime: '4 min',
    sections: [
      {
        id: 'api-vs-quota',
        title: 'API Rate Limits vs. Daily Messaging Quotas',
        content: `* **API Request Rate Limits** (this section): Technical throughput limits preventing network congestion and server overload (measured in requests/second).
* **Plan Messaging Quotas** (separate): Daily business allowances of template messages per plan (e.g. Starter: 100/day, Growth: 500/day, Pro: 2000/day).`
      },
      {
        id: 'rate-limit-table',
        title: 'Throughput Tiers by Plan',
        tableData: {
          headers: ['Plan', 'Messages / Second', 'Read Requests / Minute', 'Burst Capacity'],
          rows: [
            ['Starter', '2 / sec', '60 / min', '10 tokens'],
            ['Growth', '5 / sec', '180 / min', '25 tokens'],
            ['Pro', '10 / sec', '600 / min', '50 tokens']
          ]
        }
      },
      {
        id: 'headers',
        title: 'Rate Limit Response Headers',
        content: `* \`X-RateLimit-Limit\`: Request capacity in current window.
* \`X-RateLimit-Remaining\`: Remaining requests available.
* \`Retry-After\`: Number of seconds your client must wait before retrying (sent on \`HTTP 429\`).`
      }
    ]
  },

  'idempotency': {
    slug: 'idempotency',
    title: 'Idempotency & Retries',
    category: 'Platform & Reliability',
    description: 'Safely retry network operations without duplicate message dispatches using the Idempotency-Key header.',
    readTime: '4 min',
    sections: [
      {
        id: 'how-it-works',
        title: 'How Idempotency Works in PingStack',
        content: `Network partitions and client timeouts can cause requests to drop before a response is received. By passing an \`Idempotency-Key\` header:

1. PingStack computes a SHA-256 hash of the request body and checks for existing processed transactions for your workspace.
2. If found within **24 hours**, PingStack immediately returns the cached response with header \`X-Idempotent-Replay: true\` without creating duplicate messages or incurring double charges.
3. If an identical key is used with a *different* request payload, PingStack rejects the request with \`HTTP 409 Conflict\`.`
      },
      {
        id: 'example',
        title: 'Usage Example Across Languages',
        codeSnippets: [
          {
            language: 'bash',
            label: 'cURL',
            code: `curl -X POST https://app.pingstack.in/api/v1/messages \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: order-tx-9941-confirmed" \\
  -d '{"to": "919876543210", "template": "order_confirmed", "variables": ["Rahul", "ORD-9941"]}'`
          },
          {
            language: 'javascript',
            label: 'Node.js',
            code: `const res = await fetch('https://app.pingstack.in/api/v1/messages', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY,
    'Content-Type': 'application/json',
    'Idempotency-Key': 'order-tx-9941-confirmed'
  },
  body: JSON.stringify({
    to: '919876543210',
    template: 'order_confirmed',
    variables: ['Rahul', 'ORD-9941']
  })
});
console.log('Replayed:', res.headers.get('X-Idempotent-Replay') === 'true');`
          },
          {
            language: 'python',
            label: 'Python',
            code: `import os
import requests

headers = {
    "Authorization": f"Bearer {os.getenv('PINGSTACK_API_KEY')}",
    "Content-Type": "application/json",
    "Idempotency-Key": "order-tx-9941-confirmed"
}
payload = {"to": "919876543210", "template": "order_confirmed", "variables": ["Rahul", "ORD-9941"]}
res = requests.post("https://app.pingstack.in/api/v1/messages", headers=headers, json=payload)
print("Is Replay:", res.headers.get("X-Idempotent-Replay") == "true")`
          },
          {
            language: 'java',
            label: 'Java',
            code: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class IdempotentMessage {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("PINGSTACK_API_KEY");
        String payload = "{\"to\":\"919876543210\",\"template\":\"order_confirmed\",\"variables\":[\"Rahul\",\"ORD-9941\"]}";

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://app.pingstack.in/api/v1/messages"))
            .header("Authorization", "Bearer " + apiKey)
            .header("Content-Type", "application/json")
            .header("Idempotency-Key", "order-tx-9941-confirmed")
            .POST(HttpRequest.BodyPublishers.ofString(payload))
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println("Replayed: " + response.headers().firstValue("X-Idempotent-Replay").orElse("false"));
    }
}`
          },
          {
            language: 'go',
            label: 'Go',
            code: `package main

import (
	"bytes"
	"fmt"
	"net/http"
	"os"
)

func main() {
	apiKey := os.Getenv("PINGSTACK_API_KEY")
	payload := []byte(\`{"to":"919876543210","template":"order_confirmed","variables":["Rahul","ORD-9941"]}\`)

	req, _ := http.NewRequest("POST", "https://app.pingstack.in/api/v1/messages", bytes.NewBuffer(payload))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", "order-tx-9941-confirmed")

	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()

	fmt.Println("Is Replay:", resp.Header.Get("X-Idempotent-Replay") == "true")
}`
          }
        ]
      }
    ]
  },

  'api-usage': {
    slug: 'api-usage',
    title: 'API Usage & Telemetry',
    category: 'Platform & Reliability',
    description: 'Monitor integration throughput, query latency breakdowns, and inspect persistent operational logs.',
    readTime: '4 min',
    sections: [
      {
        id: 'usage-metrics',
        title: 'Querying Usage Telemetry',
        content: `\`GET /api/v1/usage?days=30\` returns aggregated metrics computed from authoritative request logs:`,
        codeSnippets: [
          {
            language: 'bash',
            label: 'cURL',
            code: 'curl "https://app.pingstack.in/api/v1/usage?days=30" \\\n  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY"'
          },
          {
            language: 'json',
            label: 'Usage Breakdown Response',
            code: `{\n  "success": true,\n  "data": {\n    "period_days": 30,\n    "overview": {\n      "total_requests": 1420,\n      "successful_requests": 1410,\n      "failed_requests": 10,\n      "success_rate_pct": 99,\n      "avg_latency_ms": 42,\n      "messages_recorded": 1280,\n      "webhook_deliveries_total": 2400,\n      "webhook_deliveries_success": 2390\n    }\n  },\n  "request_id": "req_4e5f6a7b"\n}`
          }
        ]
      },
      {
        id: 'request-logs',
        title: 'Querying Request Logs',
        content: `\`GET /api/v1/logs?page=1&pageSize=50&status_code=500\` returns paginated operational request logs with PII and secret redaction for auditing and debugging.`
      }
    ]
  }
};

export const DOCS_GUIDES: Record<string, DocArticle> = {
  'crm-integration': {
    slug: 'crm-integration',
    title: 'Integrating with Your CRM / ERP',
    category: 'Integration Guides',
    description: 'Architectural trade-offs between direct phone recipient sending vs. full contact database synchronization.',
    readTime: '6 min',
    sections: [
      {
        id: 'comparison',
        title: 'Architectural Approaches',
        content: `When integrating PingStack with your existing CRM, school ERP, or billing software, you have two primary patterns:`
      },
      {
        id: 'option-a',
        title: 'Option A: Direct Recipient Sending (Recommended for Existing CRMs)',
        content: `If your database is already the single source of truth for customer data, pass phone numbers and variables directly via \`/api/v1/messages\` or \`/api/v1/campaigns/{id}/launch\` (Pattern C).

* **Pros**: Zero data synchronization lag, no duplicate database maintenance, immediate dispatches.
* **Cons**: Contacts are registered on the fly in PingStack for Inbox visibility.`
      },
      {
        id: 'option-b',
        title: 'Option B: Full Contact & Group Synchronization',
        content: `Sync customer records via \`/api/v1/contacts/bulk\` and group memberships via \`/api/v1/groups/{id}/contacts\`.

* **Pros**: Non-technical team members can view rich contact metadata and launch broadcast campaigns directly inside the PingStack Workspace UI.
* **Cons**: Requires managing two-way synchronization.`
      }
    ]
  },

  'csv-campaigns': {
    slug: 'csv-campaigns',
    title: 'Bulk File vs. Programmatic JSON API',
    category: 'Integration Guides',
    description: 'When to choose structured JSON APIs versus bulk spreadsheet imports for broadcast campaigns.',
    readTime: '5 min',
    sections: [
      {
        id: 'when-to-use',
        title: 'Choosing the Right Workflow',
        content: `* **Use JSON API (\`/api/v1/campaigns/{id}/launch\`)** for automated transactional workflows, backend cron jobs, and software-to-software integrations.
* **Use CSV / Excel Upload in Workspace UI** for marketing team broadcasts, one-off festive campaigns, and offline customer lists.`
      }
    ]
  }
};
