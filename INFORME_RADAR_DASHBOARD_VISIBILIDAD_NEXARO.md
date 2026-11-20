# Informe: Radar, dashboard y visibilidad de Nexaro

**Proyecto analizado:** Nexaro — digitalización de restaurantes y bares  
**Fecha:** 17 de octubre de 2026  
**Alcance:** revisión estática de los repositorios, código, migraciones y configuración local disponible.  
**Objetivo:** aclarar cómo funciona Radar, cómo se relaciona con el dashboard y qué mide actualmente el módulo de visibilidad.

## Conclusión principal

> **Radar es una aplicación separada del dashboard de Nexaro. Tiene otro repositorio, otro despliegue y otra base de datos Supabase. Actualmente no existe una transferencia automática de Radar al dashboard.**

Los sistemas identificados son:

| Sistema | Ubicación local | Repositorio o función |
|---|---|---|
| Dashboard Nexaro | `Digitalizacion de empresas Nexaro` | Área privada del restaurante y administración de Nexaro |
| Radar funcional | `nexaro-local-RADAR-engine` | Aplicación pública de captación y diagnóstico inicial |
| Documentación Radar | `Nexaro Restaurant Radar Audit` | Documentos maestros y decisiones del producto |

Repositorios Git:

- Dashboard: `wernhermartinez-wq/Ditalizacion-de-Negocios`
- Radar: `wernhermartinez-wq/nexaro-local-opportunity-engine`

También utilizan proyectos Supabase diferentes:

| Sistema | Proyecto Supabase |
|---|---|
| Dashboard | `ccebawfpmtlgmytwwhiq` |
| Radar y CRM compartido | `ahjgahcqpnhrkivdtdit` |

Radar comparte PostgreSQL con el CRM de Nexaro, pero sus tablas están aisladas dentro del esquema `opportunity_engine`. El dashboard utiliza otra base de datos y mantiene sus tablas en el esquema `public`.

```text
Radar ── misma base que el CRM, schema opportunity_engine
Dashboard ── otro proyecto Supabase
```

## 1. Radar

### 1.1 Dónde está implementado

El Radar funcional se encuentra en el proyecto separado `nexaro-local-RADAR-engine`. El repositorio principal del dashboard solo contiene referencias conceptuales al “radar digital” dentro del recorrido del restaurante.

En el dashboard, la acción `1A` definida en `src/lib/restaurant-roadmap.ts` establece:

- Analizar el restaurante y su presencia digital.
- Revisar reputación y competencia.
- Conservar como evidencia esperada un radar inicial y una comparación competitiva.

No obstante, el motor que realiza ese análisis vive en el repositorio separado.

### 1.2 Cómo identifica al restaurante

El usuario escribe el nombre del establecimiento y Radar consulta Google Places mediante:

- `src/app/api/places/autocomplete/route.ts`
- `src/app/api/places/resolve/route.ts`
- `src/lib/google-places.ts`

Google devuelve un `place_id`. Ese valor es la identidad principal del establecimiento dentro de Radar.

La tabla `opportunity_engine.businesses` tiene un `place_id` único. Cada ejecución genera además un registro nuevo en `opportunity_engine.analyses`.

Por tanto:

- `place_id` identifica al establecimiento en Google.
- `business_id` identifica su registro interno cacheado.
- `analysisId` identifica una ejecución concreta del diagnóstico.

### 1.3 Datos obtenidos de Google Places

Radar obtiene, cuando Google los proporciona:

- Nombre.
- Dirección.
- Coordenadas.
- Categoría principal.
- Tipo comercial visible.
- Localidad.
- Estado del negocio.
- Valoración.
- Cantidad de reseñas.
- Sitio web.
- Teléfono.
- Horarios.
- Nivel de precio.
- Fotografías.
- Atributos del restaurante.
- Un número limitado de reseñas públicas.

Los datos se almacenan temporalmente en `opportunity_engine.businesses`. El código aplica un TTL de 48 horas antes de refrescar el snapshot.

### 1.4 Competencia

El Competitor Engine busca establecimientos cercanos mediante Google Places Nearby Search y calcula:

