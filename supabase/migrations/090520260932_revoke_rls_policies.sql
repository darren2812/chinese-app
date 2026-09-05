-- The browser does not access application data through Supabase directly.
-- FastAPI validates the user JWT and accesses the database with the server-only
-- secret key, which bypasses RLS.

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.learning_items enable row level security;

-- Block direct browser access through Supabase's anon/authenticated API roles.
revoke all on table public.learning_items from anon, authenticated;