'use client';

import React from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Code2 } from 'lucide-react';
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
    java: string;
    go: string;
  };
  exampleResponse: string;
}

const SECTION_DATA: Record<string, { title: string; description: string; endpoints: EndpointSpec[] }> = {
  'messages': {
    title: 'Messages Reference',
    description: 'Endpoints for sending outbound WhatsApp template and session messages, handling positional variables, and querying message logs.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/messages',
        title: 'Send WhatsApp Message',
        description: 'Dispatches a template message with positional variables or direct session text to a recipient.',
        headers: [
          { name: 'Authorization', required: true, description: 'Bearer ps_secret_live_YOUR_API_KEY' },
          { name: 'Idempotency-Key', required: false, description: 'Unique request key for safe network retries (24h TTL)' },
          { name: 'Content-Type', required: true, description: 'application/json' }
        ],
        bodyParams: [
          { name: 'to', type: 'string', required: true, description: 'Recipient phone number with country code (e.g. 919876543210)' },
          { name: 'template', type: 'string | object', required: false, description: 'Template name or object { name, language }' },
          { name: 'variables', type: 'object | array', required: false, description: 'Positional placeholders {"1": "Val", "2": "Val"} or ["Val1", "Val2"]' },
          { name: 'text', type: 'string', required: false, description: 'Freeform text body (allowed within active 24h customer service window)' },
          { name: 'language', type: 'string', required: false, description: 'Template language code (default: en_US)' }
        ],
        exampleRequest: {
          curl: `curl -X POST "https://app.pingstack.in/api/v1/messages" \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: msg-001" \\
  -d '{
    "to": "919876543210",
    "template": "fee_reminder",
    "variables": ["Rahul", "₹2,500"]
  }'`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/messages', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY,
    'Content-Type': 'application/json',
    'Idempotency-Key': 'msg-001'
  },
  body: JSON.stringify({
    to: '919876543210',
    template: 'fee_reminder',
    variables: ['Rahul', '₹2,500']
  })
});
const data = await res.json();
console.log(data);`,
          python: `import os
import requests

url = "https://app.pingstack.in/api/v1/messages"
headers = {
    "Authorization": f"Bearer {os.getenv('PINGSTACK_API_KEY')}",
    "Content-Type": "application/json",
    "Idempotency-Key": "msg-001"
}
payload = {
    "to": "919876543210",
    "template": "fee_reminder",
    "variables": ["Rahul", "₹2,500"]
}
res = requests.post(url, json=payload, headers=headers)
print(res.json())`,
          java: `import java.net.URI;
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
            .header("Idempotency-Key", "msg-001")
            .POST(HttpRequest.BodyPublishers.ofString(payload))
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`,
          go: `package main

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
	req.Header.Set("Idempotency-Key", "msg-001")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
        },
        exampleResponse: `{\n  "success": true,\n  "data": {\n    "message_id": "8b9e6722-1d54-4a2e-b6a1-cb9e4f509d2a",\n    "recipient": "919876543210",\n    "status": "queued",\n    "message_type": "template",\n    "template": "fee_reminder",\n    "created_at": "2026-09-09T22:00:00.000Z"\n  },\n  "request_id": "req_8a9b0c1d"\n}`
      },
      {
        method: 'GET',
        path: '/api/v1/messages',
        title: 'List Messages',
        description: 'Returns paginated message history for your workspace with status and recipient filters.',
        params: [
          { name: 'page', type: 'integer', required: false, description: 'Page number (default: 1)' },
          { name: 'pageSize', type: 'integer', required: false, description: 'Items per page (max: 100, default: 50)' },
          { name: 'status', type: 'string', required: false, description: 'Filter by status: queued, sent, delivered, read, failed' },
          { name: 'phone', type: 'string', required: false, description: 'Filter by recipient phone number' }
        ],
        exampleRequest: {
          curl: `curl "https://app.pingstack.in/api/v1/messages?page=1&pageSize=20&status=delivered" \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY"`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/messages?page=1&pageSize=20&status=delivered', {
  headers: { 'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY }
});
const data = await res.json();
console.log(data);`,
          python: `import os
import requests

headers = {"Authorization": f"Bearer {os.getenv('PINGSTACK_API_KEY')}"}
res = requests.get("https://app.pingstack.in/api/v1/messages?page=1&pageSize=20&status=delivered", headers=headers)
print(res.json())`,
          java: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class ListMessages {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("PINGSTACK_API_KEY");
        HttpClient client = HttpClient.newHttpClient();

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://app.pingstack.in/api/v1/messages?page=1&pageSize=20&status=delivered"))
            .header("Authorization", "Bearer " + apiKey)
            .GET()
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`,
          go: `package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	apiKey := os.Getenv("PINGSTACK_API_KEY")
	req, _ := http.NewRequest("GET", "https://app.pingstack.in/api/v1/messages?page=1&pageSize=20&status=delivered", nil)
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
        },
        exampleResponse: `{\n  "success": true,\n  "data": [\n    {\n      "id": "8b9e6722-1d54-4a2e-b6a1-cb9e4f509d2a",\n      "phone_number": "919876543210",\n      "status": "delivered",\n      "direction": "outbound",\n      "created_at": "2026-09-09T22:00:00.000Z"\n    }\n  ],\n  "pagination": {\n    "page": 1,\n    "pageSize": 20,\n    "totalCount": 1,\n    "hasMore": false\n  },\n  "request_id": "req_9b0c1d2e"\n}`
      },
      {
        method: 'GET',
        path: '/api/v1/messages/{id}',
        title: 'Get Message Details',
        description: 'Retrieves status, provider reference, and metadata for a specific message.',
        exampleRequest: {
          curl: `curl "https://app.pingstack.in/api/v1/messages/8b9e6722-1d54-4a2e-b6a1-cb9e4f509d2a" \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY"`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/messages/8b9e6722-1d54-4a2e-b6a1-cb9e4f509d2a', {
  headers: { 'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY }
});
const data = await res.json();
console.log(data);`,
          python: `import os
