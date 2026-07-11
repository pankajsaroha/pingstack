export interface WhatsAppAccount {
  id: string;
  provider: string;
  status: string;
  phone_number_id: string | null;
  business_id: string | null;
}

export interface Tenant {
  id: string;
  plan_type: string;
  pending_plan_type: string | null;
  subscription_status?: string;
  created_at?: string;
  user_name: string;
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

export interface Conversation {
  contact: Contact;
  latestMessage: Message | null;
  unreadCount: number;
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
