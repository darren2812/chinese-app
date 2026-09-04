create or replace function public.touch_conversation_updated_at()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

create trigger messages_touch_conversation
after insert on public.messages
for each row
execute function public.touch_conversation_updated_at();