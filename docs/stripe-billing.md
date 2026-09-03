# Stripe Billing con Managed Payments

La integración usa Checkout Sessions alojado por Stripe en modo `subscription`. No existe un Payment Link estático y ninguna clave privada llega al navegador.

## Estado de despliegue

La aplicación usa **modo test** por defecto. La producción solo se habilita si coinciden cuatro controles: `STRIPE_ENVIRONMENT=production`, una clave `sk_live_` o `rk_live_`, el Price ID productivo exacto y `STRIPE_PRODUCTION_ENABLED=true`.

El Price ID previsto para producción es `price_1UBVm4IqsrQ2sW9YgMZpvgp3` (95 EUR/mes) y el servidor exige esa coincidencia exacta antes de aceptar una clave live. En la cuenta test de Nexaro se creó el precio recurrente mensual de 95 EUR `price_1UBeUOIEkcjBfEPvjPJu5pg5`, que debe configurarse como `STRIPE_TEST_PRICE_ID`.

## Variables de servidor

```dotenv
STRIPE_ENVIRONMENT=test
STRIPE_API_KEY=rk_test_...
STRIPE_TEST_PRICE_ID=price_1UBeUOIEkcjBfEPvjPJu5pg5
STRIPE_PRODUCTION_PRICE_ID=price_1UBVm4IqsrQ2sW9YgMZpvgp3
STRIPE_WEBHOOK_SECRET=whsec_...
APP_URL=http://localhost:3000
STRIPE_PRODUCTION_ENABLED=false
STRIPE_BILLING_ENFORCEMENT_ENABLED=false
```

- Se recomienda una restricted key con permisos mínimos para Checkout Sessions, Subscriptions, Invoices, Customers y Billing Portal Sessions.
- Ninguna variable Stripe usa el prefijo `NEXT_PUBLIC_`.
- `STRIPE_BILLING_ENFORCEMENT_ENABLED` debe seguir en `false` hasta validar el ciclo completo. En `true`, el proxy solo permite entrar al resto de `/app` cuando `stripe_subscriptions.access_enabled` ha sido activado por un webhook.

## Regla del día 15

- Antes o después del día 15, el servidor calcula el próximo día 15 a las 00:00 en `Europe/Berlin` y lo envía como `subscription_data.billing_cycle_anchor`.
- `subscription_data.proration_behavior` es `none`, por lo que el periodo inicial no se cobra y el primer recibo contiene 95 EUR completos en el ancla.
- Durante el propio día 15 de Berlín no se aplaza la suscripción: Checkout cobra de inmediato y el intervalo mensual conserva el día 15.
- No se configura `trial_end` ni `trial_period_days`.
- `payment_method_collection` es `always`, para guardar un método válido aunque Checkout no cobre antes del ancla.

Managed Payments se habilita con `managed_payments.enabled: true`. La solicitud no envía `automatic_tax`, `tax_id_collection` ni `payment_method_types`.

## Webhook

Endpoint: `POST /api/stripe/webhooks`

Eventos requeridos en el endpoint de test:

- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

El endpoint lee el cuerpo sin transformar y valida `Stripe-Signature` con `STRIPE_WEBHOOK_SECRET` antes de procesar cualquier dato. `stripe_webhook_events` aporta idempotencia y conserva solo metadatos operativos, no el payload. `stripe_subscriptions` guarda customer ID, subscription ID, estado, próximo cobro, Price ID y el indicador de acceso.

La página de éxito no concede acceso. `checkout.session.completed` lo activa; un fallo de factura o una cancelación lo suspende. Los cambios posteriores de suscripción vuelven a sincronizar el estado. El Customer Portal permite cancelar o actualizar la forma de pago.

Para pruebas locales se puede usar Stripe CLI:

```powershell
stripe listen --forward-to localhost:3000/api/stripe/webhooks
```

Copiar el `whsec_...` que devuelve el comando. Crear además una configuración de Customer Portal en el Dashboard de test con cancelación habilitada.

## Lista de validación previa a producción

1. Aplicar la migración `20260903172414_create_stripe_subscriptions.sql` en Supabase de test.
2. Validar alta antes del 15: Checkout muestra 0 EUR hoy, recoge método de pago y fija el siguiente 15.
3. Validar alta durante el día 15: cobra 95 EUR inmediatamente.
4. Confirmar que la página de éxito por sí sola no cambia el acceso.
5. Reenviar eventos duplicados y comprobar que no duplican cambios.
6. Simular `invoice.paid`, `invoice.payment_failed`, actualización y cancelación.
7. Comprobar Customer Portal y la vuelta a `/app/facturacion`.
8. Activar temporalmente el enforcement en test y verificar concesión y suspensión reales.
9. Revisar en Stripe el cálculo fiscal y los métodos habilitados por Managed Payments.
10. Ejecutar lint, typecheck, tests y build.

## Configuración productiva

Una vez completada la lista, configurar en el entorno Production de Vercel:

```dotenv
STRIPE_ENVIRONMENT=production
STRIPE_API_KEY=rk_live_...
STRIPE_PRODUCTION_PRICE_ID=price_1UBVm4IqsrQ2sW9YgMZpvgp3
STRIPE_WEBHOOK_SECRET=whsec_... # secreto del endpoint live
APP_URL=https://empresas.nexaro-ia.com
STRIPE_PRODUCTION_ENABLED=true
STRIPE_BILLING_ENFORCEMENT_ENABLED=true
```

El endpoint live debe apuntar a `https://empresas.nexaro-ia.com/api/stripe/webhooks`. Nunca se deben reutilizar la clave ni el secreto del webhook de test.
