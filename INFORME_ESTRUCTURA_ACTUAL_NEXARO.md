# Radiografía técnica y funcional de Nexaro

**Proyecto:** Digitalización de empresas Nexaro  
**Estado analizado:** rama `main`, commit `338311d` — *Aclara el avance real del plan*  
**Fecha del análisis:** 14 de octubre de 2026  
**Alcance:** revisión estática del código, migraciones y documentación del repositorio.

## 0. Resumen ejecutivo

Nexaro es actualmente una plataforma privada de acompañamiento digital gestionado. Aunque nació como una solución generalista para medir la madurez digital de autónomos y pymes, el recorrido visible se está transformando en un servicio específico para restaurantes y bares.

El modelo vigente ya no consiste en que el restaurante complete por sí mismo un diagnóstico genérico. Ahora Nexaro analiza el establecimiento, selecciona los pasos que corresponden a su situación, ejecuta o supervisa las mejoras, las marca como comprobadas y muestra al cliente un recorrido de seis fases más una fase recurrente de mejora continua.

La aplicación tiene dos superficies claramente separadas:

- **Panel del restaurante:** consulta del progreso, próximos pasos, datos del local y trabajos ya realizados.
- **Panel administrativo de Nexaro:** alta de establecimientos, activación y seguimiento de fases, verificación de intervenciones, historial, usuarios y visibilidad en buscadores e IA.

Todavía conviven en el repositorio componentes antiguos —diagnóstico de seis dimensiones, evolución, herramientas y cursos— con el nuevo modelo para restauración. Las estructuras antiguas continúan existiendo en el código y la base de datos, pero ya no forman parte del menú principal ni del flujo activo del restaurante.

## 1. Arquitectura actual

### 1.1 Tecnologías principales

| Capa | Tecnología |
|---|---|
| Aplicación web | Next.js 16.3.3 con App Router |
| Interfaz | React 19.2.8 |
| Lenguaje | TypeScript 6.0.3 |
| Base de datos | PostgreSQL administrado por Supabase |
| Autenticación | Supabase Auth |
| Acceso a datos | `@supabase/supabase-js` y `@supabase/ssr` |
| Seguridad de datos | Row Level Security de PostgreSQL |
| Pagos | Stripe Checkout, webhooks y Customer Portal |
| Estilos | CSS global y hojas específicas; Tailwind CSS 4 está instalado |
| Iconografía | `lucide-react` |
| Pruebas | Vitest |
| Calidad | ESLint y comprobación de tipos |
| Despliegue previsto | Vercel |
| Runtime requerido | Node.js 22 o superior |

### 1.2 Organización del frontend

La aplicación utiliza App Router y está dividida por áreas:

```text
src/
├── app/
│   ├── (auth)/                  # Login, registro y recuperación
│   ├── auth/                    # Callbacks de Supabase
│   ├── app/                     # Área privada del restaurante
│   ├── admin/                   # Panel interno de Nexaro
│   └── api/
│       ├── stripe/webhooks/     # Recepción de eventos Stripe
│       └── visibility/jobs/     # Ejecuciones programadas de visibilidad
├── components/
│   ├── app/                     # Navegación y dashboard del cliente
│   ├── admin/                   # Componentes administrativos
│   └── auth/                    # Formularios y mensajes de acceso
└── lib/
    ├── supabase/                # Clientes de navegador, servidor y admin
    ├── stripe/                  # Suscripciones y ciclo de facturación
    ├── visibility/              # Monitorización en buscadores e IA
    ├── restaurant-roadmap.ts    # Plan especializado de restauración
    ├── diagnostics.ts           # Diagnóstico generalista heredado
    ├── diagnostic-snapshots.ts  # Congelación de diagnósticos validados
    └── roadmap.ts               # Hoja de ruta generalista heredada
```

Los estilos principales se concentran en `src/app/globals.css`, `src/app/app/app.css` y `src/app/admin/admin.css`.

### 1.3 Backend

No existe un backend independiente. El servidor está implementado dentro de Next.js mediante Server Components, Server Actions, rutas API, clientes Supabase ejecutados en servidor y funciones RPC almacenadas en PostgreSQL.

Las operaciones sensibles comprueban nuevamente la identidad mediante `supabase.auth.getClaims()` y, cuando son administrativas, verifican la presencia del usuario en `platform_admins`.

Puntos principales:

