-- Run once in Supabase SQL Editor to add Vent friends and private messages.
create table if not exists public.friendships (
  id bigint generated always as identity primary key,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);
create unique index if not exists friendships_unique_pair on public.friendships
  (least(requester_id,addressee_id),greatest(requester_id,addressee_id));

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index if not exists messages_people_created on public.messages(sender_id,recipient_id,created_at);

alter table public.friendships enable row level security;
alter table public.messages enable row level security;

drop policy if exists "people view own friendships" on public.friendships;
drop policy if exists "people request friends" on public.friendships;
drop policy if exists "recipient accepts requests" on public.friendships;
drop policy if exists "people remove own friendships" on public.friendships;
create policy "people view own friendships" on public.friendships for select to authenticated
  using (auth.uid()=requester_id or auth.uid()=addressee_id);
create policy "people request friends" on public.friendships for insert to authenticated
  with check (auth.uid()=requester_id and status='pending');
create policy "recipient accepts requests" on public.friendships for update to authenticated
  using (auth.uid()=addressee_id and status='pending')
  with check (auth.uid()=addressee_id and status='accepted');
create policy "people remove own friendships" on public.friendships for delete to authenticated
  using (auth.uid()=requester_id or auth.uid()=addressee_id);

drop policy if exists "people read own messages" on public.messages;
drop policy if exists "friends send messages" on public.messages;
create policy "people read own messages" on public.messages for select to authenticated
  using (auth.uid()=sender_id or auth.uid()=recipient_id);
create policy "friends send messages" on public.messages for insert to authenticated
  with check (
    auth.uid()=sender_id and exists (
      select 1 from public.friendships f where f.status='accepted'
      and ((f.requester_id=sender_id and f.addressee_id=recipient_id)
        or (f.requester_id=recipient_id and f.addressee_id=sender_id))
    )
  );

grant select,insert,update,delete on public.friendships to authenticated;
grant select,insert on public.messages to authenticated;
grant usage,select on all sequences in schema public to authenticated;
