-- create an additional table to track what learning items are part of a conversation

create table public.conversation_practice_items (
  conversation_id uuid not null
    references public.conversations(id) on delete cascade,

  learning_item_id uuid not null
    references public.learning_items(id) on delete cascade,

  primary key (conversation_id, learning_item_id)
);

alter table public.conversation_practice_items enable row level security;
revoke all on table public.conversation_practice_items from anon, authenticated;