- `src/app/admin/actions.ts`
- `src/app/admin/empresas/[organizationId]/actions.ts`
- `src/app/admin/empresas/[organizationId]/visibilidad/actions.ts`
- `src/app/api/visibility/jobs/route.ts`
- `src/app/api/stripe/webhooks/route.ts`

### 1.4 Autenticación y autorización

Supabase Auth gestiona registro, inicio de sesión, confirmación de correo, recuperación de acceso y actualización de contraseña. Las rutas principales son `/login`, `/registro`, `/recuperar-acceso`, `/actualizar-clave`, `/auth/callback` y `/auth/confirm`.

La sesión se actualiza mediante `proxy.ts` y `src/lib/supabase/proxy.ts`.

La autorización distingue entre miembros de organizaciones y administradores globales. En el MVP, `getCurrentOrganization()` recupera la primera membresía del usuario; todavía no existe selector de organizaciones ni una experiencia multiempresa completa.

### 1.5 Seguridad

- RLS en las tablas públicas.
- Separación entre cliente Supabase público y cliente administrativo.
- Secretos utilizados solamente desde el servidor.
- Rate limiting mediante `auth_attempts`.
- CSP, HSTS, `X-Frame-Options: DENY` y `X-Content-Type-Options: nosniff`.
- Snapshots inmutables para diagnósticos validados antiguos.
- Verificación de firma e idempotencia de webhooks Stripe.

## 2. Módulos del dashboard

### 2.1 Navegación vigente para restaurantes

La navegación actual se define en `src/components/app/app-shell.tsx`.

| Sección | Ruta | Finalidad |
|---|---|---|
| Inicio | `/app` | Resumen del estado, fase actual y siguiente acción |
| Mi restaurante | `/app/perfil` | Datos comerciales y legales básicos |
| Plan de mejora | `/app/hoja-de-ruta` | Recorrido detallado por fases y acciones |
| Trabajo realizado | `/app/trabajo-nexaro` | Historial cronológico de intervenciones |
| Cuenta | `/app/configuracion` | Datos personales, fiscales y de facturación |

El administrador ve además un acceso a `/admin`.

### 2.2 Módulos heredados

Las siguientes rutas conservan implementación, pero ya no aparecen en el menú especializado:

- `/app/diagnostico`
- `/app/evolucion`
- `/app/visibilidad`
- `/app/herramientas`
- `/app/cursos`
- `/app/facturacion`

`/app/diagnostico` y `/app/tareas` redirigen actualmente a `/app/hoja-de-ruta`. Evolución, herramientas y cursos conservan código y tablas, pero no pertenecen al recorrido vigente. Facturación está implementada, aunque quedó fuera de la navegación simplificada. Visibilidad tiene interfaz de cliente, pero tampoco se expone en el menú activo.

## 3. Diagnóstico digital

### 3.1 Modelo vigente para restauración

El restaurante ya no completa un cuestionario de madurez digital. El diagnóstico actual se representa como las primeras acciones del recorrido:

- `1A`: analizar el restaurante, su presencia digital y reputación frente a competidores.
- `1B`: solicitar y validar accesos administrativos.
- `1C`: extraer una primera fotografía de rendimiento con datos disponibles en Google.

Estas definiciones están en `src/lib/restaurant-roadmap.ts`.

La información se recoge mediante trabajo operativo de Nexaro y se registra utilizando tareas en `nexaro_tasks`, notas visibles, estados, fechas, entradas manuales en `nexaro_work_entries` y resultados del módulo de visibilidad cuando se utiliza.

No existe todavía una tabla especializada de radar ni un objeto estructurado que almacene automáticamente todos los indicadores del análisis inicial. Parte de la primera fotografía queda representada por tareas, notas, evidencias esperadas y registros de trabajo.

### 3.2 Diagnóstico generalista heredado

El sistema anterior continúa implementado en `src/lib/diagnostics.ts`, `src/lib/diagnostic-snapshots.ts` y `src/lib/roadmap.ts`.

Evalúa seis dimensiones:

1. Presencia y descubrimiento.
2. Captación digital.
3. Embudo y ventas.
4. Experiencia y fidelización.
5. Datos y automatización.
6. Estrategia y capacidades.

Las respuestas utilizan una escala de 0 a 5. Los valores de 1 a 5 se convierten a una puntuación de 0 a 100 y las respuestas no aplicables se excluyen.

```text
Cuestionario
  → diagnóstico en borrador
  → diagnóstico completado
  → revisión de Nexaro
  → snapshot validado
  → puntuaciones y hoja de ruta congeladas
```

