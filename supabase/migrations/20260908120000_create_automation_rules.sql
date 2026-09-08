-- Create automation_rules table for Basic (Growth) and Advanced (Pro) WhatsApp Automations
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  trigger_type text NOT NULL, -- 'keyword', 'welcome', 'message_contains', 'exact_match'
  trigger_config jsonb DEFAULT '{}'::jsonb NOT NULL,
  conditions jsonb DEFAULT '[]'::jsonb NOT NULL,
  actions jsonb DEFAULT '[]'::jsonb NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  execution_count integer DEFAULT 0 NOT NULL,
  last_executed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Optimize queries by tenant and active status
CREATE INDEX IF NOT EXISTS idx_automation_rules_tenant 
  ON public.automation_rules(tenant_id, is_active);

CREATE INDEX IF NOT EXISTS idx_automation_rules_created 
  ON public.automation_rules(tenant_id, created_at DESC);
