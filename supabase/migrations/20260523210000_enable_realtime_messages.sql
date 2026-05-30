-- Enable Row Level Security (RLS) on public.messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid errors on reapplying
DROP POLICY IF EXISTS "Users can read their own tenant's messages" ON public.messages;

-- Create policy that allows service role (admin) access plus authenticated users
CREATE POLICY "Users can read their own tenant's messages"
  ON public.messages
  FOR SELECT
  TO authenticated, service_role
  USING (
    auth.role() = 'service_role'
    OR tenant_id = (NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', ''))::uuid
  );

-- Enable Replication (Realtime) for messages table
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Safely add messages to the realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
