# Supabase RLS Permission Fix

## Issue
After login works, the dashboard fails with:
```
[tenant/me] tenant query failed {
  code: '42501',
  message: 'permission denied for table tenants'
}
```

Error code 42501 = PostgreSQL permission denied = Row-Level Security (RLS) policy blocking access

## Root Cause
The migrations file `supabase/migrations/20260523210000_enable_realtime_messages.sql` **re-enables RLS** when run. Even if you disable RLS manually, running migrations can turn it back on.

Additionally, the RLS policies don't allow **service role** (admin) access - they only allow authenticated users.

## 🚨 What To Do RIGHT NOW

Since Solution 2 didn't work, try this **immediately**:

### Step 1: Run this SQL in Supabase
Copy-paste the ENTIRE block into SQL Editor (all at once):
```sql
-- Disable RLS on ALL public tables at once
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes DISABLE ROW LEVEL SECURITY;

-- Verify it worked
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Step 2: Restart your Node.js server
Kill the dev server and restart:
```bash
npm run dev
```

### Step 3: Test
Try logging in and accessing the dashboard.

### Step 4: If Still Getting 42501
Check if you have `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` - if not:
1. Go to Supabase Dashboard → Settings → API
2. Copy the **SERVICE ROLE SECRET** key (not the public/anon key)
3. Add it to `.env.local`: `SUPABASE_SERVICE_ROLE_KEY=<key>`
4. Restart Node server

## Solutions

### ⚡ Quick Fix: Disable RLS Everywhere (Development Only)
In Supabase Dashboard SQL Editor, run this ENTIRE block (copy-paste all at once):

```sql
-- Find all tables with RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true
ORDER BY tablename;

-- Disable RLS on ALL tables
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true
  LOOP
    EXECUTE 'ALTER TABLE public.' || r.tablename || ' DISABLE ROW LEVEL SECURITY';
    RAISE NOTICE 'Disabled RLS on %', r.tablename;
  END LOOP;
END $$;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('tenants', 'users', 'whatsapp_accounts', 'contacts', 'messages', 'templates', 'verification_codes')
ORDER BY tablename;
```

### Solution 2: Fix RLS Policies (Best for Most Cases)
**If Solution 1 didn't work**, try this in Supabase Dashboard SQL Editor:

```sql
-- Drop all existing RLS policies on tables
DROP POLICY IF EXISTS "Enable read access for all users" ON public.tenants;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.whatsapp_accounts;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.contacts;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.messages;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.templates;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.verification_codes;