import requests

headers = {"Authorization": f"Bearer {os.getenv('PINGSTACK_API_KEY')}"}
res = requests.get("https://app.pingstack.in/api/v1/messages/8b9e6722-1d54-4a2e-b6a1-cb9e4f509d2a", headers=headers)
print(res.json())`,
          java: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class GetMessage {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("PINGSTACK_API_KEY");
        HttpClient client = HttpClient.newHttpClient();

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://app.pingstack.in/api/v1/messages/8b9e6722-1d54-4a2e-b6a1-cb9e4f509d2a"))
            .header("Authorization", "Bearer " + apiKey)
            .GET()
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`,
          go: `package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	apiKey := os.Getenv("PINGSTACK_API_KEY")
	req, _ := http.NewRequest("GET", "https://app.pingstack.in/api/v1/messages/8b9e6722-1d54-4a2e-b6a1-cb9e4f509d2a", nil)
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
        },
        exampleResponse: `{\n  "success": true,\n  "data": {\n    "id": "8b9e6722-1d54-4a2e-b6a1-cb9e4f509d2a",\n    "phone_number": "919876543210",\n    "status": "read",\n    "template_name": "fee_reminder",\n    "content": "Dear Rahul Sharma, your pending fee of ₹2,500 is due.",\n    "created_at": "2026-09-09T22:00:00.000Z"\n  },\n  "request_id": "req_1d2e3f4a"\n}`
      }
    ]
  },

  'contacts': {
    title: 'Contacts Reference',
    description: 'Endpoints for creating, updating, searching, and managing customer contact records and custom metadata fields.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/contacts',
        title: 'List Contacts',
        description: 'Returns a paginated list of contacts with optional search and tag filters.',
        params: [
          { name: 'page', type: 'integer', required: false, description: 'Page number (default: 1)' },
          { name: 'pageSize', type: 'integer', required: false, description: 'Items per page (default: 50)' },
          { name: 'search', type: 'string', required: false, description: 'Search term for name or phone' },
          { name: 'tag', type: 'string', required: false, description: 'Filter by tag label' }
        ],
        exampleRequest: {
          curl: `curl "https://app.pingstack.in/api/v1/contacts?search=Rahul" \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY"`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/contacts?search=Rahul', {
  headers: { 'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY }
});
console.log(await res.json());`,
          python: `import os, requests