Tablas principales: `diagnostic_questionnaires`, `diagnostic_questions`, `diagnostic_question_dependencies`, `diagnostics`, `diagnostic_responses`, `assessment_scores`, `roadmaps` y `roadmap_items`.

La RPC `validate_diagnostic_snapshot` congela la puntuación y hoja de ruta. Este sistema conserva históricos, pero ya no representa el flujo de incorporación de nuevos restaurantes.

## 4. Recorrido de acompañamiento

### 4.1 Definición

El plan está definido en `src/lib/restaurant-roadmap.ts`. Cada acción contiene clave, código, fase, periodo, título, descripción, información necesaria del restaurante, acción de Nexaro, evidencia esperada, responsable y prioridad.

### 4.2 Fases

| Fase | Nombre | Periodo | Acciones |
|---|---|---:|---:|
| 1 | Analizar el restaurante | Semana 1 | 3 |
| 2 | Preparar la base digital | Semanas 1–2 | 5 |
| 3 | Conseguir visibilidad y confianza | Semanas 2–4 | 4 |
| 4 | Facilitar reservas y contacto | Semanas 4–6 | 6 |
| 5 | Activar Wallet y fidelización | Semanas 6–8 | 7 |
| 6 | Activar NFC en caja | Semanas 8–12 | 6 |
| 7 | Búsqueda de mejora permanente | Recurrente | 5 |

Existen 36 acciones: 31 de implantación y 5 recurrentes.

### 4.3 Asignación por restaurante

No se crean automáticamente las 36 tareas. Nexaro selecciona desde administración solo las acciones que corresponden a la situación del establecimiento. Se almacenan en `nexaro_tasks` con `source_reference = restaurant:<clave>`.

Funciones principales:

- `assignRestaurantRoadmapSteps()`
- `mergeRestaurantRoadmapTasks()`
- `assignedRestaurantRoadmapSteps()`

### 4.4 Estados y avance

Estados disponibles:

- `pending`: pendiente.
- `in_progress`: en curso.
- `completed`: comprobado.
- `cancelled`: no incluido.

`getRestaurantRoadmapProgress()` calcula fases completadas, porcentaje y finalización. Una fase queda completa cuando tiene al menos una acción asignada y todas sus acciones asignadas están comprobadas. Al completar las seis fases de implantación, la interfaz cambia a **Búsqueda de mejora permanente**.

Una fase puede considerarse completa aunque solo tenga asignada una parte de su catálogo, siempre que todas las acciones realmente asignadas estén comprobadas.

## 5. Ejecución y verificación

### 5.1 Acciones del plan

Se almacenan en `nexaro_tasks` y conservan estado, fecha prevista, fecha realizada, usuario que completó la acción, nota visible y referencia a la plantilla.

### 5.2 Intervenciones adicionales

Se almacenan en `nexaro_work_entries` con título, descripción, categoría, fecha de finalización y administrador que realizó el registro. Las categorías incluyen web, SEO, Perfil de Google, diseño, campaña, automatización, consultoría, mantenimiento y otros.

### 5.3 Evidencias

Cada plantilla define una evidencia esperada. Actualmente la evidencia conservada es principalmente textual:

- Texto fijo de comprobación.
- Nota visible de Nexaro.
- Fecha.
- Estado.
- Identidad del administrador.

No existe todavía un repositorio estructurado de capturas, archivos, documentos o URLs verificadas asociadas directamente a cada acción. El módulo de visibilidad constituye una excepción, porque conserva respuestas originales, menciones, citas, métricas y metadatos.

### 5.4 Historial

`src/app/app/trabajo-nexaro/page.tsx` y `src/app/admin/empresas/[organizationId]/page.tsx` combinan cronológicamente `nexaro_work_entries` y los pasos completados de `nexaro_tasks`.

Una intervención manual no completa automáticamente una acción del plan; son fuentes independientes.

## 6. Dashboard del cliente

### 6.1 Inicio

Implementado en `src/app/app/page.tsx` y `src/components/app/dashboard.tsx`.

Muestra el nombre del restaurante, fase actual, fases completas, pasos comprobados, próxima acción, línea de tiempo de seis fases, estados y accesos a plan, historial y datos del local.

También comunica el recorrido `NFC Mesa → NFC Caja → Wallet`, aclarando que las reseñas son voluntarias y no generan puntos.

### 6.2 Plan de mejora

