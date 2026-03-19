-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Tenants
create table public.tenants (
  id uuid primary key default uuid_generate_v4(),
  public_id text unique not null,
  name text not null,
  industry text,
  plan text default 'free',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Users
create table public.users (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  name text not null,
  email text unique not null,
  password_hash text not null,
  role text default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create index idx_users_tenant on public.users(tenant_id);

-- Contacts
create table public.contacts (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  name text,
  phone_number text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(tenant_id, phone_number)
);
create index idx_contacts_tenant on public.contacts(tenant_id);
create index idx_contacts_phone on public.contacts(phone_number);

-- Groups
create table public.groups (
  id uuid primary key default uuid_generate_v4(),
  public_id text unique not null,
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(tenant_id, name)
);
create index idx_groups_tenant on public.groups(tenant_id);

-- Group Contacts
create table public.group_contacts (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  group_id uuid references public.groups(id) on delete cascade not null,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  unique(group_id, contact_id)
);
create index idx_group_contacts_tenant on public.group_contacts(tenant_id);

-- Templates
create table public.templates (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  name text not null,
  template_id text not null, -- Gupshup template ID
  content text not null,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create index idx_templates_tenant on public.templates(tenant_id);

-- Campaigns
create table public.campaigns (
  id uuid primary key default uuid_generate_v4(),
  public_id text unique not null,
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  name text not null,
  template_id uuid references public.templates(id) on delete set null,
  status text default 'draft', -- draft, scheduled, running, completed
  scheduled_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create index idx_campaigns_tenant on public.campaigns(tenant_id);

-- Messages
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  phone_number text not null,
  status text default 'pending', -- pending, sent, delivered, failed
  provider_message_id text,
  error text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create index idx_messages_tenant on public.messages(tenant_id);
create index idx_messages_campaign on public.messages(campaign_id);