headers = {"Authorization": f"Bearer {os.getenv('PINGSTACK_API_KEY')}"}
res = requests.get("https://app.pingstack.in/api/v1/contacts?search=Rahul", headers=headers)
print(res.json())`,
          java: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class ListContacts {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("PINGSTACK_API_KEY");
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://app.pingstack.in/api/v1/contacts?search=Rahul"))
            .header("Authorization", "Bearer " + apiKey)
            .GET()
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`,
          go: `package main
import ("fmt"; "io"; "net/http"; "os")

func main() {
	apiKey := os.Getenv("PINGSTACK_API_KEY")
	req, _ := http.NewRequest("GET", "https://app.pingstack.in/api/v1/contacts?search=Rahul", nil)
	req.Header.Set("Authorization", "Bearer "+apiKey)
	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
        },
        exampleResponse: `{\n  "success": true,\n  "data": [\n    {\n      "id": "c1...",\n      "name": "Rahul Sharma",\n      "phone_number": "919876543210",\n      "email": "rahul@example.com",\n      "tags": ["vip"]\n    }\n  ],\n  "request_id": "req_1c2d3e4f"\n}`
      },
      {
        method: 'POST',
        path: '/api/v1/contacts',
        title: 'Create Contact',
        description: 'Creates a new contact or upserts if phone number exists.',
        bodyParams: [
          { name: 'phone_number', type: 'string', required: true, description: 'Phone number with country code' },
          { name: 'name', type: 'string', required: false, description: 'Customer full name' },
          { name: 'email', type: 'string', required: false, description: 'Email address' },
          { name: 'tags', type: 'array', required: false, description: 'Array of tag strings' },
          { name: 'custom_fields', type: 'object', required: false, description: 'Key-value custom attributes' }
        ],
        exampleRequest: {
          curl: `curl -X POST "https://app.pingstack.in/api/v1/contacts" \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Aarav Gupta",
    "phone_number": "919876543210",
    "tags": ["retail", "vip"]
  }'`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/contacts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ name: 'Aarav Gupta', phone_number: '919876543210', tags: ['retail', 'vip'] })
});
console.log(await res.json());`,
          python: `import os, requests
headers = {"Authorization": f"Bearer {os.getenv('PINGSTACK_API_KEY')}", "Content-Type": "application/json"}
res = requests.post("https://app.pingstack.in/api/v1/contacts", headers=headers, json={"name": "Aarav Gupta", "phone_number": "919876543210", "tags": ["retail", "vip"]})
print(res.json())`,
          java: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class CreateContact {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("PINGSTACK_API_KEY");
        String payload = "{\"name\":\"Aarav Gupta\",\"phone_number\":\"919876543210\",\"tags\":[\"vip\"]}";
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://app.pingstack.in/api/v1/contacts"))
            .header("Authorization", "Bearer " + apiKey)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(payload))
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`,
          go: `package main
import ("bytes"; "fmt"; "io"; "net/http"; "os")

func main() {
	apiKey := os.Getenv("PINGSTACK_API_KEY")
	payload := []byte(\`{"name":"Aarav Gupta","phone_number":"919876543210","tags":["vip"]}\`)
	req, _ := http.NewRequest("POST", "https://app.pingstack.in/api/v1/contacts", bytes.NewBuffer(payload))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
        },
        exampleResponse: `{\n  "success": true,\n  "data": {\n    "id": "c1a2b3c4-...",\n    "name": "Aarav Gupta",\n    "phone_number": "919876543210",\n    "tags": ["retail", "vip"],\n    "created_at": "2026-09-10T10:00:00.000Z"\n  },\n  "request_id": "req_2d3e4f5a"\n}`
      },
      {
        method: 'POST',
        path: '/api/v1/contacts/bulk',
        title: 'Bulk Upsert Contacts',
        description: 'Batch imports up to 500 contacts per request with partial failure handling.',
        exampleRequest: {
          curl: `curl -X POST "https://app.pingstack.in/api/v1/contacts/bulk" \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "contacts": [
      { "name": "Aarav", "phone": "919876543210" },
      { "name": "Meera", "phone": "919876543211" }
    ]
  }'`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/contacts/bulk', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ contacts: [{ name: 'Aarav', phone: '919876543210' }] })
});
console.log(await res.json());`,
          python: `import os, requests
