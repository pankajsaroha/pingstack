# Pingstack Developer API & Webhooks Documentation (v1)

Welcome to the **Pingstack Developer Platform**. The Pingstack REST API enables you to integrate WhatsApp messaging, contact synchronization, audience groups, broadcast campaigns, and real-time webhook events directly with your CRM, ERP, billing systems, e-commerce stores, and backend applications.

---

## 1. Authentication & Base URL

All requests to the Pingstack Developer API must use **HTTPS** and include a valid Bearer API key in the `Authorization` header.

### Base URL
```http
https://app.pingstack.in/api/v1
```
*(For local development, use `http://localhost:3000/api/v1`)*

### Header Format
```http
Authorization: Bearer ps_secret_live_xxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json
```

---

## 2. Standard Response Envelope

All API responses follow a consistent, predictable JSON schema.

### Success Response (`HTTP 200 / 201`)
```json
{
  "success": true,
  "data": { ... },
  "request_id": "req_8f3a9b1c7d2e4f0a"
}
```

### Error Response (`HTTP 4xx / 5xx`)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Recipient phone number \"to\" is required.",
    "details": [
      { "field": "to", "message": "Missing phone number" }
    ]
  },
  "request_id": "req_8f3a9b1c7d2e4f0a"
}
```

---

## 3. Idempotency

For critical operations such as sending messages or launching campaigns, Pingstack supports the `Idempotency-Key` header. If a network timeout occurs and your system retries the request with the same key within 24 hours, Pingstack returns the cached response without creating duplicate messages or duplicate charges.

```http
Idempotency-Key: order-confirmation-98214
```

---

## 4. Rate Limiting

API rate limits are enforced per workspace using Redis token buckets and sliding windows:

| Plan | Messages / Second | Read Requests / Minute | Burst Limit |
| :--- | :---: | :---: | :---: |
| **Starter** | 2 / sec | 60 / min | 10 |
| **Growth** | 5 / sec | 180 / min | 25 |
| **Pro** | 10 / sec | 600 / min | 50 |

### Rate Limit Response Headers
* `X-RateLimit-Limit`: Maximum requests permitted in the window.
* `X-RateLimit-Remaining`: Remaining request allowance.
* `Retry-After`: Seconds to wait before retrying (when receiving `HTTP 429`).

---

## 5. Messages API

### Send a WhatsApp Message
`POST /api/v1/messages`

#### Template Message Example (Positional Variables)
Template variables in Meta WhatsApp are strictly positional (`{{1}}`, `{{2}}`, etc.). You can pass variables as an array `["Rahul", "ORD-1234"]` or a positional object `{ "1": "Rahul", "2": "ORD-1234" }`.

**cURL Request:**
```bash
curl -X POST https://app.pingstack.in/api/v1/messages \
  -H "Authorization: Bearer ps_secret_live_..." \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: order-9981" \
  -d '{
    "to": "919876543210",
    "template": {
      "name": "order_confirmation",
      "language": "en_US"
    },
    "variables": {
      "1": "Rahul",
      "2": "ORD-9981",
      "3": "₹2,499"
    }
  }'
