# Decisiones de arquitectura — documento provisorio

Este documento registra decisiones de producto/arquitectura tomadas fuera del código, a medida que se van cerrando puntos pendientes del análisis del proyecto (seguridad, arquitectura, deuda técnica). Se actualiza de forma incremental — no todos los puntos están implementados todavía; cada uno indica su estado.

## Cómo usar este documento

Cada decisión tiene: contexto (por qué surgió), la decisión en sí, lo que implica a nivel de datos/código, y su estado de implementación. Cuando un punto pase de "decidido" a "implementado", debe quedar enlazado al commit/PR correspondiente.

---

## 1. Alcance de usuarios por empresa en el MVP

**Estado:** Decidido — pendiente de implementar.

**Contexto:** la especificación base (`Nexaro_especificacion_base_MVP.md`) define cuatro roles, incluyendo "Cliente colaborador" invitado por el "Cliente propietario", y permite que una persona pertenezca a más de una empresa. El código actual no implementa invitaciones ni selector de empresa (`getCurrentOrganization` siempre devuelve la organización más antigua del usuario).

**Decisión:** por ahora, **una empresa tiene un único usuario**, que es su responsable/dueño. No se construye el flujo de invitación de colaboradores ni el soporte de "una persona en varias empresas" en esta etapa del MVP.

**Implicaciones:**
- No es necesario un selector de organización en la UI por el momento.
- La tabla `organization_memberships` sigue existiendo (un usuario, una membresía tipo `owner`), pero no se construye UI/RLS de invitación todavía.
- Si en el futuro se retoma el soporte multiusuario, revisar `src/lib/organizations.ts` (`getCurrentOrganization`) y diseñar la tabla de invitaciones pendiente (ver punto 5.1 del informe de auditoría: `organization_invitations`).

---

## 2. Nexaro como organización

**Estado:** Decidido — pendiente de implementar.

**Contexto:** actualmente Nexaro (la empresa que opera la plataforma) no existe como fila en `organizations`; solo existe el concepto de "administrador de plataforma" vía la tabla `platform_admins`, poblada con el email de `wernher.martinez@gmail.com` hardcodeado en una migración SQL versionada en git.

**Decisión:** Nexaro es una **organización normal** dentro del mismo modelo de datos que cualquier empresa cliente. Se diagnostica con el mismo cuestionario DMAT, tiene su propia hoja de ruta, su inventario de herramientas y su seguimiento de tareas — exactamente igual que cualquier cliente (dogfooding). El usuario `wernher.martinez` es el dueño/responsable de esa organización, igual que cualquier "Cliente propietario".

**Implicaciones:**
- Crear (via seed/migración, no hardcodeada con datos personales si es evitable) una fila en `organizations` para Nexaro.
- El flujo de diagnóstico, resultado, hoja de ruta, herramientas y tareas debe funcionar para esa organización sin ninguna rama de código especial — es una organización como cualquier otra.
- No otorga por sí sola ningún permiso especial sobre otras organizaciones (ver punto 3).

---

## 3. Rol de administrador de plataforma, independiente de la organización

**Estado:** Decidido — requiere revisión de lo ya implementado antes de dar por cerrado.

**Contexto:** siguiendo el punto 2, había que decidir si los permisos de "ver y administrar todas las empresas" debían salir de "esta organización es especial" o de un rol de usuario aparte.

**Decisión:** el rol de administrador de plataforma es **un atributo del usuario, independiente de su membresía en cualquier organización**. Pertenecer a la organización Nexaro (como dueño, para su propio diagnóstico) y tener permisos de administrador de plataforma son dos cosas separadas — la primera no otorga la segunda automáticamente, y viceversa.

**Implicaciones:**
- La tabla `platform_admins` (o equivalente) sigue siendo el mecanismo correcto conceptualmente; revisar si su implementación actual necesita cambios más allá de dejar de hardcodear el email en una migración versionada (ver hallazgo de seguridad M/Bajo: "Bootstrap de admin con email hardcodeado en migración").
- Las políticas RLS de tablas "globales" (catálogos, reglas, cuestionarios) deben seguir comprobando el rol de administrador de plataforma, no la pertenencia a una organización concreta.

---

## 4. Un solo login, navegación separada por rol