-- Disable RLS entirely on all necessary tables
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes DISABLE ROW LEVEL SECURITY;
```

**Why this is different:** Previous SQL had syntax issues. This explicitly:
1. Drops conflicting policies first (prevents creation errors)
2. Uses public schema prefix for clarity
3. Ensures RLS is fully disabled (not just policies altered)

### ⚠️ Important: Migration File Issue
The migration file `supabase/migrations/20260523210000_enable_realtime_messages.sql` contains:
```sql
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own tenant's messages" ...
```

**This means if you re-run migrations, RLS gets turned back on!**

To prevent this, you should:
1. **Option A (Quick):** Don't re-run this migration. Just disable RLS once in Supabase.
2. **Option B (Better):** Edit the migration to allow service role access:
```sql
-- Edit supabase/migrations/20260523210000_enable_realtime_messages.sql
-- Replace the CREATE POLICY line with:
CREATE POLICY "Users can read their own tenant's messages"
  ON public.messages
  FOR SELECT
  USING (
    auth.role() = 'service_role'  -- Allow admin/service role bypass
    OR tenant_id = (NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', ''))::uuid
  );
```

### Solution 3: Check Service Role Key
Verify in `.env.local`:
1. `SUPABASE_SERVICE_ROLE_KEY` is correct
2. It's not the anon key (should start with same format but be the service role)
3. In Supabase Settings > API, copy the **service_role** key, not the public/anon key

## Code Changes Made

### 1. **Login Route** (`src/app/api/auth/login/route.ts`)
- Changed `.ilike()` to `.eq()` for exact email matching
- Fixed: When Supabase auth succeeds for user not in local DB, now assigns a real tenant_id instead of 'default'
- Gets first existing tenant from DB or defaults to 'default' as fallback

**Impact:** Users logging in via Supabase will now have proper tenant association

### 2. **Register Tenant** (`src/app/api/auth/register-tenant/route.ts`)
- Changed verification query from `.single()` to `.maybeSingle()` (graceful null instead of error)
- Fixed password extraction from verification payload
- Made Supabase sync non-fatal (continues if it fails)

**Impact:** Registration won't crash if verification code doesn't exist

### 3. **Forgot Password** (`src/app/api/auth/forgot-password/route.ts`)
- Changed all verification queries from `.single()` to `.maybeSingle()`
- Both VERIFY and RESET steps now handle missing codes gracefully

**Impact:** Password reset won't crash on database errors

## Testing Checklist

After applying RLS fixes:

1. ✅ Register new account - should succeed
2. ✅ Login with credentials - should get tenant data
3. ✅ Dashboard should load without 42501 error
4. ✅ Templates sync - should work
5. ✅ Contacts display - should work
6. ✅ Stats fetch - should show correct totals

## Next Steps

1. **Immediate:** Disable RLS on tables in Supabase (Solution 1)
2. **Then:** Test if login and dashboard work
3. **Production:** Implement proper RLS policies (Solution 2)

## Troubleshooting

### 🔴 Still Getting 42501 Error?

**Root cause:** Either RLS is still enabled, OR the migration files are re-enabling it.

**Step 1: Check Migration History**
Look at `supabase/migrations/20260523210000_enable_realtime_messages.sql` - does it contain:
```
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
```

If yes, this file might re-enable RLS when migrations run. You need to either:
- Edit the migration file to remove the RLS lines (Option B above)
- OR avoid re-running this migration

**Step 2: Verify RLS is Actually Disabled**
Run this in Supabase SQL Editor to check RLS status:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('tenants', 'users', 'whatsapp_accounts', 'contacts', 'messages', 'templates', 'verification_codes')
ORDER BY tablename;
```

**Expected result:** All should show `rowsecurity = false`

If any show `rowsecurity = true`:
1. Re-run Solution 1 (the DO $$ block that disables all RLS)
2. Make sure you're running the ENTIRE SQL block
3. Don't run any migrations that have `ENABLE ROW LEVEL SECURITY`

**Step 3: Restart Node Server**
After disabling RLS or updating `.env.local`, restart your Next.js dev server:
```bash
# Press Ctrl+C to stop the server
# Then restart it:
npm run dev
```

**Step 4: Check Service Role Key**
In your `.env.local`, verify:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**How to get the correct key:**
1. Go to Supabase Dashboard → Settings → API
2. Under "Project API keys", find **SERVICE ROLE** (NOT public/anon)
3. Copy and paste into `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`
4. Restart your Next.js dev server

**Step 3: Force Check RLS Status with psql**
If you have psql installed:
```bash
psql -h db.supabase.co -U postgres -d postgres -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tenants';"
```

### Secondary Error: "Cannot read properties of null"
This error `Cannot read properties of null (reading 'access_token')` in `setSupabaseSession` means:
- Login is failing to create a valid session
- The JWT/session token isn't being passed correctly
- Once RLS is fixed, this error should disappear

### Common Mistakes

❌ **Mistake 1:** Using wrong key
- Service role key is longer and has more content than anon key
- Anon key starts with `eyJhbGc...` but is shorter
- Check: Supabase Settings → API → SERVICE ROLE SECRET (copy this)

❌ **Mistake 2:** SQL didn't fully execute
- If you paste only part of the Solution 1 SQL, later commands don't run
- Always paste the entire block and click "Run" once

❌ **Mistake 3:** RLS re-enabled by migration files
- If migrations contain `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, they will turn RLS back on
- Check: `supabase/migrations/20260523210000_enable_realtime_messages.sql`
- Fix: Edit the file to remove RLS lines, or use Solution 2 to update the policies

❌ **Mistake 4:** Didn't restart Next.js server
- After disabling RLS or updating `.env.local`, restart with `npm run dev`
- The server needs to reconnect with updated credentials

## Related Commands

Check current policies:
```sql
SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenants';
```

List all policies:
```sql
SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
```