headers = {"Authorization": f"Bearer {os.getenv('PINGSTACK_API_KEY')}", "Content-Type": "application/json"}
res = requests.post("https://app.pingstack.in/api/v1/contacts/bulk", headers=headers, json={"contacts": [{"name": "Aarav", "phone": "919876543210"}]})
print(res.json())`,
          java: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class BulkContacts {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("PINGSTACK_API_KEY");
        String payload = "{\"contacts\":[{\"name\":\"Aarav\",\"phone\":\"919876543210\"}]}";
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
}`,
          go: `package main
import ("bytes"; "fmt"; "io"; "net/http"; "os")

func main() {
	apiKey := os.Getenv("PINGSTACK_API_KEY")
	payload := []byte(\`{"contacts":[{"name":"Aarav","phone":"919876543210"}]}\`)
	req, _ := http.NewRequest("POST", "https://app.pingstack.in/api/v1/contacts/bulk", bytes.NewBuffer(payload))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
        },
        exampleResponse: `{\n  "success": true,\n  "data": {\n    "total_submitted": 1,\n    "processed_count": 1,\n    "failed_count": 0,\n    "contacts": [{ "id": "c1...", "name": "Aarav", "phone_number": "919876543210" }]\n  },\n  "request_id": "req_3e4f5a6b"\n}`
      }
    ]
  },

  'groups': {
    title: 'Groups Reference',
    description: 'Endpoints for managing audience segments and associating contact memberships.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/groups',
        title: 'List Groups',
        description: 'Returns audience groups with live contact counts.',
        exampleRequest: {
          curl: `curl "https://app.pingstack.in/api/v1/groups" \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY"`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/groups', {
  headers: { 'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY }
});
console.log(await res.json());`,
          python: `import os, requests
res = requests.get("https://app.pingstack.in/api/v1/groups", headers={"Authorization": f"Bearer {os.getenv('PINGSTACK_API_KEY')}"})
print(res.json())`,
          java: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class ListGroups {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("PINGSTACK_API_KEY");
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://app.pingstack.in/api/v1/groups"))
            .header("Authorization", "Bearer " + apiKey)
            .GET()
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`,
          go: `package main
import ("fmt"; "io"; "net/http"; "os")

func main() {
	apiKey := os.Getenv("PINGSTACK_API_KEY")
	req, _ := http.NewRequest("GET", "https://app.pingstack.in/api/v1/groups", nil)
	req.Header.Set("Authorization", "Bearer "+apiKey)
	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
        },
        exampleResponse: `{\n  "success": true,\n  "data": [\n    {\n      "id": "g1...",\n      "name": "VIP Customers",\n      "contacts_count": 42\n    }\n  ],\n  "request_id": "req_3e4f5a6b"\n}`
      },
      {
        method: 'POST',
        path: '/api/v1/groups/{id}/contacts',
        title: 'Add Contacts to Group',
        description: 'Associates an array of contact UUIDs with the specified group.',
        bodyParams: [
          { name: 'contact_ids', type: 'array', required: true, description: 'Array of contact UUIDs to add' }
        ],
        exampleRequest: {
          curl: `curl -X POST "https://app.pingstack.in/api/v1/groups/GROUP_ID/contacts" \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"contact_ids": ["c1a2b3c4-...", "c5d6e7f8-..."]}'`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/groups/GROUP_ID/contacts', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ contact_ids: ['c1a2b3c4-...'] })
});
console.log(await res.json());`,
          python: `import os, requests
