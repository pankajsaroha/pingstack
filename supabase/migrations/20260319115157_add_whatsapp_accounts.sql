CREATE TABLE whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  provider VARCHAR(50) DEFAULT 'META',
  business_id VARCHAR(255) NOT NULL,
  phone_number_id VARCHAR(255) NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_accounts_phone ON whatsapp_accounts(phone_number_id);

ALTER TABLE tenants
  DROP COLUMN IF EXISTS gupshup_app_name,
  DROP COLUMN IF EXISTS gupshup_api_key,
  DROP COLUMN IF EXISTS whatsapp_number,
  DROP COLUMN IF EXISTS whatsapp_status;
