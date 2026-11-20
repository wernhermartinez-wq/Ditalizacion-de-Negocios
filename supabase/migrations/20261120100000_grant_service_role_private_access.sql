-- Las funciones de Entity Audit que se ejecutan con la clave de servidor (p. ej.
-- ensure_entity_audit_case, llamada desde el webhook de Stripe) evalúan
-- private.is_platform_admin() aunque el rol sea service_role. Sin acceso al
-- esquema private y a esa función fallan con "permission denied for schema private".
grant usage on schema private to service_role;
grant execute on function private.is_platform_admin() to service_role;