**Estado:** Decidido — pendiente de implementar (revisar si algo ya funciona así).

**Contexto:** con Nexaro como organización normal y el admin como rol de usuario aparte, había que definir si el acceso a la plataforma debía diferenciarse por tipo de usuario (login distinto, subdominios, sesiones separadas) o no.

**Decisión:** **un único formulario de login** (Supabase Auth, email/contraseña) para todos los usuarios, sean dueños de una empresa cliente, el usuario de Nexaro, o ambos a la vez. Después de autenticarse, la navegación se separa por rol:
- Todo usuario autenticado accede a `/app`, donde ve y gestiona su propia organización (incluida Nexaro, si es su caso).
- Si además tiene el flag de administrador de plataforma, se habilita el acceso a `/admin`, con la vista global de todas las empresas.

**Implicaciones:**
- No crear un segundo sistema de autenticación ni rutas de login separadas.
- La UI debe dejar explícito en todo momento en qué contexto está el usuario (viendo su propia empresa vs. viendo el panel global de administración), para evitar que una acción de administrador se confunda con una acción sobre la propia organización.
- Verificar que `src/lib/supabase/proxy.ts` proteja también `/admin` a nivel de middleware (hallazgo de seguridad B2), no solo mediante el layout de React.

---

## 5. Priorización: núcleo del MVP antes que el módulo de Visibilidad SEO/IA

**Estado:** Decidido.

**Contexto:** el módulo de Visibilidad SEO/IA (proveedores OpenAI/Gemini/Perplexity, `src/lib/visibility/*`) se construyó sin estar contemplado en la especificación base, mientras módulos del núcleo del MVP (herramientas, tareas, cursos) seguían vacíos/bloqueados.

**Decisión:** el módulo de Visibilidad SEO/IA es un **adicional**, a desbloquear **después** de completar y llenar las bases del MVP (herramientas, tareas, cursos, hoja de ruta versionada, etc.). Antes de activarlo en producción se estudiará por separado: costos por proveedor, límites de gasto por ejecución/mes, y alertas de consumo.

**Implicaciones:**
- No se retoma trabajo nuevo en `src/lib/visibility/*` hasta que los módulos núcleo estén completos.
- Cuando se retome, añadir un límite de gasto máximo verificado antes de invocar a los proveedores de IA (hallazgo mayor del informe de auditoría).

---

## 6. Versionado de puntuación y hoja de ruta

**Estado:** Decidido — pendiente de implementar.

**Contexto:** hoy `scoreValues()` (`src/lib/diagnostics.ts`) y `buildRoadmap()` (`src/lib/roadmap.ts`) recalculan la puntuación y la hoja de ruta en caliente, en cada carga, a partir del código actual. No existen `assessment_scores`, `roadmaps` ni `roadmap_items` como los define la especificación. Si se cambia una fórmula o una plantilla de recomendación, todos los diagnósticos ya entregados a un cliente cambiarían de interpretación retroactivamente y sin dejar rastro de lo que el cliente vio en su momento — lo que la especificación prohíbe explícitamente.

**Decisión:** al completar/validar un diagnóstico, el sistema debe **persistir un snapshot inmutable**: el resultado calculado por dimensión junto con la versión de la fórmula usada, y la hoja de ruta generada en ese instante. El historial queda congelado aunque después cambien las reglas de cálculo o las plantillas.

**Implicaciones:**
- Añadir tabla(s) equivalentes a `assessment_scores` (assessment_id, dimension_id, score, nivel, tipo_resultado, fórmula_version) y `roadmaps`/`roadmap_items` (o una estructura simplificada equivalente mientras el MVP no tenga el flujo completo de validación por consultor).
- `scoreValues()` y `buildRoadmap()` dejan de ser la fuente de verdad para diagnósticos ya completados: se usan para generar el snapshot en el momento de completar/validar, no para recalcular sobre la marcha cada vez que se consulta un diagnóstico pasado.
- El snapshot se congela **solo al validarlo un consultor Nexaro** (estado `validated`), no al simplemente enviarlo (`submitted`). Antes de la validación, el resultado mostrado al cliente es explícitamente "provisional" y puede seguir recalculándose; una vez validado, queda inmutable.
- Esto implica que el flujo de validación por consultor (hoy inexistente en el MVP recortado) es un requisito previo para implementar este punto: no se puede versionar/congelar nada hasta que exista al menos una acción mínima de "consultor Nexaro valida este diagnóstico" que dispare la escritura del snapshot.

