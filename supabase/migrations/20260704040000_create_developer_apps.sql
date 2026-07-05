-- Create Developer Apps table for API keys
CREATE TABLE IF NOT EXISTS public.developer_apps (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  api_key_prefix text NOT NULL, -- e.g. "ps_live_abcd"
  api_secret_hash text NOT NULL, -- SHA-256 hash of plaintext secret
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_developer_apps_tenant ON public.developer_apps(tenant_id);
CREATE INDEX IF NOT EXISTS idx_developer_apps_hash ON public.developer_apps(api_secret_hash);
