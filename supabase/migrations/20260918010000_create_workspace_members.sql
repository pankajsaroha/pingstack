-- Migration: Create Workspace Members table for multi-tenant user membership
-- Enables a single global PingStack user (users table) to belong to multiple workspaces (tenants)
-- with dedicated workspace roles and functional permissions per workspace.

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  workspace_role TEXT DEFAULT 'member' NOT NULL,
  permissions JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_tenant ON public.workspace_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);

-- Backfill existing single-tenant users into workspace_members
INSERT INTO public.workspace_members (tenant_id, user_id, workspace_role, permissions, created_at, updated_at)
SELECT 
  tenant_id, 
  id AS user_id, 
  COALESCE(workspace_role, role, 'admin') AS workspace_role, 
  COALESCE(permissions, '{}'::jsonb) AS permissions, 
  created_at, 
  created_at AS updated_at
FROM public.users
WHERE tenant_id IS NOT NULL
ON CONFLICT (tenant_id, user_id) DO UPDATE
SET 
  workspace_role = EXCLUDED.workspace_role,
  permissions = EXCLUDED.permissions;
