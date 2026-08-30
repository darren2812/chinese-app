create table public.learning_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  english text not null,
  mandarin text not null,
  pinyin text not null,
  type text not null,
  source text not null,
  created_at timestamptz not null default now(),
  unique (user_id, english, mandarin)
);

alter table public.learning_items enable row level security;

create policy "Users can read their own vocabulary"
on public.learning_items
for select to authenticated
using (auth.uid() = user_id);