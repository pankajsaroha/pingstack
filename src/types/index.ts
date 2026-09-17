export interface WhatsAppAccount {
  id: string;
  provider: string;
  status: string;
  phone_number_id: string | null;
  business_id: string | null;
}

export interface Tenant {
  id: string;
  name?: string;
  plan_type: string;
  pending_plan_type: string | null;
  subscription_status?: string;
  created_at?: string;
  user_name: string;
  user_email?: string;
  user_role?: string;
  is_trial: boolean;
  trial_expires_at: string;
  trial_days_left: number;
  trial_expired: boolean;
  whatsapp_account: WhatsAppAccount | null;
  [key: string]: any; // Allow indexing dynamically for database fields
}

export interface Contact {
  id: string;
  name: string;
  phone_number: string;
  tenant_id: string;
  created_at: string;
  last_received_at?: string | null;
  avatar_url?: string | null;
}

export interface Template {
  id: string;
  name: string;
  category?: string;
  language?: string;
  status?: string;
  components?: any[];
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  tenant_id: string;
  created_at: string;
  contacts_count?: number;
}

export interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'received';
  created_at: string;
  content: string | null;
  media_url?: string | null;
  media_type?: string | null;
  caption?: string | null;
  phone_number?: string;
  variables?: any;
  contacts?: { name: string } | null;
  [key: string]: any;
}

export interface Team {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  color?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  member_count?: number;
}

export interface TeamMember {
  id: string;
  tenant_id: string;
  team_id: string;
  user_id: string;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
  team?: Team;
}

export interface WorkspacePermissions {
  inbox_view?: boolean;
  inbox_reply?: boolean;
  inbox_assign?: boolean;
  contacts_view?: boolean;
  contacts_manage?: boolean;
  templates_view?: boolean;
  templates_manage?: boolean;
  campaigns_view?: boolean;
  campaigns_create?: boolean;
  campaigns_send?: boolean;
  teams_manage?: boolean;
  members_manage?: boolean;
  settings_manage?: boolean;
}

export interface WorkspaceMember {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  role: string; // 'admin' | 'user' (platform role)
  workspace_role: 'admin' | 'member'; // 'admin' (Workspace Admin) | 'member' (Team Member)
  permissions?: WorkspacePermissions;
  created_at: string;
  teams: Team[];
}

export interface WorkspaceInvitation {
  id: string;
  tenant_id: string;
  email: string;
  role: 'admin' | 'member';
  team_ids: string[];
  permissions?: WorkspacePermissions;
  token: string;
  invited_by?: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  created_at: string;
}

export interface ConversationAssignment {
  id?: string;
  tenant_id: string;
  contact_id: string;
  team_id?: string | null;
  assigned_user_id?: string | null;
  status?: string;
  team?: {
    id: string;
    name: string;
    color?: string;
  } | null;
  assigned_user?: {
    id: string;
    name: string;
    email: string;
  } | null;
  created_at?: string;
  updated_at?: string;
}

export interface Conversation {
  contact: Contact;
  latestMessage: Message | null;
  unreadCount: number;
  assignment?: ConversationAssignment | null;
}

export interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'sending' | 'completed' | 'failed';
  created_at: string;
  sent_count?: number;
  delivered_count?: number;
  read_count?: number;
  failed_count?: number;
  total_recipients?: number;
  template_name?: string;
}