- Competidores comparables.
- Mediana de valoración.
- Mediana de cantidad de reseñas.
- Diferencia de valoración.
- Diferencia de reseñas.
- Proporción de reseñas.
- Diferencia de presencia web.
- Diferencias de atributos.
- Posición por valoración.
- Posición por cantidad de reseñas.

Archivos y tablas relevantes:

- `src/lib/competitor-engine.ts`
- `opportunity_engine.competitor_analyses`

### 1.5 Auditoría del sitio web

El Website Conversion Auditor descarga el HTML del sitio con protección anti-SSRF y revisa:

- Existencia de web.
- HTTPS.
- Carta o menú.
- Reserva online.
- WhatsApp.
- Botón de llamada.
- Mapa o dirección.
- Redes sociales.
- Schema.org de restaurante.
- Título y metadescripción.
- Llamadas a la acción.
- Rendimiento y compatibilidad móvil mediante PageSpeed Insights.
- Problemas que dificultan la conversión.

Archivos y tabla:

- `src/lib/website-auditor.ts`
- `src/lib/safe-fetch.ts`
- `src/lib/pagespeed.ts`
- `opportunity_engine.website_audits`

El análisis se limita al HTML recibido y no renderiza aplicaciones JavaScript completas.

### 1.6 Demanda

`src/lib/demand-engine.ts` genera búsquedas combinando categoría, localidad e intención. Utiliza Google Trends mediante una biblioteca no oficial.

El resultado es cualitativo:

- Alto.
- Medio.
- Bajo.

No entrega un volumen exacto de búsquedas locales. Google Trends aporta interés relativo y el propio proyecto considera baja la confianza de esta medición.

### 1.7 Reputación

`src/lib/reputation-engine.ts` combina:

- Rating del restaurante.
- Cantidad de reseñas.
- Medianas de competidores.

Produce una explicación determinista de la posición relativa. Google Places no informa si el propietario respondió a las reseñas, por lo que ese dato permanece como no disponible.

### 1.8 Puntuaciones y detección de fugas

`src/lib/scores-engine.ts` construye cinco puntuaciones:

1. Demanda.
2. Descubrimiento o visibilidad.
3. Confianza.
4. Conversión.
5. Reputación.

El Leak Detector identifica la etapa más débil y, cuando existen datos suficientes, una segunda debilidad. También procura comenzar por una fortaleza cuando existe una diferencia positiva demostrable.

`src/lib/recommendation-engine.ts` genera recomendaciones mediante reglas. Una recomendación solo aparece cuando existe una señal concreta que la justifica.

### 1.9 Resultados mostrados al posible cliente

Antes de entregar datos personales, el usuario puede ver:

- Identificación del restaurante.
- Fotografía.
- Valoración.
- Posición frente a competidores.
- Principal fuga o posibilidad de crecimiento.
- Evidencias iniciales.
- Comparativa con competidores.
- Estimación de oportunidad, únicamente si Nexaro ha configurado sus coeficientes.

Después de introducir nombre, correo, teléfono y consentimiento, se desbloquean:

- Datos detallados de la ficha.
- Auditoría web.
- Lista de comprobación del Perfil de Google.
- Evaluación de reputación.
- Recomendaciones.
- Cinco puntuaciones del embudo.
- Opciones de contacto con Nexaro.

El flujo público se encuentra en `src/app/page.tsx`.

### 1.10 Análisis posterior con IA

Después de capturar el lead:

1. Se crea un trabajo en `ai_review_jobs`.
2. Un cron obtiene reseñas, fotos y datos del perfil.
3. Claude analiza fortalezas, debilidades y acciones.
4. El resultado se almacena en `ai_review_analyses`.
5. Nexaro lo revisa y puede editarlo.
6. Solamente después de aprobarlo se envía por correo.
7. El correo enlaza al informe `/informe/[analysisId]`.

Archivos principales:

- `src/lib/ai-review-engine.ts`
- `src/app/api/cron/ai-review/route.ts`
- `src/app/admin/reviews/page.tsx`
- `src/app/api/admin/reviews/[id]/approve/route.ts`
- `src/lib/email.ts`
- `src/app/informe/[analysisId]/page.tsx`

La IA no genera el diagnóstico base. Interpreta reseñas, fotos y perfil después de que los motores deterministas hayan producido las mediciones.

