# NEXARO — Plataforma de madurez digital

Portal responsive para autónomos y pymes. Incluye autenticación con Supabase, rutas privadas, onboarding de empresa real y un tablero que muestra únicamente datos persistidos o estados vacíos explícitos.

## Requisitos

- Node.js 22 o superior (verificado también con Node 24).
- npm 11 o superior.
- Proyecto Supabase activo y una clave pública moderna `sb_publishable_...`.

## Configuración local

1. Copia `.env.example` como `.env.local`.
2. En Supabase, abre **Connect** y completa únicamente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. No uses `service_role`, `sb_secret_...` ni ninguna clave privada en variables `NEXT_PUBLIC_`.
4. Configura en Supabase Auth la URL local `http://localhost:3000` y añade estos destinos permitidos:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/actualizar-clave`
5. Para plantillas basadas en `token_hash`, usa `/auth/confirm?token_hash={{ .TokenHash }}&type=email`; el proyecto admite también el callback PKCE estándar.

```powershell
npm install
npm run dev
```

Visita [http://localhost:3000](http://localhost:3000). Las rutas `/app/**` requieren una identidad validada mediante `auth.getClaims()`.

## Comandos de calidad

```powershell
npm run lint
npm run typecheck
npm run build
```

## Estructura relevante

- `src/lib/supabase/`: clientes separados para navegador y servidor, variables y renovación de sesión.
- `src/lib/organizations.ts`: lectura de la empresa activa respetando la sesión y RLS.
- `proxy.ts`: renovación de cookies y protección temprana de `/app/**`.
- `src/app/(auth)/`: registro, login, recuperación y actualización de contraseña.
- `src/app/app/`: layout privado, tablero y módulos.
- `src/lib/module-states.ts`: estados vacíos y de disponibilidad de los módulos.
- `supabase/migrations/`: esquema versionado de organizaciones, miembros y perfiles.
- `src/components/`: componentes compartidos de acceso y aplicación.

## Núcleo multiempresa disponible

La fase 2 inicial crea `profiles`, `organizations` y `organization_memberships`. Todas las tablas públicas tienen RLS; el alta de una organización crea atómicamente la membresía `owner`. El perfil de empresa reemplaza “Estudio Norte” por información real.

El tablero no inventa puntuaciones, tareas, proyectos, herramientas ni actividad. Hasta que existan las tablas y los flujos de esos módulos, muestra estados vacíos con el siguiente paso correspondiente.