`src/app/app/hoja-de-ruta/page.tsx` presenta una línea de tiempo vertical con código, fase, estado, descripción, acción de Nexaro, forma de comprobación y nota visible. Incluye porcentaje, barra de progreso y estado de mejora permanente.

### 6.3 Trabajo realizado

`src/app/app/trabajo-nexaro/page.tsx` presenta un historial unificado de pasos comprobados y trabajos adicionales.

### 6.4 Mi restaurante

`src/app/app/perfil/page.tsx` y sus acciones gestionan nombre comercial, razón social, NIF/CIF, tipo de local, equipo, ciudad, país y sitio web.

### 6.5 Cuenta

`src/app/app/configuracion/page.tsx` y sus acciones gestionan nombre completo, identificación fiscal, dirección, código postal, ciudad, provincia, país y teléfono.

## 7. Panel de administración

### 7.1 Panel global

`src/app/admin/page.tsx` y `src/app/admin/actions.ts` permiten consultar usuarios, organizaciones, planes, trabajos, solicitudes de alta, usuarios sin empresa y crear empresas mediante la RPC `admin_register_company`.

### 7.2 Expediente del restaurante

`src/app/admin/empresas/[organizationId]/page.tsx` y sus acciones permiten:

- Consultar los datos de la organización.
- Ver usuarios vinculados.
- Restablecer directamente contraseñas.
- Añadir acciones al recorrido.
- Cambiar estados y fechas.
- Escribir actualizaciones visibles.
- Marcar y reabrir acciones.
- Registrar y editar trabajos adicionales.
- Consultar el historial.
- Gestionar tareas procedentes de visibilidad.
- Acceder al control SEO e IA.

Funciones relevantes: `resetMemberPassword()`, `addWorkEntry()`, `updateWorkEntry()`, `assignRestaurantRoadmapSteps()`, `updateRestaurantRoadmapStep()`, `completeNexaroTask()` y `reopenNexaroTask()`.

Las funciones antiguas `validateDiagnostic()`, `completeRoadmapTask()` y `reopenRoadmapTask()` permanecen por compatibilidad.

## 8. Modelo de datos

### 8.1 Identidad y organizaciones

| Tabla | Responsabilidad |
|---|---|
| `auth.users` | Identidades de Supabase |
| `profiles` | Perfil básico |
| `platform_users` | Espejo operativo de usuarios |
| `platform_admins` | Administradores globales |
| `organizations` | Empresas o restaurantes |
| `organization_memberships` | Relación usuario–organización |
| `company_registrations` | Altas manuales |
| `billing_profiles` | Información fiscal |
| `auth_attempts` | Rate limiting |

### 8.2 Operación actual

| Tabla | Responsabilidad |
|---|---|
| `nexaro_tasks` | Acciones del plan y tareas operativas |
| `nexaro_work_entries` | Historial manual de intervenciones |

`nexaro_tasks` admite origen `manual`, `diagnostic` o `visibility`. Las acciones del plan se identifican mediante el prefijo `restaurant:`.

### 8.3 Diagnóstico heredado

- `diagnostic_questionnaires`
- `diagnostic_questions`
- `diagnostic_question_dependencies`
- `diagnostics`
- `diagnostic_responses`
- `assessment_scores`
- `roadmaps`
- `roadmap_items`
- `roadmap_task_completions`

Estas tablas no deben confundirse con el recorrido actual almacenado en `nexaro_tasks`.

### 8.4 Visibilidad

```text
visibility_projects
  ├── visibility_competitors
  ├── visibility_prompts
  ├── visibility_runs
  │     └── visibility_responses
  │            ├── visibility_mentions
  │            └── visibility_citations
  ├── visibility_metric_snapshots
  ├── visibility_recommendations
  ├── visibility_usage_events
  └── visibility_reports
```

Una recomendación puede convertirse en `nexaro_tasks`.

### 8.5 Otros subsistemas

- Herramientas: `tool_catalog`, `organization_tools`, `tool_integrations`.
- Formación: `courses`, `course_competencies`, `course_assignments`, `course_progress`.
- Stripe: `stripe_subscriptions`, `stripe_webhook_events`.

## 9. SEO y presencia digital

### 9.1 Visibilidad en buscadores e IA

El módulo se encuentra en `src/lib/visibility/`, `src/app/admin/empresas/[organizationId]/visibilidad/`, `src/app/app/visibilidad/` y `src/app/api/visibility/jobs/route.ts`.