headers = {"Authorization": f"Bearer {os.getenv('PINGSTACK_API_KEY')}", "Content-Type": "application/json"}
res = requests.post("https://app.pingstack.in/api/v1/groups/GROUP_ID/contacts", headers=headers, json={"contact_ids": ["c1a2b3c4-..."]})
print(res.json())`,
          java: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class AddToGroup {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("PINGSTACK_API_KEY");
        String payload = "{\"contact_ids\":[\"c1a2b3c4-...\"]}";
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://app.pingstack.in/api/v1/groups/GROUP_ID/contacts"))
            .header("Authorization", "Bearer " + apiKey)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(payload))
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`,
          go: `package main
import ("bytes"; "fmt"; "io"; "net/http"; "os")

func main() {
	apiKey := os.Getenv("PINGSTACK_API_KEY")
	payload := []byte(\`{"contact_ids":["c1a2b3c4-..."]}\`)
	req, _ := http.NewRequest("POST", "https://app.pingstack.in/api/v1/groups/GROUP_ID/contacts", bytes.NewBuffer(payload))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
        },
        exampleResponse: `{\n  "success": true,\n  "data": {\n    "group_id": "g1...",\n    "added_count": 2,\n    "total_contacts": 44\n  },\n  "request_id": "req_4f5a6b7c"\n}`
      }
    ]
  },

  'templates': {
    title: 'Templates Reference',
    description: 'Endpoints for querying approved Meta WhatsApp message templates, variable placeholders, and category details.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/templates',
        title: 'List Templates',
        description: 'Lists approved templates with variable placeholders and language codes.',
        params: [
          { name: 'status', type: 'string', required: false, description: 'Filter by status: APPROVED, PENDING, REJECTED (default: APPROVED)' }
        ],
        exampleRequest: {
          curl: `curl "https://app.pingstack.in/api/v1/templates?status=APPROVED" \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY"`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/templates?status=APPROVED', {
  headers: { 'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY }
});
console.log(await res.json());`,
          python: `import os, requests
res = requests.get("https://app.pingstack.in/api/v1/templates?status=APPROVED", headers={"Authorization": f"Bearer {os.getenv('PINGSTACK_API_KEY')}"})
print(res.json())`,
          java: `import java.net.URI;
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
}`,
          go: `package main
import ("fmt"; "io"; "net/http"; "os")

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
        },
        exampleResponse: `{\n  "success": true,\n  "data": [\n    {\n      "id": "tpl_1...",\n      "name": "fee_reminder",\n      "language": "en_US",\n      "category": "UTILITY",\n      "status": "APPROVED",\n      "content": "Dear {{1}}, your fee of {{2}} is due."\n    }\n  ],\n  "request_id": "req_4f5a6b7c"\n}`
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
          { name: 'Authorization', required: true, description: 'Bearer ps_secret_live_YOUR_API_KEY' },
          { name: 'Content-Type', required: true, description: 'application/json' }
        ],
        bodyParams: [
          { name: 'name', type: 'string', required: true, description: 'Human-readable campaign name' },
          { name: 'template_id', type: 'string', required: false, description: 'Template UUID in PingStack' },
          { name: 'template_name', type: 'string', required: false, description: 'Approved Meta template name (e.g. fee_reminder)' },
          { name: 'scheduled_at', type: 'string', required: false, description: 'ISO-8601 future timestamp for scheduled dispatch (Growth/Pro plan)' }
        ],
        exampleRequest: {
          curl: `curl -X POST "https://app.pingstack.in/api/v1/campaigns" \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "September Fee Reminders", "template_name": "fee_reminder"}'`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/campaigns', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'September Fee Reminders', template_name: 'fee_reminder' })
});
console.log(await res.json());`,
          python: `import os, requests
