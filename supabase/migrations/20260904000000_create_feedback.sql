-- Create feedback table
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  type text not null, -- 'bug', 'feature', 'suggestion', 'general'
  message text not null,
  priority text default 'important', -- 'nice_to_have', 'important', 'critical'
  email text,
  page text,
  metadata jsonb default '{}'::jsonb,
  status text default 'NEW', -- 'NEW', 'REVIEWED', 'PLANNED', 'RESOLVED'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.feedback enable row level security;

-- Policies: allow authenticated inserts and service-role selects
create policy "Allow inserts" on public.feedback
  for insert with check (true);

create policy "Allow service role read" on public.feedback
  for select using (auth.role() = 'service_role');

-- Indexes for performance
create index if not exists idx_feedback_tenant_id on public.feedback(tenant_id);
create index if not exists idx_feedback_type on public.feedback(type);
create index if not exists idx_feedback_created_at on public.feedback(created_at desc);