## 2. Radar → Dashboard

### 2.1 Paso de visitante a prospecto

Buscar un restaurante no crea un lead. El lead se crea únicamente cuando la persona introduce nombre, correo, teléfono y acepta la política de privacidad.

La tabla `opportunity_engine.leads` relaciona el contacto con:

- `analysis_id`.
- `business_id`.
- Nombre.
- Correo.
- Teléfono.
- Fuga principal.
- Rango de oportunidad.
- Consentimiento.
- Estado de sincronización con CRM.

### 2.2 Sincronización con el CRM

El código actual sí realiza la sincronización con el CRM desde:

- `src/lib/crm-sync.ts`
- `src/app/api/leads/route.ts`

Radar envía al CRM:

- `analysisId` como `source_record_id`.
- Nombre del negocio.
- Categoría.
- Dirección.
- Rating.
- Cantidad de reseñas.
- Persona de contacto.
- Teléfono.
- Correo.
- Resumen de la debilidad detectada.
- URL del aviso de privacidad.

La integración utiliza el endpoint `nexaro-consent-intake`.

### 2.3 Paso de prospecto a cliente del dashboard

El lead llega al CRM, pero no se convierte automáticamente en organización del dashboard.

No se encontró en el dashboard:

- Lectura de `opportunity_engine.leads`.
- Lectura del CRM.
- Campos `place_id`, `analysis_id` o `business_id`.
- Endpoint para importar un análisis.
- Correspondencia automática por correo.
- Creación automática de `organizations`.
- Creación automática de membresías.
- Conversión de recomendaciones Radar en `nexaro_tasks`.

El alta en el dashboard se realiza mediante registro propio del usuario, creación de su restaurante o alta manual desde administración mediante `admin_register_company`.

Aunque se utilicen el mismo correo o nombre comercial, actualmente eso no constituye una relación técnica formal.

### 2.4 Estado de las transferencias

| Transferencia | Estado |
|---|---|
| Radar → CRM | Implementada |
| Radar → Dashboard | No implementada |
| CRM → Dashboard | No encontrada |
| Recomendaciones Radar → Plan | No implementada |
| `place_id` → `organizations` | No implementada |
| `analysisId` → expediente del cliente | No implementada |

## 3. Diagnóstico y trabajo real

### 3.1 Relación conceptual

El modelo comercial previsto es:

```text
Radar inicial
  → detección de brechas
  → alta como cliente
  → plan personalizado
  → ejecución por Nexaro
  → comprobación
  → historial y mejora continua
```

En el código actual existe una separación entre los dos primeros bloques y el resto.

### 3.2 Hallazgos producidos por Radar

Radar produce:

- Snapshot del negocio.
- Comparación competitiva.
- Auditoría web.
- Demanda.
- Reputación.
- Puntuaciones.
- Fuga principal.
- Recomendaciones.
- Análisis complementario con IA.
- Lead consentido en el CRM.

### 3.3 Plan personalizado del dashboard

El dashboard contiene una plantilla de 36 acciones definida en `src/lib/restaurant-roadmap.ts`. Nexaro selecciona manualmente cuáles corresponden al restaurante y las almacena en `nexaro_tasks`.

La primera acción, `1A`, se llama “Analizar el restaurante y su presencia digital” y establece como prueba esperada “Radar inicial y comparación competitiva documentados”.

Sin embargo, la tarea no está vinculada mediante clave foránea al `analysisId` de Radar y las recomendaciones no generan automáticamente el plan.

### 3.4 Ejecución

El trabajo se registra de dos formas:

1. Pasos del plan en `nexaro_tasks`.
2. Intervenciones adicionales en `nexaro_work_entries`.

Una intervención adicional no completa automáticamente un paso del plan.

### 3.5 Validación

Un paso se considera validado cuando Nexaro lo marca como `completed`, mostrado al cliente como “Comprobado”.

Se conserva:

- Fecha.
- Estado.
- Administrador.
- Nota.
- Evidencia esperada definida en la plantilla.

### 3.6 Limitación de la evidencia

El dashboard no conserva todavía evidencias estructuradas como:

