# NEXARO — Plataforma de madurez digital

Portal responsive para autónomos y pymes construido con Next.js y Supabase. Centraliza el diagnóstico de madurez digital, su validación por Nexaro, la hoja de ruta resultante y el seguimiento del trabajo realizado para cada empresa.

La aplicación utiliza únicamente datos persistidos. Cuando un módulo todavía no dispone de información o no forma parte del alcance actual, muestra un estado vacío explícito en lugar de datos simulados.

## Estado funcional

### Disponible

- Autenticación mediante Supabase: registro, acceso, recuperación y actualización de contraseña.
- Organizaciones, perfiles empresariales y membresía del propietario.
- Área privada `/app` para la empresa activa.
- Panel global `/admin`, protegido por un rol de administrador de plataforma independiente de las organizaciones.
- Diagnóstico digital en seis dimensiones con respuestas condicionales y soporte para dimensiones «Sin evaluar».
- Resultado provisional, revisión administrativa y validación del diagnóstico.
- Snapshots inmutables de puntuación y hoja de ruta una vez validado el diagnóstico.
- Hoja de ruta y seguimiento de tareas del cliente y de Nexaro.
- Historial de actuaciones y entregables realizados por Nexaro.
- Inventario de herramientas con costes, responsables, criticidad y conexiones.
- Evolución histórica basada exclusivamente en diagnósticos validados.
- Catálogo formativo, recomendaciones por brecha e itinerario con seguimiento de progreso.
- Módulo adicional de visibilidad SEO/IA, preparado para proveedores externos y ejecución programada.

### Pendiente o pospuesto

- Invitaciones, colaboración multiusuario y selector de empresa. Para el MVP, cada empresa tiene un único usuario propietario.
- Activación productiva de Visibilidad SEO/IA, sujeta a límites de coste y configuración de proveedores.
- OAuth y sincronización efectiva con Google Search Console.

Las decisiones de alcance y arquitectura se mantienen en [`decisiones-arquitectura.md`](./decisiones-arquitectura.md).

## Tecnología

- Next.js 16 con App Router y Turbopack.
- React 19 y TypeScript.
- Supabase Auth y PostgreSQL con Row Level Security (RLS).
- Tailwind CSS 4.
- Vitest y ESLint.

## Requisitos

- Node.js 22 o superior.
- npm 11 o superior.
- Un proyecto Supabase activo.
- Una clave pública moderna de Supabase (`sb_publishable_...`).
- Una clave privada de servidor para las operaciones administrativas.

## Configuración local

1. Instala las dependencias:

   ```powershell
   npm install
   ```

