# Visibilidad SEO e IA — operación

## Variables de entorno

Configurar en Vercel solo las claves necesarias. Ninguna debe usar el prefijo `NEXT_PUBLIC_`:

- `SUPABASE_SECRET_KEY` (recomendada) o `SUPABASE_SERVICE_ROLE_KEY` (compatibilidad).
- `OPENAI_API_KEY` y, opcionalmente, `OPENAI_VISIBILITY_MODEL`.
- `GEMINI_API_KEY` y, opcionalmente, `GEMINI_VISIBILITY_MODEL`.
- `PERPLEXITY_API_KEY` y, opcionalmente, `PERPLEXITY_VISIBILITY_MODEL`.
- `VISIBILITY_JOB_SECRET` para proteger la ejecución programada.

## Ejecución semanal

`POST /api/visibility/jobs` con `x-visibility-secret`, `projectId` y una `idempotencyKey` estable para esa semana. El mismo proyecto y clave nunca crean dos ejecuciones.

```json
{
  "projectId": "UUID_DEL_PROYECTO",
  "idempotencyKey": "weekly-2026-W36",
  "providers": ["openai", "gemini", "perplexity"]
}
```

La clave de idempotencia debe conservarse cuando n8n reintente la misma ejecución.

## Google Search Console

La estructura de proyecto incluye estado y propiedad de Search Console. Para activar OAuth faltan estas acciones externas:

1. Habilitar Search Console API en Google Cloud.
2. Crear credenciales OAuth Web y registrar la URL de retorno de producción.
3. Añadir `GOOGLE_SEARCH_CONSOLE_CLIENT_ID`, `GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET` y `GOOGLE_SEARCH_CONSOLE_REDIRECT_URI` en Vercel.
4. Implementar el intercambio y almacenamiento cifrado del refresh token antes de marcar una propiedad como conectada.

El alcance previsto es `https://www.googleapis.com/auth/webmasters.readonly`.

## Informe

La pestaña Informe ofrece una vista preparada para imprimir. En el navegador puede elegirse “Guardar como PDF”; no se introduce un generador PDF paralelo.

## Conservación y eliminación

Las respuestas originales, citas, métricas y consumo se conservan para mantener la trazabilidad histórica. La eliminación de una organización propaga el borrado a su proyecto mediante claves foráneas. Antes de automatizar una política temporal de purga, Nexaro debe definir el plazo contractual y fiscal aplicable; el MVP no elimina históricos automáticamente.
