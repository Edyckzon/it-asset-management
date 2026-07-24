-- Mesa de ayuda interna del sistema.
-- Es additive: no borra ni modifica data existente.

create table if not exists public.soporte_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  modulo varchar not null,
  categoria varchar not null,
  prioridad varchar not null default 'Media',
  asunto varchar not null,
  detalle text not null,
  estado varchar not null default 'Abierto',
  respuesta text,
  asignado_a uuid references auth.users(id) on delete set null,
  fecha_creacion timestamp with time zone not null default now(),
  fecha_actualizacion timestamp with time zone not null default now(),
  fecha_cierre timestamp with time zone
);

create index if not exists idx_soporte_tickets_user_id on public.soporte_tickets(user_id);
create index if not exists idx_soporte_tickets_estado on public.soporte_tickets(estado);
create index if not exists idx_soporte_tickets_modulo on public.soporte_tickets(modulo);
create index if not exists idx_soporte_tickets_fecha_creacion on public.soporte_tickets(fecha_creacion desc);

alter table public.soporte_tickets enable row level security;

drop policy if exists "Usuarios autenticados crean tickets" on public.soporte_tickets;
create policy "Usuarios autenticados crean tickets"
on public.soporte_tickets
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Usuarios ven sus tickets" on public.soporte_tickets;
create policy "Usuarios ven sus tickets"
on public.soporte_tickets
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Usuarios actualizan sus tickets abiertos" on public.soporte_tickets;
create policy "Usuarios actualizan sus tickets abiertos"
on public.soporte_tickets
for update
to authenticated
using (user_id = auth.uid() and estado <> 'Cerrado')
with check (user_id = auth.uid());

create or replace function public.set_fecha_actualizacion_soporte()
returns trigger
language plpgsql
as $$
begin
  new.fecha_actualizacion = now();
  if new.estado = 'Cerrado' and old.estado is distinct from 'Cerrado' then
    new.fecha_cierre = now();
  end if;
  return new;
end;
$$;

drop trigger if exists tr_set_fecha_actualizacion_soporte on public.soporte_tickets;
create trigger tr_set_fecha_actualizacion_soporte
before update on public.soporte_tickets
for each row
execute function public.set_fecha_actualizacion_soporte();
