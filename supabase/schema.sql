create table if not exists public.interview_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  storage jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.interview_progress enable row level security;

drop policy if exists "interview progress select own row" on public.interview_progress;
create policy "interview progress select own row"
on public.interview_progress
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "interview progress insert own row" on public.interview_progress;
create policy "interview progress insert own row"
on public.interview_progress
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "interview progress update own row" on public.interview_progress;
create policy "interview progress update own row"
on public.interview_progress
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update on public.interview_progress to authenticated;
