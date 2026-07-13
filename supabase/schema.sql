-- Esquema de la Bóveda de credenciales
-- Ejecutar en el SQL Editor de tu proyecto de Supabase

-- Perfil del usuario: guarda el salt para derivar la llave maestra
-- y la URL del avatar (ya convertido a webp).
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  master_salt text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "El usuario ve y edita solo su perfil"
  on profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Apartado 1: cuentas / correos y contraseñas (redes, correos, etc.)
-- password_ciphertext / password_iv están cifrados en el navegador
-- antes de llegar aquí: el servidor nunca ve la contraseña en claro.
create table if not exists credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  network text not null,          -- ej. "Gmail", "Instagram", "Correo personal"
  email text not null,
  password_ciphertext text not null,
  password_iv text not null,
  notes_ciphertext text,
  notes_iv text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table credentials enable row level security;

create policy "El usuario ve y edita solo sus credenciales"
  on credentials for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Apartado 2: claves de proyectos de Supabase / Vercel
create table if not exists project_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_name text not null,               -- nombre del proyecto de Supabase
  db_password_ciphertext text,
  db_password_iv text,
  anon_key_ciphertext text,
  anon_key_iv text,
  service_role_key_ciphertext text,
  service_role_key_iv text,
  extra_notes_ciphertext text,
  extra_notes_iv text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table project_keys enable row level security;

create policy "El usuario ve y edita solo sus llaves de proyecto"
  on project_keys for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Al crear una cuenta nueva, se genera automáticamente su salt y su
-- fila de perfil (necesaria para poder derivar la llave maestra).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, master_salt)
  values (new.id, encode(gen_random_bytes(16), 'base64'));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Bucket de Storage para avatares (crear desde el dashboard o aquí)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Cada usuario sube su propio avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Los avatares son públicos para lectura"
  on storage.objects for select
  using (bucket_id = 'avatars');
