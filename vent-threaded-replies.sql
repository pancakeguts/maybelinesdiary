-- Run this once in the Supabase SQL Editor before uploading the updated Vent files.
alter table public.replies
  add column if not exists parent_reply_id bigint
  references public.replies(id) on delete set null;

create index if not exists replies_parent_reply_id_idx
  on public.replies(parent_reply_id);