headers = {"Authorization": f"Bearer {os.getenv('PINGSTACK_API_KEY')}", "Content-Type": "application/json"}
res = requests.post("https://app.pingstack.in/api/v1/campaigns", headers=headers, json={"name": "September Fee Reminders", "template_name": "fee_reminder"})
print(res.json())`,
          java: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class CreateCampaign {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("PINGSTACK_API_KEY");
        String payload = "{\"name\":\"September Fee Reminders\",\"template_name\":\"fee_reminder\"}";
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
}`,
          go: `package main
import ("bytes"; "fmt"; "io"; "net/http"; "os")

func main() {
	apiKey := os.Getenv("PINGSTACK_API_KEY")
	payload := []byte(\`{"name":"September Fee Reminders","template_name":"fee_reminder"}\`)
	req, _ := http.NewRequest("POST", "https://app.pingstack.in/api/v1/campaigns", bytes.NewBuffer(payload))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
        },
        exampleResponse: `{\n  "success": true,\n  "data": {\n    "id": "c8a1b2c3-1d2e-4f5a-b6c7-8d9e0f1a2b3c",\n    "name": "September Fee Reminders",\n    "template_id": "tpl_fee_01",\n    "status": "draft",\n    "created_at": "2026-09-10T08:00:00.000Z"\n  },\n  "request_id": "req_1a2b3c4d"\n}`
      },
      {
        method: 'POST',
        path: '/api/v1/campaigns/{id}/launch',
        title: 'Launch Campaign',
        description: 'Triggers broadcast delivery across audience groups, contact lists, or direct CRM recipient arrays with template variables.',
        headers: [
          { name: 'Authorization', required: true, description: 'Bearer ps_secret_live_YOUR_API_KEY' },
          { name: 'Idempotency-Key', required: false, description: 'Unique request key for safe network retries' }
        ],
        bodyParams: [
          { name: 'recipients', type: 'array', required: false, description: 'Direct CRM recipient objects: [{ phone, variables: {"1": "Val"}, name }]' },
          { name: 'group_ids', type: 'array', required: false, description: 'Array of audience group IDs in PingStack' },
          { name: 'contact_ids', type: 'array', required: false, description: 'Array of contact IDs in PingStack' },
          { name: 'template_variables', type: 'object', required: false, description: 'Shared template variables applied to all group/contact recipients (supports {{name}} and {{phone}} macros)' }
        ],
        exampleRequest: {
          curl: `curl -X POST "https://app.pingstack.in/api/v1/campaigns/CAMPAIGN_ID/launch" \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: fee-batch-sep-01" \\
  -d '{
    "recipients": [
      { "phone": "919876543210", "variables": { "1": "Rahul", "2": "₹2,500" } },
      { "phone": "919876543211", "variables": { "1": "Amit", "2": "₹1,800" } }
    ]
  }'`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/campaigns/CAMPAIGN_ID/launch', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY,
    'Content-Type': 'application/json',
    'Idempotency-Key': 'fee-batch-sep-01'
  },
  body: JSON.stringify({
    recipients: [
      { phone: '919876543210', variables: { '1': 'Rahul', '2': '₹2,500' } }
    ]
  })
});
console.log(await res.json());`,
          python: `import os, requests
headers = {"Authorization": f"Bearer {os.getenv('PINGSTACK_API_KEY')}", "Content-Type": "application/json", "Idempotency-Key": "fee-batch-sep-01"}
res = requests.post(
    "https://app.pingstack.in/api/v1/campaigns/CAMPAIGN_ID/launch",
    headers=headers,
    json={"recipients": [{"phone": "919876543210", "variables": {"1": "Rahul", "2": "₹2,500"}}]}
)
print(res.json())`,
          java: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class LaunchCampaign {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("PINGSTACK_API_KEY");
        String payload = "{\"recipients\":[{\"phone\":\"919876543210\",\"variables\":{\"1\":\"Rahul\",\"2\":\"₹2,500\"}}]}";
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://app.pingstack.in/api/v1/campaigns/CAMPAIGN_ID/launch"))
            .header("Authorization", "Bearer " + apiKey)
            .header("Content-Type", "application/json")
            .header("Idempotency-Key", "fee-batch-sep-01")
            .POST(HttpRequest.BodyPublishers.ofString(payload))
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`,
          go: `package main
import ("bytes"; "fmt"; "io"; "net/http"; "os")

func main() {
	apiKey := os.Getenv("PINGSTACK_API_KEY")
	payload := []byte(\`{"recipients":[{"phone":"919876543210","variables":{"1":"Rahul","2":"₹2,500"}}]}\`)
	req, _ := http.NewRequest("POST", "https://app.pingstack.in/api/v1/campaigns/CAMPAIGN_ID/launch", bytes.NewBuffer(payload))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", "fee-batch-sep-01")
	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
        },
        exampleResponse: `{\n  "success": true,\n  "data": {\n    "campaign_id": "c8a1b2c3-1d2e-4f5a-b6c7-8d9e0f1a2b3c",\n    "name": "September Fee Reminders",\n    "status": "running",\n    "queued_at": "2026-09-10T08:00:00.000Z"\n  },\n  "request_id": "req_5a6b7c8d"\n}`
      },
      {
        method: 'GET',
        path: '/api/v1/campaigns/{id}/results',
        title: 'Get Campaign Results',
        description: 'Returns real-time delivery metrics, sent counts, read rates, and failure tallies for a campaign.',
        exampleRequest: {
          curl: `curl "https://app.pingstack.in/api/v1/campaigns/CAMPAIGN_ID/results" \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY"`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/campaigns/CAMPAIGN_ID/results', {
  headers: { 'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY }
});
console.log(await res.json());`,
          python: `import os, requests
