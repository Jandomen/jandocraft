-- Jandocraft — esquema de Supabase
-- Ejecuta esto en el SQL Editor de tu proyecto Supabase (o en una migración).

create table if not exists public.games (
  id text primary key,
  game jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.games enable row level security;

-- Política abierta para el guardado (v1, sin autenticación).
-- Endurece esto con auth en versiones posteriores.
create policy "allow all on games"
  on public.games
  for all
  using (true)
  with check (true);
