-- Jandocraft — crea la tabla de guardados `games`.
-- Ejecuta este archivo en el SQL Editor de tu proyecto Supabase (o aplícalo como
-- migración). Es idempotente, de modo que es seguro ejecutarlo aunque ya exista.

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