```

**Node.js Request:**
```javascript
const response = await fetch('https://app.pingstack.in/api/v1/messages', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ps_secret_live_...',
    'Content-Type': 'application/json',
    'Idempotency-Key': 'order-9981'
  },
  body: JSON.stringify({
    to: '919876543210',
    template: {
      name: 'order_confirmation',
      language: 'en_US'
    },
    variables: ['Rahul', 'ORD-9981', '₹2,499']
  })
});
const result = await response.json();
console.log(result);
```

**Response (`HTTP 201 Created`):**
```json
{
  "success": true,
  "data": {
    "message_id": "8b9e6722-1d54-4a2e-b6a1-cb9e4f509d2a",
    "recipient": "919876543210",
    "status": "queued",
    "message_type": "template",
    "template": "order_confirmation",
    "content": "Hello Rahul, your order ORD-9981 for ₹2,499 is confirmed!",
    "created_at": "2026-09-09T22:00:00.000Z",
    "sandbox": false
  },
  "request_id": "req_5f2c4e1a0b3d"
}
```

---

## 6. Contacts API

### List Contacts
`GET /api/v1/contacts?page=1&pageSize=50&search=Rahul`

### Create / Upsert Contact
`POST /api/v1/contacts`

```json
{
  "name": "Amit Sharma",
  "phone": "919876543211",
  "email": "amit@example.com",
  "tags": ["vip", "retail"],
  "custom_fields": {
    "account_tier": "Gold",
    "customer_id": "CUST-4412"
  }
}
```

### Bulk Import Contacts
`POST /api/v1/contacts/bulk`

```json
{
  "contacts": [
    { "name": "Priya", "phone": "919876543212", "tags": ["lead"] },
    { "name": "Karan", "phone": "919876543213", "tags": ["customer"] }
  ]
}
```

---

## 7. Groups & Membership API

### Create Group
`POST /api/v1/groups`
```json
{
  "name": "Diwali VIP Customers",
  "description": "Exclusive festive discounts segment"
}
```

### Add Contacts to Group
`POST /api/v1/groups/{id}/contacts`
```json
{
  "contact_ids": [
    "c8a1b2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
    "e9b2c3d4-5f6a-7b8c-9d0e-1f2a3b4c5d6e"
  ]
}
```

---

## 8. Campaigns API (Broadcasts)

The Campaigns API allows programmatic broadcast execution across contacts, groups, or direct external recipient lists without requiring prior contact synchronization.

### Create Campaign Draft
`POST /api/v1/campaigns`
```json
{
  "name": "Fee Reminder Batch September",
  "template_name": "fee_reminder"
}
```

### Launch Campaign (With Direct Recipients & Positional Variables)
`POST /api/v1/campaigns/{id}/launch`

```json
{
  "recipients": [
    {
      "phone": "919876543210",
      "variables": { "1": "Rahul", "2": "₹5,000", "3": "15 Sep" }
    },
    {
      "phone": "919876543211",
      "variables": { "1": "Amit", "2": "₹3,500", "3": "15 Sep" }
    }
  ]
}
```

### Get Campaign Performance Results
`GET /api/v1/campaigns/{id}/results`

**Response (`HTTP 200 OK`):**
```json
{
  "success": true,
  "data": {
    "campaign_id": "c8a1b2c3-...",
    "name": "Fee Reminder Batch September",
    "status": "completed",
    "metrics": {
      "total_messages": 100,
      "pending": 0,
      "sent": 98,
      "delivered": 96,
      "read": 74,
      "failed": 2,
      "delivered_rate_pct": 96,
      "read_rate_pct": 74
    }
  },
  "request_id": "req_7a8b9c0d1e2f"
}
```

---

## 9. Developer Webhooks

Outbound webhooks notify your server in real time whenever messages are received, delivered, read, or failed.

### Subscribed Event Types
* `message.received` — Triggered when a WhatsApp customer sends a message.
* `message.sent` — Message dispatched to Meta Cloud API.
* `message.delivered` — Message delivered to recipient's device.
* `message.read` — Recipient opened/read the message.
* `message.failed` — Message delivery failed (with Meta error code).
* `campaign.started` — Campaign processing initiated.
* `campaign.completed` — All campaign messages processed.
* `contact.created` / `contact.updated` / `contact.deleted`

### Register Webhook Endpoint
`POST /api/v1/webhooks`
```json
{
  "url": "https://api.mycrm.com/webhooks/pingstack",
  "events": ["message.received", "message.delivered", "message.read"]
}
```

### Webhook Signature Verification (HMAC-SHA256)
Each webhook request contains security headers:
* `X-Pingstack-Event`: Event name (e.g. `message.received`).
* `X-Pingstack-Event-Id`: Unique event ID (`evt_...`).
* `X-Pingstack-Timestamp`: Unix timestamp (milliseconds).
* `X-Pingstack-Signature`: Signature in format `v1=<hex>`.

#### Node.js / Express Verification Example:
```javascript
import crypto from 'crypto';

function verifyPingstackWebhook(rawBody, signatureHeader, timestampHeader, signingSecret) {
  const expectedSignature = crypto
    .createHmac('sha256', signingSecret)
    .update(`${timestampHeader}.${rawBody}`)
    .digest('hex');

  const providedSignature = signatureHeader.replace('v1=', '');
  return crypto.timingSafeEqual(
    Buffer.from(providedSignature),
    Buffer.from(expectedSignature)
  );
}
```

---

## 10. Operational Telemetry & Request Logs

* `GET /api/v1/usage?days=30` — Aggregated API request counts, success rate, average latency (ms), and endpoint breakdown.
* `GET /api/v1/logs?page=1&pageSize=50&status_code=500` — Paginated request logs for auditing integration health.
