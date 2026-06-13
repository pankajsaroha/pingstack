-- Secure realtime message updates without exposing public.messages through raw
-- postgres_changes subscriptions.

-- Public message rows should only be accessed through server-side API routes
-- that use the service role client.
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own tenant's messages" ON public.messages;
DROP POLICY IF EXISTS "Service role can manage messages" ON public.messages;

CREATE POLICY "Service role can manage messages"
  ON public.messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Realtime private Broadcast authorization.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON realtime.messages TO authenticated;

DROP POLICY IF EXISTS "Tenant users can receive message broadcasts" ON realtime.messages;

CREATE POLICY "Tenant users can receive message broadcasts"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    realtime.messages.extension = 'broadcast'
    AND (SELECT realtime.topic()) = 'tenant:' || (
      NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'tenantId'
    )
  );

CREATE OR REPLACE FUNCTION public.broadcast_message_changes()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  topic_tenant_id uuid;
BEGIN
  topic_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);

  PERFORM realtime.broadcast_changes(
    'tenant:' || topic_tenant_id::text,
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS handle_message_broadcasts ON public.messages;

CREATE TRIGGER handle_message_broadcasts
AFTER INSERT OR UPDATE OR DELETE
ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.broadcast_message_changes();

-- Raw postgres_changes for public.messages is no longer needed once clients use
-- private Broadcast channels. Keep this idempotent for projects where the table
-- was never added to the publication.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;
  END IF;
END $$;
