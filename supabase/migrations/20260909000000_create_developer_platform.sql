-- Migration: Create Developer Platform Tables (API Webhooks, Logs, Idempotency)
-- Description: Additive schema supporting /api/v1 Developer APIs, Outbound Webhooks, API Request Logs, and Idempotency.

-- 1. Enhance developer_apps table with status and last_used_at
ALTER TABLE IF EXISTS public.developer_apps 
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' NOT NULL,
  ADD COLUMN IF NOT EXISTS last_used_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_developer_apps_status ON public.developer_apps(status);

-- 2. Developer Webhook Endpoints
CREATE TABLE IF NOT EXISTS public.developer_webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  signing_secret text NOT NULL,
  subscribed_events text[] NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dev_webhooks_tenant ON public.developer_webhook_endpoints(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dev_webhooks_active ON public.developer_webhook_endpoints(tenant_id, is_active);

-- 3. Developer Webhook Deliveries (Delivery logs & status)
CREATE TABLE IF NOT EXISTS public.developer_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  endpoint_id uuid REFERENCES public.developer_webhook_endpoints(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  event_id text NOT NULL,
  payload jsonb NOT NULL,
  response_status integer,
  response_body text,
  attempts integer DEFAULT 1 NOT NULL,
  error text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dev_webhook_deliv_tenant ON public.developer_webhook_deliveries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dev_webhook_deliv_endpoint ON public.developer_webhook_deliveries(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_dev_webhook_deliv_created ON public.developer_webhook_deliveries(created_at DESC);

-- 4. API Request Logs (Persistent operational logging & telemetry)
CREATE TABLE IF NOT EXISTS public.api_request_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  api_key_id uuid REFERENCES public.developer_apps(id) ON DELETE SET NULL,
  request_id text NOT NULL,
  method text NOT NULL,
  endpoint text NOT NULL,
  status_code integer NOT NULL,
  latency_ms integer NOT NULL,
  resource_type text,
  resource_id text,
  error_code text,
  ip_address text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_logs_tenant_created ON public.api_request_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_request_id ON public.api_request_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON public.api_request_logs(endpoint);

-- 5. Idempotency Keys (Scoped per tenant)
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  key text NOT NULL,
  request_hash text NOT NULL,
  response_code integer NOT NULL,
  response_body jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at timestamp with time zone NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_idempotency_tenant_key ON public.idempotency_keys(tenant_id, key);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON public.idempotency_keys(expires_at);