- Capturas.
- Archivos.
- URLs verificadas.
- Valores anteriores y posteriores.
- Métricas importadas de Radar.
- Identificador del análisis original.
- Aprobación del cliente.

La cadena hallazgo → acción → resultado existe funcionalmente, pero todavía no tiene trazabilidad automática de extremo a extremo.

## 4. Módulo de visibilidad existente

### 4.1 Ubicación y función

El módulo de visibilidad pertenece al dashboard, no a Radar.

Se encuentra en:

- `src/lib/visibility/`
- `src/app/admin/empresas/[organizationId]/visibilidad/`
- `src/app/app/visibilidad/`
- `src/app/api/visibility/jobs/route.ts`

Puede consultar modelos de OpenAI, Gemini y Perplexity.

### 4.2 Información reutilizada del restaurante

Al crear el proyecto de visibilidad, reutiliza parcialmente la organización:

| Campo | Procedencia |
|---|---|
| Marca | `organizations.name` |
| Dominio | `organizations.website` |
| Región | `organizations.city` |

El administrador completa manualmente:

- Variantes de marca.
- Servicios.
- Descripción.
- Público objetivo.
- País.
- Idioma.
- Objetivos.
- Preguntas.
- Competidores.
- Variantes de competidores.

No reutiliza automáticamente los datos de Radar.

### 4.3 Qué mide

Sobre las respuestas de IA mide:

- Presencia de la marca.
- Citación del dominio propio.
- Cobertura de preguntas.
- Cuota de voz.
- Menciones positivas.
- Citas de dominios considerados autoridad.
- Posición frente a menciones de competidores.

Conserva pregunta, proveedor, modelo, respuesta original, tokens, coste estimado, menciones, evidencias, citas, métricas y recomendaciones.

### 4.4 Reconocimiento actual de entidades

`src/lib/visibility/analysis.ts` utiliza:

- Nombre exacto de la marca.
- Variantes configuradas.
- Nombre del competidor.
- Variantes del competidor.
- Coincidencia textual normalizada.

La confianza es fija:

- Nombre exacto: `0.92`.
- Variante: `0.78`, marcada para revisión.

El sentimiento se calcula con listas de palabras positivas y negativas.

### 4.5 Comparación con datos comerciales reales

La comparación actual es limitada. El módulo puede comprobar si la IA menciona el nombre configurado, un alias, competidores o el dominio propio, y conserva el contexto textual y las citas.

No contrasta las afirmaciones de la IA con:

- `place_id`.
- Dirección oficial.
- Teléfono.
- Horarios.
- Categoría real de Google.
- Rating.
- Número de reseñas.
- Carta.
- Reservas.
- Atributos de Google.
- Resultados de Radar.
- Identidad canónica del establecimiento.
- Datos comerciales históricos.

Por tanto, mide visibilidad nominal y citas, no exactitud factual completa.

Existe riesgo de coincidencia entre negocios con nombres parecidos porque el reconocimiento se basa principalmente en texto. Todavía no existe resolución avanzada de entidades mediante ubicación, dominio, Google Place ID o conocimiento estructurado.

## 5. Mapa actual de sistemas

```text
Radar público
  identifica por place_id
  analiza Google, web y competencia
  captura lead
          │
          ▼
CRM Nexaro
  recibe el prospecto y el resumen
          │
          ▼
   [enlace pendiente]
          │
          ▼
Dashboard del restaurante
  organización + plan manual
  ejecución + comprobación
          │
          ▼
Módulo de visibilidad
  mide menciones y citas en IA
  sin reutilizar Radar ni validar aún la entidad completa
```

## 6. Conclusión para Entity Audit

La futura integración de Entity Audit no partiría de un sistema unificado. Tendría que considerar tres dominios actualmente separados:

1. La identidad pública observada por Radar.
2. La identidad comercial y el lead conservados en CRM.
3. La organización y su seguimiento operativo en el dashboard.

El identificador más fuerte que existe hoy para reconocer inequívocamente al establecimiento es el `place_id` de Radar, pero ese identificador todavía no llega al dashboard ni al módulo de visibilidad.

> **Nota de alcance:** este documento describe el estado encontrado en el código y la configuración local revisada. No se modificó código, no se alteró ninguna base de datos y no se diseñó todavía una solución de integración.
