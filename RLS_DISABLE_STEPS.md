# How to Disable RLS in Supabase - Step by Step

## You must do this IN SUPABASE DASHBOARD, not in terminal!

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com → Open your project
2. Click **SQL Editor** on the left sidebar
3. You should see a text editor with "Welcome to SQL Editor" at the top

### Step 2: Copy this SQL (the ENTIRE block)
```sql
-- Disable RLS on ALL tables
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
ALTER TABLE public.support_tickets DISABLE ROW LEVEL SECURITY;
```

### Step 3: Paste into Supabase SQL Editor
1. Click in the SQL Editor text area
2. **Clear any existing text** (Ctrl+A, then Delete)
3. Paste the SQL block above
4. You should see 11 ALTER TABLE commands

### Step 4: Click "RUN" button
- Look for the blue **RUN** button at the bottom right of the SQL Editor
- Click it
- Wait for it to complete (should say "Success" or similar)

### Step 5: Verify it worked
Paste this query to verify:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected output:** All tables should show `rowsecurity = false`

### Step 6: Restart your Node server
In your terminal:
```bash
# Kill current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 7: Test login
1. Open your app in browser
2. Try to login with valid credentials
3. Dashboard should load without 500 errors
4. You should see contacts, messages, etc.

---

## 🚨 COMMON MISTAKES

❌ **Running SQL in terminal instead of Supabase Dashboard**
- These commands must run in Supabase, NOT in your local terminal
- They modify the DATABASE, not your code

❌ **Only copying part of the SQL**
- Copy-paste the ENTIRE block all at once
- Don't run commands one by one

❌ **Not clicking RUN button**
- Just pasting doesn't execute the query
- You MUST click the blue RUN button

❌ **Not restarting Node server**
- After changes in Supabase, restart your dev server
- The connection might be cached

---

## If you still get 42501 error after this:

Check that these files exist and are correct:

### `.env.local` should have:
```
NEXT_PUBLIC_SUPABASE_URL=https://kiswlpudinxqb...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=your_jwt_secret
```

### Check Supabase RLS status again:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

All should show `rowsecurity = false`
