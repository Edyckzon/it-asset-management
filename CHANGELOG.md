# Changelog

Todas las diferencias importantes del sistema se documentan aquí.

Formato basado en versionado semántico: `MAJOR.MINOR.PATCH`.

## [1.3.0] - 2026-07-24

### Enfoque

Versión de mejora funcional sobre la base `1.2.1`. Incluye gestión TI más madura, seguridad operativa, visor interno de archivos y mejores flujos de usuario.

### Agregado

- Módulo `Inventario TI > Resumen` como entrada ejecutiva del flujo.
- Nuevo flujo visual: `Compra -> Activo -> Asignación -> Auditoría`.
- Visor interno de comprobantes en modal:
  - imágenes embebidas dentro del sistema;
  - PDFs embebidos;
  - acciones de descargar, abrir externo y cerrar.
- Confirmación crítica con contraseña para acciones sensibles:
  - eliminar credenciales;
  - eliminar comprobantes;
  - eliminar equipos;
  - baja/reactivación de empleados;
  - bloqueo/activación de cuentas AD;
  - devolución de equipos asignados.
- Validación de ciclo de vida de empleados:
  - empleados inactivos no aparecen en nuevas asignaciones, credenciales, AD, activos ni equipos;
  - no se puede inactivar un empleado con PC, AD, credenciales o equipo pendiente.
- Migración opcional de guardas BD para impedir asignaciones a empleados inactivos desde Supabase API.
- Combos buscables reutilizables para mejorar selección de empleados, áreas, compras y activos.
- Pantallas reales para:
  - Perfil;
  - Configuración;
  - Soporte.
- Preferencias locales:
  - tema claro/oscuro;
  - moneda por defecto;
  - tipo de cambio referencial;
  - filas por página;
  - modo compacto.
- Migración opcional `soporte_tickets` para mesa de ayuda interna.
- Documentación del flujo de Inventario TI en `docs/inventario-ti-flujo-gestion.md`.

### Cambiado

- Menú de Inventario TI reorganizado:
  - Resumen;
  - Compras;
  - Activos;
  - Asignaciones;
  - Auditoría.
- `Historial Mov.` fue renombrado a `Auditoría`.
- Barras de filtros/exportación más simétricas en módulos clave.
- Compras Hardware contempla moneda, tipo de cambio, comprobantes opcionales y edición más completa.
- Dashboard muestra inversión en USD y PEN.
- Dropdown de usuario dejó de ser decorativo: cada opción tiene una ruta real.
- `README.md` ahora describe el sistema A&M Smart Hub y no la plantilla TailAdmin.

### Corregido

- Se evita abrir comprobantes en otra pestaña como comportamiento principal.
- Se corrigió el botón partido `Nueva compra`.
- Se eliminó un `console.log` que imprimía contraseña en el signup de plantilla.
- Se corrigieron consultas que intentaban leer columnas aún no existentes en Supabase.

### Seguridad

- Las acciones críticas requieren revalidar contraseña contra Supabase Auth.
- El repo ignora `src/environments/*`, `.env*`, dumps, backups, certificados y exports sensibles.
- Se recomienda mantener RLS activo en Supabase y no exponer `service_role`.
- Se recomienda mover claves privadas de IA/API a backend o Supabase Edge Functions.
- Se retiró Groq/IA del frontend para evitar publicar o depender de API keys privadas en Angular.

## [1.2.1] - 2026-07-24

### Enfoque

Versión base previa a la reorganización funcional de `1.3.0`.

### Estado

- Header mostraba `Beta v1.2.1`.
- Sistema ya contaba con módulos operativos principales.
- Base usada como punto de partida para las mejoras de gestión, seguridad y UX.

## [1.2.0] - 2026-07-23

### Enfoque

Primera versión funcional extendida del sistema operativo interno.

### Agregado

- CRUD base para:
  - áreas;
  - empleados;
  - equipos;
  - credenciales;
  - compras hardware;
  - activos TI;
  - asignaciones;
  - usuarios Active Directory.
- Exportación a Excel/PDF.
- Auditoría básica con `historial_movimientos`.
- Triggers de auditoría en Supabase.
- Storage para comprobantes de compras.

### Limitaciones conocidas

- Algunas pantallas todavía tenían filtros básicos o inconsistentes.
- Algunas acciones sensibles usaban confirmación simple.
- El flujo de Inventario TI estaba dividido por tablas, no por proceso de gestión.

## [1.1.0] - 2026-07-22

### Enfoque

Adaptación inicial de plantilla a sistema A&M Smart Hub.

### Agregado

- Layout autenticado.
- Sidebar principal por módulos.
- Integración inicial con Supabase.
- Login con Supabase Auth.
- Primer dashboard operativo.

## [1.0.0] - 2026-07-21

### Enfoque

Base inicial del proyecto.

### Agregado

- Proyecto Angular 20.
- Tailwind CSS.
- Base visual TailAdmin.
- Estructura inicial de rutas, componentes y servicios.
