-- Add Gupshup fields to whatsapp_accounts and relax Meta constraints
ALTER TABLE whatsapp_accounts 
  ALTER COLUMN business_id DROP NOT NULL,
  ALTER COLUMN phone_number_id DROP NOT NULL,
  ALTER COLUMN access_token DROP NOT NULL,
  ADD COLUMN gupshup_app_name TEXT,
  ADD COLUMN gupshup_api_key TEXT;
