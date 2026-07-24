-- Comprobantes de compras hardware en Supabase Storage.
-- Ejecutar en Supabase SQL Editor si aun no aplicaste la migracion grande.
-- No borra datos existentes.

alter table public.compras_hardware
  add column if not exists moneda varchar(3) not null default 'PEN',
  add column if not exists tipo_cambio numeric(10,4) not null default 3.7500,
  add column if not exists numero_documento varchar(80),
  add column if not exists observaciones text,
  add column if not exists comprobante_path text,
  add column if not exists comprobante_nombre text,
  add column if not exists comprobante_tipo text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'compras_hardware_moneda_chk'
  ) then
    alter table public.compras_hardware
      add constraint compras_hardware_moneda_chk check (moneda in ('USD', 'PEN'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'compras_hardware_tipo_cambio_chk'
  ) then
    alter table public.compras_hardware
      add constraint compras_hardware_tipo_cambio_chk check (tipo_cambio > 0);
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inventario-ti',
  'inventario-ti',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "inventario_ti_select_authenticated" on storage.objects;
create policy "inventario_ti_select_authenticated"
on storage.objects for select
to authenticated
using (bucket_id = 'inventario-ti');

drop policy if exists "inventario_ti_insert_authenticated" on storage.objects;
create policy "inventario_ti_insert_authenticated"
on storage.objects for insert
to authenticated
with check (bucket_id = 'inventario-ti');

drop policy if exists "inventario_ti_update_authenticated" on storage.objects;
create policy "inventario_ti_update_authenticated"
on storage.objects for update
to authenticated
using (bucket_id = 'inventario-ti')
with check (bucket_id = 'inventario-ti');

drop policy if exists "inventario_ti_delete_authenticated" on storage.objects;
create policy "inventario_ti_delete_authenticated"
on storage.objects for delete
to authenticated
using (bucket_id = 'inventario-ti');

create index if not exists idx_compras_hardware_comprobante
on public.compras_hardware(comprobante_path)
where comprobante_path is not null;
