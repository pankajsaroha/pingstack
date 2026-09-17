-- Migration: Create Teams, Team Members, Workspace Invitations, and Conversation Assignments
-- Safe, additive migration that preserves all existing tenant isolation and data structures.

-- 1. Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#4F46E5',
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(tenant_id, name)
);
CREATE INDEX IF NOT EXISTS idx_teams_tenant ON public.teams(tenant_id);

-- 2. Team Members Table (A user can belong to multiple teams within a tenant)
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(team_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_team_members_tenant ON public.team_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);

-- 3. Workspace Invitations Table
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member' NOT NULL,
  team_ids JSONB DEFAULT '[]'::jsonb NOT NULL,
  token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(tenant_id, email, status)
);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token ON public.workspace_invitations(token);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON public.workspace_invitations(email);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_tenant ON public.workspace_invitations(tenant_id);

-- 4. Conversation Assignments Table (Anchored per contact_id in tenant)
CREATE TABLE IF NOT EXISTS public.conversation_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'open' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(tenant_id, contact_id)
);
CREATE INDEX IF NOT EXISTS idx_conv_assign_tenant ON public.conversation_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conv_assign_team ON public.conversation_assignments(team_id);
CREATE INDEX IF NOT EXISTS idx_conv_assign_user ON public.conversation_assignments(assigned_user_id);

-- 5. Additive Columns on users and workspace_invitations
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS workspace_role TEXT DEFAULT 'member';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.workspace_invitations ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

