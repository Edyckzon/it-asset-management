-- Guardas de ciclo de vida de empleados.
-- Objetivo: impedir nuevas asignaciones/accesos/equipos sobre empleados inactivos.
-- Es additive: no borra ni modifica registros existentes.

create or replace function public.empleado_esta_activo(p_empleado_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.empleados e
    where e.id = p_empleado_id
      and coalesce(e.estado, false) = true
  );
$$;

create or replace function public.assert_empleado_activo(p_empleado_id uuid, p_contexto text)
returns void
language plpgsql
as $$
begin
  if p_empleado_id is null then
    return;
  end if;

  if not public.empleado_esta_activo(p_empleado_id) then
    raise exception 'No se puede %: el empleado está inactivo o no existe', p_contexto
      using errcode = '23514';
  end if;
end;
$$;

create or replace function public.trg_guard_asignacion_empleado_activo()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_empleado_activo(new.empleado_id, 'crear o actualizar una asignación');
  return new;
end;
$$;

drop trigger if exists tr_guard_asignacion_empleado_activo on public.asignaciones;
create trigger tr_guard_asignacion_empleado_activo
before insert or update of empleado_id on public.asignaciones
for each row
execute function public.trg_guard_asignacion_empleado_activo();

create or replace function public.trg_guard_credencial_empleado_activo()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_empleado_activo(new.empleado_id, 'crear o actualizar una credencial');
  return new;
end;
$$;

drop trigger if exists tr_guard_credencial_empleado_activo on public.credenciales;
create trigger tr_guard_credencial_empleado_activo
before insert or update of empleado_id on public.credenciales
for each row
execute function public.trg_guard_credencial_empleado_activo();

create or replace function public.trg_guard_usuario_ad_empleado_activo()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_empleado_activo(new.empleado_id, 'crear o actualizar una cuenta AD');
  return new;
end;
$$;

drop trigger if exists tr_guard_usuario_ad_empleado_activo on public.usuarios_ad;
create trigger tr_guard_usuario_ad_empleado_activo
before insert or update of empleado_id on public.usuarios_ad
for each row
execute function public.trg_guard_usuario_ad_empleado_activo();

create or replace function public.trg_guard_activo_empleado_activo()
returns trigger
language plpgsql
as $$
begin
  if new.empleado_id is not null and coalesce(new.estado, '') <> 'Baja' then
    perform public.assert_empleado_activo(new.empleado_id, 'asignar un activo');
  end if;
  return new;
end;
$$;

drop trigger if exists tr_guard_activo_empleado_activo on public.activos_ti;
create trigger tr_guard_activo_empleado_activo
before insert or update of empleado_id, estado on public.activos_ti
for each row
execute function public.trg_guard_activo_empleado_activo();

create or replace function public.trg_guard_lider_equipo_activo()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_empleado_activo(new.lider_id, 'asignar líder de equipo');
  return new;
end;
$$;

drop trigger if exists tr_guard_lider_equipo_activo on public.equipos;
create trigger tr_guard_lider_equipo_activo
before insert or update of lider_id on public.equipos
for each row
execute function public.trg_guard_lider_equipo_activo();

create or replace function public.trg_guard_baja_empleado_con_dependencias()
returns trigger
language plpgsql
as $$
declare
  v_count integer;
begin
  if old.estado = true and new.estado = false then
    select count(*) into v_count
    from public.activos_ti a
    where a.empleado_id = new.id
      and coalesce(a.estado, '') <> 'Baja';
    if v_count > 0 then
      raise exception 'No se puede inactivar: el empleado tiene activos TI asignados'
        using errcode = '23514';
    end if;

    select count(*) into v_count
    from public.usuarios_ad u
    where u.empleado_id = new.id
      and coalesce(u.estado_cuenta, false) = true;
    if v_count > 0 then
      raise exception 'No se puede inactivar: el empleado tiene cuenta AD activa'
        using errcode = '23514';
    end if;

    select count(*) into v_count
    from public.credenciales c
    where c.empleado_id = new.id;
    if v_count > 0 then
      raise exception 'No se puede inactivar: el empleado tiene credenciales registradas'
        using errcode = '23514';
    end if;

    select count(*) into v_count
    from public.equipos eq
    where eq.lider_id = new.id;
    if v_count > 0 then
      raise exception 'No se puede inactivar: el empleado lidera un equipo'
        using errcode = '23514';
    end if;

    if new.equipo_id is not null then
      raise exception 'No se puede inactivar: el empleado pertenece a un equipo'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_guard_baja_empleado_con_dependencias on public.empleados;
create trigger tr_guard_baja_empleado_con_dependencias
before update of estado on public.empleados
for each row
execute function public.trg_guard_baja_empleado_con_dependencias();
