-- Create verification_codes table for OTP verification
CREATE TABLE IF NOT EXISTS public.verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    payload JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by email during verification
CREATE INDEX IF NOT EXISTS idx_verification_email ON public.verification_codes(email);

-- Optional: Add a cleanup policy for expired codes (can be run manually or via cron)
COMMENT ON TABLE public.verification_codes IS 'Stores temporary registration data and OTP codes for email verification.';
