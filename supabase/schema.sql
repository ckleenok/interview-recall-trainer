create table if not exists public.interview_shared_progress (
  id text primary key,
  storage jsonb not null,
  updated_at timestamptz not null default now(),
  constraint interview_shared_progress_singleton check (id = 'global')
);

alter table public.interview_shared_progress enable row level security;

drop policy if exists "shared progress select global" on public.interview_shared_progress;
create policy "shared progress select global"
on public.interview_shared_progress
for select
to anon, authenticated
using (id = 'global');

drop policy if exists "shared progress insert global" on public.interview_shared_progress;
create policy "shared progress insert global"
on public.interview_shared_progress
for insert
to anon, authenticated
with check (id = 'global');

drop policy if exists "shared progress update global" on public.interview_shared_progress;
create policy "shared progress update global"
on public.interview_shared_progress
for update
to anon, authenticated
using (id = 'global')
with check (id = 'global');

grant select, insert, update on public.interview_shared_progress to anon, authenticated;