Permite configurar marca, variantes, dominio, servicios, público, localización, idiomas, competidores, preguntas y frecuencia. Admite OpenAI, Gemini y Perplexity.

`src/lib/visibility/runner.ts` conserva respuestas originales, proveedor, modelo, duración, tokens, coste estimado, menciones, sentimiento, atributos, citas, confianza, métricas y recomendaciones.

Las métricas incluyen presencia, cobertura, cuota de voz, citación propia, sentimiento, autoridad y posición competitiva.

### 9.2 Reconocimiento de entidades

El reconocimiento actual utiliza coincidencias deterministas del nombre de marca, variantes, competidores y aliases. No existe todavía un sistema avanzado de NER, grafo de conocimiento, identificador canónico transversal ni desambiguación entre plataformas.

### 9.3 Google Business Profile

Está incluido como proceso operativo del plan: solicitud de acceso, corrección de datos, categorías, horarios, fotografías, servicios y comprobación móvil. No se encontró integración directa con la API de Google Business Profile.

### 9.4 Google Search Console

El esquema contempla URL de propiedad, estado y variables OAuth, pero la sincronización efectiva sigue pendiente.

### 9.5 Reputación y competencia

El plan incluye análisis competitivo, reputación, solicitud voluntaria de reseñas y seguimiento. El módulo de visibilidad registra menciones de competidores. No existe importación automática de reseñas.

### 9.6 Carta y reservas

El plan cubre carta móvil, precios, alérgenos, enlaces, canal de reservas, reducción de pasos y prueba completa. Son intervenciones operativas; no existe motor propio de carta o reservas ni conector con un proveedor específico.

### 9.7 Wallet y NFC

Wallet y NFC están definidos en el plan y comunicados en el dashboard, pero todavía no existen como subsistema terminado. No aparecen generación real de pases, clientes finales, libro mayor de puntos, recompensas, API NFC, hardware de caja, integración TPV o aplicación pública de alta.

## 10. Estado de implementación

### 10.1 Vigente y operativo en código

- Autenticación con Supabase.
- Organizaciones, perfiles y membresías.
- Panel administrativo.
- Creación manual de empresas.
- Perfil y cuenta del restaurante.
- Plan de seis fases.
- Asignación personalizada.
- Estados, fechas y notas.
- Cálculo de avance.
- Dashboard y línea de tiempo.
- Historial de trabajo.
- Edición de registros.
- Restablecimiento administrativo de contraseña.
- Infraestructura de visibilidad.
- Recomendaciones convertibles en tareas.
- Stripe Checkout, webhooks y Customer Portal.
- RLS y separación de permisos.

### 10.2 Implementado pero fuera del flujo activo

- Diagnóstico generalista.
- Validación administrativa y snapshots.
- Evolución histórica.
- Herramientas.
- Cursos.
- Vista de visibilidad para clientes.
- Facturación en la navegación antigua.

### 10.3 Parcial o dependiente de configuración

- Ejecución de proveedores de IA.
- Programación semanal de visibilidad.
- Recomendaciones basadas en ejecuciones reales.
- Suscripción Stripe en producción.
- Límites de gasto de proveedores.
- Registro estructurado del radar inicial.

### 10.4 Pendiente

- Integración efectiva con Search Console.
- Integración con Google Business Profile.
- Importación de reseñas.
- Integraciones de reservas y carta.
- Wallet funcional.
- NFC de mesa y lector de caja.
- Puntos, saldo y recompensas.
- Integración TPV.
- Evidencias adjuntas por intervención.
- Resolución avanzada de entidades digitales.
- Selector de empresa.
- Colaboración multiusuario e invitaciones.

## 11. Conclusión

Nexaro ya dejó de presentar al restaurante el antiguo diagnóstico empresarial como punto de entrada. La experiencia vigente se basa en una relación de servicio: Nexaro analiza, propone, ejecuta, comprueba y comunica avances. El restaurante consulta el recorrido, conoce qué necesita aportar y dispone de un historial del trabajo.

La transformación todavía es híbrida. El plan especializado de restauración es la experiencia principal, mientras varios módulos generalistas permanecen en código y base de datos. El seguimiento administrativo y del cliente ya está adaptado; las integraciones profundas con Google, reservas, Wallet, NFC, TPV y reconocimiento avanzado de entidades todavía no están materializadas como infraestructura funcional.

> **Nota de verificación:** este informe describe lo encontrado en el repositorio. No se consultó el estado en vivo de Supabase, las credenciales desplegadas ni la ejecución real del entorno de producción.
