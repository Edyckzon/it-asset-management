# Inventario TI - flujo de gestión

## Cambio aplicado sin tocar datos

Esta mejora no requiere ejecutar SQL en Supabase. Solo agrega una pantalla de lectura llamada `Resumen` y reordena el menú del módulo para que el trabajo siga el flujo real:

1. Compra
2. Alta de activo
3. Asignación / devolución
4. Auditoría

## Nuevo menú recomendado

```text
Inventario TI
├─ Resumen
├─ Compras
├─ Activos
├─ Asignaciones
└─ Auditoría
```

## Flujo operativo

### 1. Compras

Aquí se registra la adquisición:

- proveedor;
- fecha;
- tipo de producto;
- marca/modelo;
- cantidad;
- moneda;
- tipo de cambio;
- número de documento;
- comprobante opcional.

La compra es el origen financiero y documental.

### 2. Activos

Aquí se convierte la compra en activos inventariables:

- código de inventario;
- tipo de activo;
- serie;
- nombre de equipo;
- MAC/IP;
- ubicación;
- garantía;
- estado;
- empleado actual;
- compra origen.

El activo es el centro operativo del módulo.

### 3. Asignaciones

Aquí se controla la entrega y devolución:

- empleado;
- activo;
- fecha de entrega;
- notas;
- devolución.

Una devolución cambia el activo a disponible y deja trazabilidad.

### 4. Auditoría

Aquí se revisa qué pasó:

- creación;
- actualización;
- eliminación;
- devolución;
- bloqueo;
- baja/reactivación.

La auditoría no reemplaza backups ni RLS, pero ayuda a control interno.

## Indicadores del nuevo Resumen

El resumen muestra:

- activos totales;
- activos asignados;
- activos disponibles;
- compras registradas;
- compras con/sin comprobante;
- inversión referencial en USD y PEN;
- asignaciones activas;
- activos sin compra origen;
- garantías próximas a vencer;
- últimos movimientos de auditoría.

## Siguiente etapa recomendada con SQL

No se ejecutó esta parte todavía. Para subir el módulo a nivel más completo, conviene agregar una tabla de mantenimiento/incidencias:

```sql
create table if not exists mantenimientos_ti (
  id uuid primary key default gen_random_uuid(),
  activo_id uuid not null references activos_ti(id) on delete restrict,
  fecha_inicio date not null default current_date,
  fecha_fin date,
  tipo varchar not null default 'Correctivo',
  estado varchar not null default 'Pendiente',
  proveedor varchar,
  costo numeric default 0,
  moneda varchar default 'PEN',
  tipo_cambio numeric default 1,
  diagnostico text,
  solucion text,
  comprobante_path text,
  creado_por uuid references auth.users(id),
  fecha_creacion timestamp with time zone default now()
);

create index if not exists idx_mantenimientos_ti_activo_id on mantenimientos_ti(activo_id);
create index if not exists idx_mantenimientos_ti_estado on mantenimientos_ti(estado);
```

También conviene tener RLS/policies antes de dejar el repo o app pública.
