-- Migration: Create billing_transactions table to log conversation billing events permanently
CREATE TABLE IF NOT EXISTS billing_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL, -- 'MARKETING', 'UTILITY', 'AUTHENTICATION'
    cost DECIMAL(10, 4) NOT NULL,
    incurred_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE billing_transactions ENABLE ROW LEVEL SECURITY;

-- Enable public select/insert policy for service role and general usage
CREATE POLICY "Allow service role full access" ON billing_transactions
    USING (true) WITH CHECK (true);

-- Index for fast tenant aggregations
CREATE INDEX IF NOT EXISTS idx_billing_transactions_tenant_date ON billing_transactions(tenant_id, incurred_at);