res = requests.get("https://app.pingstack.in/api/v1/campaigns/CAMPAIGN_ID/results", headers={"Authorization": f"Bearer {os.getenv('PINGSTACK_API_KEY')}"})
print(res.json())`,
          java: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class CampaignResults {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("PINGSTACK_API_KEY");
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://app.pingstack.in/api/v1/campaigns/CAMPAIGN_ID/results"))
            .header("Authorization", "Bearer " + apiKey)
            .GET()
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`,
          go: `package main
import ("fmt"; "io"; "net/http"; "os")

func main() {
	apiKey := os.Getenv("PINGSTACK_API_KEY")
	req, _ := http.NewRequest("GET", "https://app.pingstack.in/api/v1/campaigns/CAMPAIGN_ID/results", nil)
	req.Header.Set("Authorization", "Bearer "+apiKey)
	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
        },
        exampleResponse: `{\n  "success": true,\n  "data": {\n    "campaign_id": "c8a1b2c3-1d2e-4f5a-b6c7-8d9e0f1a2b3c",\n    "name": "September Fee Reminders",\n    "status": "completed",\n    "metrics": {\n      "total_messages": 250,\n      "pending": 0,\n      "sent": 248,\n      "delivered": 245,\n      "read": 192,\n      "failed": 2,\n      "delivered_rate_pct": 98,\n      "read_rate_pct": 77\n    }\n  },\n  "request_id": "req_6b7c8d9e"\n}`
      }
    ]
  },

  'webhooks': {
    title: 'Webhooks Reference',
    description: 'Endpoints for managing outbound webhook subscriptions, testing endpoints, and querying delivery logs.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/webhooks',
        title: 'Register Webhook Endpoint',
        description: 'Creates a webhook subscription and returns the HMAC signing secret once.',
        bodyParams: [
          { name: 'url', type: 'string', required: true, description: 'HTTPS destination endpoint URL' },
          { name: 'events', type: 'array', required: true, description: 'Array of event types to subscribe to (e.g. ["message.received", "message.delivered"])' }
        ],
        exampleRequest: {
          curl: `curl -X POST "https://app.pingstack.in/api/v1/webhooks" \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://api.mycrm.com/webhooks/pingstack",
    "events": ["message.received", "message.delivered"]
  }'`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/webhooks', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://api.mycrm.com/webhooks/pingstack', events: ['message.received', 'message.delivered'] })
});
console.log(await res.json());`,
          python: `import os, requests
headers = {"Authorization": f"Bearer {os.getenv('PINGSTACK_API_KEY')}", "Content-Type": "application/json"}
res = requests.post("https://app.pingstack.in/api/v1/webhooks", headers=headers, json={"url": "https://api.mycrm.com/webhooks/pingstack", "events": ["message.received", "message.delivered"]})
print(res.json())`,
          java: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class RegisterWebhook {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("PINGSTACK_API_KEY");
        String payload = "{\"url\":\"https://api.mycrm.com/webhooks/pingstack\",\"events\":[\"message.received\",\"message.delivered\"]}";
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
}`,
          go: `package main
import ("bytes"; "fmt"; "io"; "net/http"; "os")

func main() {
	apiKey := os.Getenv("PINGSTACK_API_KEY")
	payload := []byte(\`{"url":"https://api.mycrm.com/webhooks/pingstack","events":["message.received","message.delivered"]}\`)
	req, _ := http.NewRequest("POST", "https://app.pingstack.in/api/v1/webhooks", bytes.NewBuffer(payload))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
        },
        exampleResponse: `{\n  "success": true,\n  "data": {\n    "id": "wh_1...",\n    "url": "https://api.mycrm.com/webhooks/pingstack",\n    "signing_secret": "whsec_YOUR_SIGNING_SECRET_HERE",\n    "is_active": true,\n    "created_at": "2026-09-10T12:00:00.000Z"\n  },\n  "request_id": "req_6b7c8d9e"\n}`
      }
    ]
  },

  'keys': {
    title: 'API Keys Reference',
    description: 'Endpoints for managing developer API keys and secure SHA-256 tokens.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/keys',
        title: 'List API Keys',
        description: 'Returns active developer keys with masked prefixes and last used timestamps.',
        exampleRequest: {
          curl: `curl "https://app.pingstack.in/api/v1/keys" \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY"`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/keys', {
  headers: { 'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY }
});
console.log(await res.json());`,
          python: `import os, requests