2. Copia `.env.example` como `.env.local` y completa, como mínimo:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
   SUPABASE_SECRET_KEY=sb_secret_your_key
   PLATFORM_ADMIN_EMAIL=admin@example.com
   ```

   `SUPABASE_SERVICE_ROLE_KEY` se admite únicamente como compatibilidad con proyectos antiguos. Las claves privadas nunca deben usar el prefijo `NEXT_PUBLIC_`.

3. Aplica en Supabase, en orden, las migraciones incluidas en [`supabase/migrations`](./supabase/migrations). Estas crean el modelo de organizaciones, diagnósticos, administración, tareas, facturación, herramientas, cursos, visibilidad, rate limiting y snapshots validados.

4. Configura Supabase Auth con la URL local `http://localhost:3000` y añade estas URLs de redirección permitidas:

   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/actualizar-clave`

   Para plantillas basadas en `token_hash`, usa `/auth/confirm?token_hash={{ .TokenHash }}&type=email`. También se admite el callback PKCE estándar.

5. Crea de forma idempotente el administrador de plataforma y la organización Nexaro:

   ```powershell
   npm run bootstrap:admin
   ```

   El usuario indicado en `PLATFORM_ADMIN_EMAIL` debe existir previamente en Supabase Auth.

6. Inicia el entorno de desarrollo:

   ```powershell
   npm run dev
   ```

Visita [http://localhost:3000](http://localhost:3000). Las rutas `/app/**` y `/admin/**` requieren una identidad validada mediante `auth.getClaims()`; `/admin/**` exige además el rol de administrador de plataforma.

## Variables opcionales

El módulo de Visibilidad funciona únicamente con los proveedores que tengan credenciales configuradas:

- `OPENAI_API_KEY` y `OPENAI_VISIBILITY_MODEL`.
- `GEMINI_API_KEY` y `GEMINI_VISIBILITY_MODEL`.
- `PERPLEXITY_API_KEY` y `PERPLEXITY_VISIBILITY_MODEL`.
- `VISIBILITY_JOB_SECRET`, para proteger `POST /api/visibility/jobs`.
- `GOOGLE_SEARCH_CONSOLE_CLIENT_ID`, `GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET` y `GOOGLE_SEARCH_CONSOLE_REDIRECT_URI`, reservadas para la integración OAuth de Search Console.

La operación programada y el formato de las solicitudes están documentados en [`docs/visibility-operations.md`](./docs/visibility-operations.md).

## Comandos

```powershell
npm run dev              # Servidor de desarrollo
npm run lint             # Análisis estático
npm run typecheck        # Comprobación de tipos
npm run test             # Suite de Vitest
npm run build            # Build de producción
npm run start            # Servidor de producción
npm run bootstrap:admin  # Bootstrap idempotente de Nexaro y su administrador
```

Antes de integrar o desplegar cambios se recomienda ejecutar:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

## Estructura relevante

- `src/app/(auth)/`: flujos de autenticación.
- `src/app/app/`: área privada de cada empresa.
- `src/app/admin/`: gestión global de empresas, diagnósticos y trabajo de Nexaro.
- `src/app/api/visibility/jobs/`: endpoint protegido para ejecuciones programadas.
- `src/components/`: componentes compartidos de autenticación, aplicación y administración.
- `src/lib/diagnostics.ts`: cálculo provisional del diagnóstico.
- `src/lib/diagnostic-snapshots.ts`: preparación de resultados y hojas de ruta congeladas.
- `src/lib/evolution.ts`: construcción de la serie histórica a partir de snapshots validados.
- `src/lib/courses.ts`: relación entre cursos, competencias y brechas del diagnóstico.
- `src/lib/auth-rate-limit.ts`: límite de intentos de autenticación respaldado por Supabase.
- `src/lib/visibility/`: proveedores, métricas, recomendaciones y ejecución de Visibilidad.
- `src/lib/supabase/`: clientes de navegador, servidor y administración.
- `supabase/migrations/`: esquema SQL versionado y políticas RLS.
- `supabase/tests/`: comprobaciones SQL de seguridad y aislamiento.
- `scripts/bootstrap-platform-admin.mjs`: alta reproducible de Nexaro y su administrador.

## Seguridad y modelo de datos

- Las tablas públicas están protegidas mediante RLS.
- El rol de administrador de plataforma no depende de pertenecer a una organización.
- Las áreas privadas se protegen en el proxy y vuelven a comprobar permisos en el servidor.
- Los intentos fallidos de acceso, registro y recuperación se limitan a cinco por email y acción durante una ventana de quince minutos.
- Los diagnósticos validados conservan snapshots inmutables de sus resultados y hoja de ruta.
- La aplicación envía CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options` y una política de referencia restrictiva.
- Los secretos de proveedores y Supabase se utilizan exclusivamente en el servidor.

## Despliegue

Antes de desplegar en Vercel:

1. Aplica todas las migraciones al proyecto Supabase de producción.
2. Configura las variables públicas y privadas del entorno.
3. Ejecuta el bootstrap del administrador contra el entorno correcto.
4. Registra en Supabase Auth las URLs de producción para callbacks y recuperación.
5. Ejecuta los comandos de calidad y verifica el build de producción.

El módulo de Visibilidad debe permanecer sin credenciales de proveedores hasta definir límites de gasto, frecuencia y alertas de consumo.