---

## 7. Quién valida un diagnóstico

**Estado:** Decidido — pendiente de implementar.

**Contexto:** el punto 6 depende de que exista un flujo mínimo de validación de diagnósticos, que hoy no existe en el código. Había que decidir quién tiene permiso para ejecutar esa validación.

**Decisión:** por ahora, quien valida un diagnóstico es el **usuario administrador de plataforma**, es decir, `wernher.martinez` (rol de administrador de plataforma definido en el punto 3), no un rol separado de "Consultor Nexaro" con su propio flujo. La especificación distingue "Consultor Nexaro" de "Administrador Nexaro" como roles distintos, pero en este MVP recortado se unifican en el mismo usuario/rol de administrador.

**Implicaciones:**
- La acción de validar (cambiar `assessments.estado` de `submitted`/`provisional` a `validated`, y disparar el snapshot inmutable del punto 6) se protege con el mismo chequeo de administrador de plataforma que ya protege `/admin` (`isPlatformAdmin`), no con un rol nuevo.
- Se construye desde `/admin`: una vista mínima donde el administrador vea diagnósticos pendientes de validación y pueda validarlos.
- Si en el futuro se contratan consultores independientes del administrador de plataforma, este punto habrá que revisarlo y separar ambos roles — queda anotado como deuda consciente, no como decisión definitiva para siempre.

---

## 8. Cabeceras de seguridad HTTP

**Estado:** Implementado parcialmente (4 de 5 cabeceras) — CSP pendiente.

**Contexto:** `next.config.ts` no definía ninguna cabecera de seguridad, dejando expuesto a clickjacking `/login` y demás páginas de credenciales, y sin defensa en profundidad frente a XSS.

**Decisión:** aplicar de inmediato las cuatro cabeceras seguras que no requieren analizar dependencias externas del front, y dejar el `Content-Security-Policy` pendiente porque definirlo mal podría romper recursos externos que carga la app (Supabase, fuentes, el módulo de Visibilidad IA) sin haber hecho antes un inventario de qué dominios/inline necesita realmente.

**Implementado en `next.config.ts`** (vía `async headers()`, aplicado a `/:path*`):
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

**Pendiente para Codex:** definir e implementar `Content-Security-Policy`. Antes de fijar valores, hacer un inventario de:
- Qué dominios externos carga el front (Supabase URL, fuentes de Google si las hay, cualquier script de terceros).
- Si Next.js/Tailwind requieren `'unsafe-inline'` en `style-src` (común en apps con CSS-in-JS o estilos inline generados por el framework) o si se puede evitar con nonces.
- Si el módulo de Visibilidad IA hace alguna llamada `fetch` desde el cliente (no solo desde servidor) que necesite estar en `connect-src`.

---

## 9. Rate limiting en login/registro/recuperación de acceso

**Estado:** Decidido — pendiente de implementar (para Codex).

**Contexto:** `login`, `register` y `recoverAccess` (`src/app/(auth)/actions.ts`) no tienen ningún límite propio de intentos; dependen solo de los límites internos (genéricos, no configurables) de Supabase Auth. Mayor superficie para fuerza bruta/credential stuffing contra `/login`.

**Decisión:** implementar el rate limit con una **tabla propia en Supabase** (sin depender de un servicio externo como Upstash/Vercel KV), con un umbral de **5 intentos fallidos por email en una ventana de 15 minutos**.

