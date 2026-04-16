-- Add message_type to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text';

-- Backfill existing messages
-- If campaign_id is not null, it's definitely a template
UPDATE public.messages SET message_type = 'template' WHERE campaign_id IS NOT NULL;

-- If content starts with a common template prefix (hypothetical) or if it's outbound 
-- and content was null originally, it might be a template. 
-- But safer to just mark all existing outbound with no campaign as 'template' if they were bulk sent.
-- Based on current logic, most outbound messages using templates have no campaign_id if sent via /api/messages/send
UPDATE public.messages SET message_type = 'template' 
WHERE direction = 'outbound' 
AND campaign_id IS NULL 
AND status = 'pending'; 

-- Add index for performance in worker
CREATE INDEX IF NOT EXISTS idx_messages_type ON public.messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_status_type ON public.messages(status, message_type);
