We are not using Supabase Auth in the browser as it would require users to login via Supabase auth. We are going with approach 2

Best approach
Best way: use Supabase Auth in the browser
This is the cleanest and most secure option.

Have users sign in through Supabase Auth
Store the Supabase session client-side
Call dbPublic.auth.setSession(access_token) in the browser
Then realtime subscriptions will carry the authenticated JWT
Your existing RLS policy can remain valid and secure
That gives you:

secure realtime access
true tenant-scoped filtering
no need to expose unsafe keys
direct client updates in inbox/chat
If you want to keep your current custom auth
You can still do it, but it requires extra work:

After your custom login succeeds, mint or retrieve a Supabase-compatible auth token
Pass that token to the browser
Set it on the Supabase client so realtime uses it
That means your auth flow becomes:

app login → verify user → generate custom JWT
also generate/use Supabase session token
browser uses the Supabase token for realtime
Alternative if you do not want browser Supabase auth
If you want to keep your custom JWT entirely separate, the safer path is:

do not use browser realtime directly
use a server-side realtime subscription or event relay
forward only authorized updates to the browser
This avoids exposing Supabase auth in the browser, but is more complex.

AI Recommendation but we will use custom auth
What I recommend
For a multi-user app with secure RLS and realtime:

integrate Supabase Auth for browser users
or generate a Supabase JWT/session from your existing login
then subscribe with dbPublic using that authenticated session