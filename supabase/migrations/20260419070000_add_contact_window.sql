-- Add last_received_at to contacts table
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS last_received_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for performance on window checks
CREATE INDEX IF NOT EXISTS idx_contacts_last_received ON public.contacts(last_received_at);

-- BACKFILL: Initialize last_received_at for existing contacts based on their last inbound message
UPDATE public.contacts c
SET last_received_at = (
  SELECT MAX(m.created_at)
  FROM public.messages m
  WHERE m.contact_id = c.id 
  AND m.direction = 'inbound'
)
WHERE last_received_at IS NULL;
