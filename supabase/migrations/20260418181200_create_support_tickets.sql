-- Create support_tickets table
create table public.support_tickets (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status text default 'CREATED', -- 'CREATED', 'IN-PROGRESS', 'RESOLVED'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.support_tickets enable row level security;

-- Policies
create policy "Allow internal insert" on public.support_tickets
  for insert with check (true);

create policy "Allow service role select" on public.support_tickets
  for select using (auth.role() = 'service_role');