res = requests.get("https://app.pingstack.in/api/v1/keys", headers={"Authorization": f"Bearer {os.getenv('PINGSTACK_API_KEY')}"})
print(res.json())`,
          java: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class ListKeys {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("PINGSTACK_API_KEY");
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://app.pingstack.in/api/v1/keys"))
            .header("Authorization", "Bearer " + apiKey)
            .GET()
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`,
          go: `package main
import ("fmt"; "io"; "net/http"; "os")

func main() {
	apiKey := os.Getenv("PINGSTACK_API_KEY")
	req, _ := http.NewRequest("GET", "https://app.pingstack.in/api/v1/keys", nil)
	req.Header.Set("Authorization", "Bearer "+apiKey)
	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
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
        description: 'Returns aggregated API request counts, success rates, and latency metrics.',
        params: [
          { name: 'days', type: 'integer', required: false, description: 'Lookback timeframe in days (default: 30)' }
        ],
        exampleRequest: {
          curl: `curl "https://app.pingstack.in/api/v1/usage?days=30" \\
  -H "Authorization: Bearer ps_secret_live_YOUR_API_KEY"`,
          node: `const res = await fetch('https://app.pingstack.in/api/v1/usage?days=30', {
  headers: { 'Authorization': 'Bearer ' + process.env.PINGSTACK_API_KEY }
});
console.log(await res.json());`,
          python: `import os, requests
res = requests.get("https://app.pingstack.in/api/v1/usage?days=30", headers={"Authorization": f"Bearer {os.getenv('PINGSTACK_API_KEY')}"})
print(res.json())`,
          java: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class GetUsage {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("PINGSTACK_API_KEY");
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://app.pingstack.in/api/v1/usage?days=30"))
            .header("Authorization", "Bearer " + apiKey)
            .GET()
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`,
          go: `package main
import ("fmt"; "io"; "net/http"; "os")

func main() {
	apiKey := os.Getenv("PINGSTACK_API_KEY")
	req, _ := http.NewRequest("GET", "https://app.pingstack.in/api/v1/usage?days=30", nil)
	req.Header.Set("Authorization", "Bearer "+apiKey)
	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
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

            {/* Headers */}
            {ep.headers && ep.headers.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Headers</h4>
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold border-b border-zinc-200 dark:border-zinc-800">
                      <tr>
                        <th className="px-4 py-2.5">Header</th>
                        <th className="px-4 py-2.5">Required</th>
                        <th className="px-4 py-2.5">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {ep.headers.map(h => (
                        <tr key={h.name}>
                          <td className="px-4 py-2.5 font-mono font-bold text-zinc-900 dark:text-zinc-200">{h.name}</td>
                          <td className="px-4 py-2.5">{h.required ? <span className="text-amber-500 font-bold">Yes</span> : 'No'}</td>
                          <td className="px-4 py-2.5">{h.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Query Parameters */}
            {ep.params && ep.params.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Query Parameters</h4>
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold border-b border-zinc-200 dark:border-zinc-800">
                      <tr>
                        <th className="px-4 py-2.5">Parameter</th>
                        <th className="px-4 py-2.5">Type</th>
                        <th className="px-4 py-2.5">Required</th>
                        <th className="px-4 py-2.5">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {ep.params.map(p => (
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

            {/* Request Body Parameters */}
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

            {/* Code Examples (5 Languages) */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Code Example (5 Languages)</h4>
              <CodeBlock
                snippets={[
                  { language: 'bash', label: 'cURL', code: ep.exampleRequest.curl },
                  { language: 'javascript', label: 'Node.js', code: ep.exampleRequest.node },
                  { language: 'python', label: 'Python', code: ep.exampleRequest.python },
                  { language: 'java', label: 'Java', code: ep.exampleRequest.java },
                  { language: 'go', label: 'Go', code: ep.exampleRequest.go },
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
