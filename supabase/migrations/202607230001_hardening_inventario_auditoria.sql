-- Mejora incremental para inventario, compras y auditoria.
-- Ejecutar en Supabase SQL Editor. No borra datos existentes.

create extension if not exists pgcrypto;

alter table public.compras_hardware
  add column if not exists moneda varchar(3) not null default 'PEN',
  add column if not exists tipo_cambio numeric(10,4) not null default 3.7500,
  add column if not exists numero_documento varchar(80),
  add column if not exists observaciones text,
  add column if not exists comprobante_path text,
  add column if not exists comprobante_nombre text,
  add column if not exists comprobante_tipo text,
  add column if not exists total numeric(14,2)
    generated always as (cantidad * precio_unitario) stored,
  add column if not exists total_pen numeric(14,2)
    generated always as (
      case
        when moneda = 'PEN' then cantidad * precio_unitario
        else cantidad * precio_unitario * tipo_cambio
      end
    ) stored,
  add column if not exists total_usd numeric(14,2)
    generated always as (
      case
        when moneda = 'USD' then cantidad * precio_unitario
        when tipo_cambio > 0 then cantidad * precio_unitario / tipo_cambio
        else 0
      end
    ) stored;

alter table public.activos_ti
  add column if not exists ubicacion varchar(120),
  add column if not exists fecha_garantia_fin date,
  add column if not exists observaciones text;

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

  if not exists (
    select 1 from pg_constraint where conname = 'activos_ti_estado_chk'
  ) then
    alter table public.activos_ti
      add constraint activos_ti_estado_chk
      check (estado in ('Disponible', 'Asignado', 'En Reparacion', 'Baja'));
  end if;
end $$;

create index if not exists idx_compras_hardware_fecha on public.compras_hardware(fecha_compra desc);
create index if not exists idx_compras_hardware_proveedor on public.compras_hardware(proveedor);
create index if not exists idx_compras_hardware_comprobante on public.compras_hardware(comprobante_path)
  where comprobante_path is not null;
create index if not exists idx_activos_ti_codigo on public.activos_ti(codigo_inventario);
create index if not exists idx_activos_ti_estado on public.activos_ti(estado);
create index if not exists idx_activos_ti_empleado on public.activos_ti(empleado_id);
create index if not exists idx_asignaciones_activo_activa
  on public.asignaciones(activo_id)
  where fecha_devolucion is null;

alter table public.historial_movimientos
  add column if not exists tabla text,
  add column if not exists operacion text,
  add column if not exists datos_anteriores jsonb,
  add column if not exists datos_nuevos jsonb,
  add column if not exists creado_en timestamptz not null default now();

create index if not exists idx_historial_fecha on public.historial_movimientos(fecha desc);
create index if not exists idx_historial_modulo_registro on public.historial_movimientos(modulo, registro_id);

create or replace function public.funcion_auditoria_erp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registro_id uuid;
  v_detalle text;
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if tg_op = 'INSERT' then
    v_registro_id := new.id;
    v_detalle := 'Registro creado en ' || tg_table_name;
    insert into public.historial_movimientos (
      modulo, tabla, registro_id, accion, operacion, detalle, datos_nuevos, user_id
    )
    values (
      tg_table_name, tg_table_name, v_registro_id, 'CREACION', tg_op, v_detalle, to_jsonb(new), v_user_id
    );
    return new;
  elsif tg_op = 'UPDATE' then
    v_registro_id := new.id;
    v_detalle := 'Registro actualizado en ' || tg_table_name;
    insert into public.historial_movimientos (
      modulo, tabla, registro_id, accion, operacion, detalle, datos_anteriores, datos_nuevos, user_id
    )
    values (
      tg_table_name, tg_table_name, v_registro_id, 'ACTUALIZACION', tg_op, v_detalle, to_jsonb(old), to_jsonb(new), v_user_id
    );
    return new;
  elsif tg_op = 'DELETE' then
    v_registro_id := old.id;
    v_detalle := 'Registro eliminado en ' || tg_table_name;
    insert into public.historial_movimientos (
      modulo, tabla, registro_id, accion, operacion, detalle, datos_anteriores, user_id
    )
    values (
      tg_table_name, tg_table_name, v_registro_id, 'ELIMINACION', tg_op, v_detalle, to_jsonb(old), v_user_id
    );
    return old;
  end if;

  return null;
end;
$$;

create or replace function public.limpiar_historial_antiguo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.historial_movimientos
  where id in (
    select id
    from public.historial_movimientos
    where coalesce(fecha, creado_en) < now() - interval '180 days'
    order by coalesce(fecha, creado_en) asc
  );

  delete from public.historial_movimientos
  where id in (
    select id
    from (
      select id,
             row_number() over (order by coalesce(fecha, creado_en) desc) as rn
      from public.historial_movimientos
    ) h
    where h.rn > 5000
  );

  return null;
end;
$$;

drop trigger if exists trigger_limpieza_historial on public.historial_movimientos;
create trigger trigger_limpieza_historial
after insert on public.historial_movimientos
for each statement
execute function public.limpiar_historial_antiguo();

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

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'activos_ti',
    'areas',
    'asignaciones',
    'compras_hardware',
    'credenciales',
    'empleados',
    'equipos',
    'usuarios_ad'
  ]
  loop
    if to_regclass('public.' || v_table) is not null then
      execute format('drop trigger if exists %I on public.%I', 'tr_auditoria_' || v_table, v_table);
      execute format(
        'create trigger %I after insert or update or delete on public.%I for each row execute function public.funcion_auditoria_erp()',
        'tr_auditoria_' || v_table,
        v_table
      );
    end if;
  end loop;
end $$;

create or replace function public.asignar_activo(
  p_empleado_id uuid,
  p_activo_id uuid,
  p_notas text default null
)
returns public.asignaciones
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asignacion public.asignaciones;
begin
  if exists (
    select 1 from public.asignaciones
    where activo_id = p_activo_id and fecha_devolucion is null
  ) then
    raise exception 'El activo ya tiene una asignacion activa';
  end if;

  insert into public.asignaciones (empleado_id, activo_id, notas)
  values (p_empleado_id, p_activo_id, p_notas)
  returning * into v_asignacion;

  update public.activos_ti
  set estado = 'Asignado', empleado_id = p_empleado_id
  where id = p_activo_id;

  return v_asignacion;
end;
$$;

create or replace function public.devolver_activo(
  p_asignacion_id uuid
)
returns public.asignaciones
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asignacion public.asignaciones;
begin
  update public.asignaciones
  set fecha_devolucion = current_date
  where id = p_asignacion_id and fecha_devolucion is null
  returning * into v_asignacion;

  if v_asignacion.id is null then
    raise exception 'La asignacion no existe o ya fue devuelta';
  end if;

  update public.activos_ti
  set estado = 'Disponible', empleado_id = null
  where id = v_asignacion.activo_id;

  return v_asignacion;
end;
$$;
