ALTER TABLE tenants
  ADD COLUMN gupshup_app_name TEXT,
  ADD COLUMN gupshup_api_key TEXT,
  ADD COLUMN whatsapp_number TEXT,
  ADD COLUMN whatsapp_status TEXT DEFAULT 'pending';

ALTER TABLE messages
  ADD COLUMN direction TEXT DEFAULT 'outbound',
  ADD COLUMN content TEXT;