**Implicaciones / a implementar por Codex:**
- Nueva tabla, ej. `auth_attempts` (`email`, `ip`, `created_at`, quizá `action` para distinguir login/recuperación), con RLS que impida lectura/escritura directa desde el cliente (solo accesible vía Server Action con el cliente admin, o vía función `security definer`).
- En `login` (y opcionalmente `recoverAccess`): antes de intentar `signInWithPassword`, contar intentos fallidos de ese email en los últimos 15 minutos; si son ≥5, devolver el mismo mensaje de error genérico ("No hemos podido verificar esos datos de acceso") sin revelar que está bloqueado por rate limit, para no filtrar información a un atacante.
- Registrar un intento fallido cada vez que `signInWithPassword` devuelva error; limpiar o ignorar intentos con más de 15 minutos de antigüedad (se puede resolver con la propia condición del `count`, sin necesidad de un job de limpieza aparte, aunque conviene un `DELETE` periódico o un `TTL` para no acumular filas indefinidamente).
- Aplicar el mismo mecanismo a `register` si se quiere evitar creación masiva de cuentas, y a `recoverAccess` para evitar spam de emails de recuperación.

---

## 10. Caso límite: dimensión completa en "No aplica" en el diagnóstico

**Estado:** Decidido — pendiente de implementar (para Codex).

**Contexto:** `src/app/app/diagnostico/actions.ts:59-64` bloquea completar el diagnóstico si todas las respuestas de una dimensión son "No aplica" (valor 0). Esto atasca sin salida a negocios simples (ej. un autónomo sin embudo de ventas formal) que legítimamente no tienen esa dimensión aplicable.

**Decisión:** permitir completar el diagnóstico aunque una dimensión quede sin respuestas aplicables. Esa dimensión se muestra como **"Sin evaluar"** en el resultado (no puntúa, no entra en el promedio general) en vez de bloquear el envío completo.

**Implicaciones / a implementar por Codex:**
- Eliminar el bloqueo de `intent === "complete"` en `src/app/app/diagnostico/actions.ts:59-64` (el bloque que arma `dimensionsWithoutApplicableAnswers` y llama a `diagnosticMessage("error", ...)`).
- En el cálculo de resultado (`src/lib/diagnostics.ts`, `scoreValues`/`scoreLabel`) confirmar que una dimensión sin respuestas aplicables produce un valor nulo/"Sin evaluar" en vez de un 0 que se interprete como "nivel mínimo" — deben ser conceptos distintos (no aplica ≠ nivel más bajo).
- En la UI de resultado (`src/app/app/diagnostico/page.tsx`, sección "Resultado por dimensión") renderizar explícitamente "Sin evaluar" para esas dimensiones, no ocultarlas ni mostrarlas con un puntaje falso.
- Si esto interactúa con el punto 6 (snapshot al validar): el snapshot debe conservar qué dimensiones quedaron "Sin evaluar" en ese momento, no recalcularlo después.

---

## 11. Comparación de secreto no constante en `/api/visibility/jobs`

**Estado:** Implementado.

**Contexto:** `src/app/api/visibility/jobs/route.ts` comparaba el secreto del cron (`VISIBILITY_JOB_SECRET`) con `!==`, una comparación no constante en tiempo, teóricamente vulnerable a timing attack.

**Decisión:** corregido de inmediato con `crypto.timingSafeEqual`, comprobando antes que ambos buffers tengan la misma longitud (para no tirar excepción y para no filtrar longitud por timing tampoco).

**Implementado:** función `isAuthorized()` en `src/app/api/visibility/jobs/route.ts`.

---

## 12. Archivo `public/images/X equis.png`

**Estado:** Decidido — se mantiene.

**Contexto:** archivo sin trackear en git, no referenciado en `src/`, detectado en la auditoría como posible resto de higiene de repositorio.

**Decisión:** se conserva, es un asset que se va a usar más adelante. No se elimina.

---

## Puntos pendientes de decisión

Ninguno por ahora. Todos los puntos identificados en el análisis inicial (seguridad + abogado del diablo + fixer) quedaron con una decisión registrada (puntos 1 a 12). Los pendientes de **implementación** por Codex quedan marcados como tal en cada punto: principalmente el 1 (invitaciones, si se retoma), el 2 y 3 (Nexaro como organización + rol admin), el 4 (navegación por rol), el 6 y 7 (versionado + flujo de validación), el 8 (CSP), el 9 (rate limiting) y el 10 (caso "Sin evaluar").

---

*Última actualización: sesión de análisis y decisiones del 2026-09-03. Documento cerrado como base de decisiones — listo para pasar a Codex como especificación complementaria de implementación. Si surgen nuevos puntos, se añaden como entradas numeradas siguiendo este mismo formato.*
