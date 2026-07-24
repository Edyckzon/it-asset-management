# A&M Smart Hub

Sistema interno para gestión operativa de TI, RRHH, inventario, accesos y auditoría.

Versión actual: `1.3.0`

## Módulos principales

- Dashboard operativo.
- Recursos Humanos:
  - áreas;
  - empleados;
  - equipos;
  - credenciales.
- Inventario TI:
  - resumen;
  - compras;
  - activos;
  - asignaciones;
  - auditoría.
- Network:
  - usuarios Active Directory.
- Perfil, configuración y soporte interno.

## Flujo recomendado de Inventario TI

```text
Compra -> Alta de activo -> Asignación / devolución -> Auditoría
```

Más detalle en:

- [docs/inventario-ti-flujo-gestion.md](docs/inventario-ti-flujo-gestion.md)

## Versiones

Las diferencias entre versiones están documentadas en:

- [CHANGELOG.md](CHANGELOG.md)

## Stack

- Angular 20
- Tailwind CSS
- Supabase Auth
- Supabase Database
- Supabase Storage
- Excel/PDF export

## Configuración local

Este proyecto espera un archivo local ignorado por Git:

```text
src/environments/environment.ts
```

Ese archivo no debe subirse al repositorio público.

Ejemplo referencial:

```ts
export const environment = {
  production: false,
  supabaseUrl: "https://TU-PROYECTO.supabase.co",
  supabaseKey: "TU_SUPABASE_ANON_KEY",
};
```

Importante:

- La `anon key` de Supabase puede estar en frontend solo si RLS y policies están bien configuradas.
- Nunca pongas `service_role` en Angular.
- Las API keys privadas deben ir en backend o Supabase Edge Functions.
- La integración IA/Groq fue retirada del frontend en `1.3.0`; si vuelve, debe entrar por backend, no directo desde Angular.

## Scripts

Instalar dependencias:

```bash
npm install
```

Levantar desarrollo:

```bash
npm start
```

Compilar:

```bash
npm run build
```

## Migraciones Supabase

Las migraciones SQL viven en:

```text
supabase/migrations
```

Algunas migraciones son opcionales según el módulo:

- `202607240002_soporte_tickets.sql`: activa la mesa de ayuda interna.

## Seguridad operativa

El sistema incluye confirmación crítica con contraseña para acciones sensibles como bajas, eliminaciones, bloqueos y devoluciones.

Aun así, la seguridad real debe reforzarse también en Supabase:

- RLS activo;
- policies por usuario/rol;
- Storage privado;
- no exponer `service_role`;
- backups periódicos.
