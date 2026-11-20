# Entity Audit — Informe de implementación de la Entrega 1

Fecha: 18 de octubre de 2026.

## Resultado

Se implementó en el dashboard existente el expediente Entity Audit y la identidad comercial versionada. No se modificaron las seis fases, la etapa 7, el progreso de tareas ni el motor de visibilidad. No se integraron Radar, CRM, proveedores externos ni ejecuciones de auditoría.

## Activación e idempotencia

- La activación automática ocurre cuando Stripe confirma acceso efectivo al acompañamiento (`access_enabled = true`).
- Nexaro dispone además de una activación administrativa explícita para restaurantes gestionados manualmente.
- El registro simple de una organización no crea el expediente.
- La restricción única por `organization_id` y la recuperación posterior del registro hacen idempotente la creación.
- El borrador inicial tiene versión 1 y también está protegido frente a duplicados.

## Modelo y seguridad

La migración `supabase/migrations/20261017190050_create_entity_audit_identity_core.sql` crea:

- `entity_audit_cases`: expediente único y estado de preparación.
- `entity_identity_versions`: versiones de identidad, borradores y validaciones.
- `entity_sources`: fuentes externas o declaradas, sólo para Nexaro.
- `entity_observations`: hallazgos y notas internas, sólo para Nexaro.

Las versiones validadas no pueden editarse ni eliminarse. La corrección de una identidad requiere crear una nueva versión. El expediente conserva el identificador exacto de su versión oficial vigente y las futuras campañas podrán referenciar ese identificador.

Las políticas RLS permiten al restaurante leer su expediente y únicamente la versión de identidad con estado `validated`. No existe ninguna política que permita a un cliente consultar fuentes u observaciones internas. Todas las escrituras están reservadas a administradores de Nexaro.

La función `validate_entity_identity_version` valida de forma atómica el borrador, conserva como `superseded` la versión anterior y actualiza la identidad vigente del expediente. La auditoría inicial queda bloqueada conceptualmente por el estado `identity_pending`; sólo una identidad validada cambia el expediente a `ready`.

## Interfaz

- Nueva entrada Entity Audit dentro del expediente administrativo del restaurante.
- Activación administrativa explícita.
- Edición del borrador de identidad.
- Registro diferenciado de datos declarados y observados, con fuente y nota interna.
- Validación exclusiva de Nexaro.
- Historial de versiones y creación de una nueva versión desde la vigente.
- Sección de solo lectura en «Mi restaurante» que aparece únicamente cuando existe identidad validada.

## Archivos principales

- `src/lib/entity-audit-core.ts`
- `src/lib/entity-audit.ts`
- `src/lib/entity-audit.test.ts`
- `src/lib/stripe/webhooks.ts`
- `src/app/admin/empresas/[organizationId]/entity-audit/page.tsx`
- `src/app/admin/empresas/[organizationId]/entity-audit/actions.ts`
- `src/app/admin/empresas/[organizationId]/page.tsx`
- `src/app/app/perfil/page.tsx`
- `src/lib/supabase/database.types.ts`
- `src/app/admin/admin.css`
- `src/app/app/app.css`
- `supabase/tests/entity_audit_rls.sql`
- `docs/ENTITY_AUDIT_ENTREGA_2.md`

## Verificaciones realizadas

- `npm run typecheck`: correcto.
- `npm run lint`: correcto, sin advertencias.
- `npm test -- --run`: 14 archivos y 46 pruebas correctas.
- `npx next build --webpack`: compilación de producción correcta.
- `npm run build` con Turbopack: no concluye por un fallo interno de creación de proceso en Windows. La compilación equivalente con Webpack, soportada oficialmente por Next.js 16, sí concluye.
- `supabase test db`: no ejecutado porque Docker Desktop y la instancia local de Supabase no están activos. El archivo pgTAP queda preparado para ejecutarse antes de aplicar la migración.

## Riesgos y pasos pendientes

1. Ejecutar la migración y `supabase test db` en una instancia local o de previsualización antes de producción.
2. Revisar los asesores de seguridad y rendimiento de Supabase después de aplicar la migración en esa instancia.
3. No desplegar ni aplicar la migración remota hasta recibir autorización independiente.
4. La Entrega 2 deberá versionar por separado preguntas estándar y personalizadas y hacer que cada campaña referencie la versión exacta de identidad utilizada; se detalla en `docs/ENTITY_AUDIT_ENTREGA_2.md`.
