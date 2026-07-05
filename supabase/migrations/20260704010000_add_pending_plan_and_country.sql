-- Migration to add pending plan columns, country configuration, and Meta billing estimation/budget columns to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS pending_plan_type text,
ADD COLUMN IF NOT EXISTS country text DEFAULT 'IN',
ADD COLUMN IF NOT EXISTS last_meta_payment_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS meta_budget_limit numeric DEFAULT 1000,
ADD COLUMN IF NOT EXISTS meta_budget_alert_dismissed boolean DEFAULT false;
