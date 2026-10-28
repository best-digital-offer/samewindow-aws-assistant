create extension if not exists pgcrypto;

create table if not exists public.aws_investigations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service text not null,
  title text not null,
  severity text not null check (severity in ('low','medium','high')),
  error_summary text not null,
  diagnosis text,
  resolution_steps jsonb not null default '[]'::jsonb,
  cloud_shared boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists aws_investigations_user_created_idx on public.aws_investigations(user_id, created_at desc);
alter table public.aws_investigations enable row level security;

drop policy if exists "Users can read their own AWS investigations" on public.aws_investigations;
create policy "Users can read their own AWS investigations" on public.aws_investigations for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can insert their own AWS investigations" on public.aws_investigations;
create policy "Users can insert their own AWS investigations" on public.aws_investigations for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own AWS investigations" on public.aws_investigations;
create policy "Users can delete their own AWS investigations" on public.aws_investigations for delete to authenticated using (auth.uid() = user_id);
