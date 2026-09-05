-- Create push_subscriptions table for Web Push / PWA notifications
create table if not exists public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_push_subscriptions_tenant on public.push_subscriptions(tenant_id);
create index if not exists idx_push_subscriptions_endpoint on public.push_subscriptions(endpoint);
