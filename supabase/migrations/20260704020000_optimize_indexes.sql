-- Optimize Messages Queries
CREATE INDEX IF NOT EXISTS idx_messages_tenant_contact_created 
  ON public.messages(tenant_id, contact_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_tenant_created 
  ON public.messages(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_tenant_status 
  ON public.messages(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_messages_tenant_direction 
  ON public.messages(tenant_id, direction);

-- Optimize Contacts Queries
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_created 
  ON public.contacts(tenant_id, created_at DESC);
