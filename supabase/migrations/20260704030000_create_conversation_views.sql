-- Create Conversations View for Latest Messages
CREATE OR REPLACE VIEW public.conversations_view AS
SELECT DISTINCT ON (contact_id) 
  id, 
  tenant_id, 
  contact_id, 
  content, 
  direction, 
  status, 
  created_at
FROM public.messages
ORDER BY contact_id, created_at DESC;

-- Create Unread Counts View
CREATE OR REPLACE VIEW public.unread_counts_view AS
SELECT 
  tenant_id, 
  contact_id, 
  COUNT(*)::integer as unread_count
FROM public.messages
WHERE direction = 'inbound' AND status = 'received'
GROUP BY tenant_id, contact_id;
