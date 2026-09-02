create table public.conversations (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
-- not sure what role text and jsonb means
create table public.messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check(role in ('user', 'assistant')),
    content text not null,
    correction jsonb,
    created_at timestamptz not null default now()
);

create index messages_conversation_created_at_idx
    on public.messages (conversation_id, created_at);