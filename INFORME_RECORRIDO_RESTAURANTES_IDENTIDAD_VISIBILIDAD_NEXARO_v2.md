# Informe del recorrido de restaurantes, identidad y visibilidad de Nexaro

**Versión:** 2.0  
**Fecha de revisión:** 17 de octubre de 2026  
**Alcance:** documentación del estado actual; no constituye una propuesta de reorganización.

## 1. Fuentes revisadas

La definición principal del recorrido se encuentra en `src/lib/restaurant-roadmap.ts`. Para comprobar cómo se utiliza se revisaron también:

- `src/app/admin/empresas/[organizationId]/page.tsx`
- `src/app/admin/empresas/[organizationId]/actions.ts`
- `src/app/hoja-de-ruta/page.tsx`
- `src/app/trabajo-nexaro/page.tsx`
- `src/components/app/dashboard.tsx`
- `src/lib/visibility/runner.ts`
- `src/lib/visibility/metrics.ts`
- `src/lib/visibility/recommendations.ts`

La plantilla contiene seis fases de implementación y una séptima etapa recurrente. No define campos independientes para objetivo, prerrequisitos o resultados de fase; esas ideas se deducen del contenido de sus acciones y no representan reglas técnicas automáticas.

## 2. Mapa de las seis fases y mejora continua

### Fase 1 — Analizar el restaurante

**Periodo:** Semana 1.

**Objetivo reflejado por sus acciones:** obtener una fotografía inicial del restaurante, su presencia digital, competencia, accesos y rendimiento disponible en Google.

**Situación abordada:** ausencia de una referencia inicial fiable y desconocimiento sobre activos, accesos, reputación, competencia y rendimiento existente.

**Condiciones formales para avanzar:** no existen. Las pruebas previstas son el radar y comparación competitiva, el inventario de accesos y una fotografía inicial fechada.

**Resultados previstos:** línea base documentada para comparaciones posteriores.

### Fase 2 — Preparar la base digital

**Periodo:** Semanas 1–2.

**Objetivo reflejado por sus acciones:** corregir y ordenar información, carta, contenidos, medición, propiedad y seguridad de los activos digitales.

**Situación abordada:** datos contradictorios, carta poco funcional, contenidos desorganizados, medición incompleta y activos sin control claro.

**Condiciones formales para avanzar:** no existen. Acciones posteriores mencionan información y contenidos preparados en esta fase, pero el sistema no aplica ese requisito.

**Resultados previstos:** datos coherentes, carta móvil accesible, biblioteca de contenidos, medición comprobada y activos con responsables identificados.

### Fase 3 — Conseguir visibilidad y confianza

**Periodo:** Semanas 2–4.

**Objetivo reflejado por sus acciones:** mejorar el Perfil de Empresa de Google, la presencia local, la presentación visual y la gestión de reputación.

**Situación abordada:** baja visibilidad local, perfiles incoherentes, imágenes poco representativas y reseñas sin gestionar.

**Condiciones formales para avanzar:** no existen. Las acciones 3A y 3C hacen referencia textual a información y contenidos preparados previamente.

**Resultados previstos:** ficha de Google completa, perfiles locales coherentes, imágenes actuales y protocolo de gestión de reseñas.

### Fase 4 — Facilitar reservas y contacto

**Periodo:** Semanas 4–6.

**Objetivo reflejado por sus acciones:** simplificar el recorrido desde los canales digitales hasta la recepción y gestión de una reserva o contacto.

**Situación abordada:** enlaces rotos, canales confusos, solicitudes complejas, falta de responsables y ausencia de una prueba integral.

**Condiciones formales para avanzar:** no existen. El orden narrativo es auditar, elegir canal, simplificar, conectar, organizar y probar.

**Resultados previstos:** canal principal, solicitud móvil sencilla, enlaces correctos, procedimiento interno y una reserva de prueba completada.

### Fase 5 — Activar Wallet y fidelización

**Periodo:** Semanas 6–8.

**Objetivo reflejado por sus acciones:** construir el programa de fidelización, la tarjeta Wallet, el alta de clientes, la invitación voluntaria a reseñas y el NFC en mesa.

**Situación abordada:** inexistencia de un mecanismo propio para registrar clientes, conservar saldo o puntos y facilitar una relación posterior a la visita.

**Condiciones formales para avanzar:** no existen. El texto relaciona programa, Wallet, alta, reseñas, NFC, gestión de puntos y prueba completa, sin convertir esas relaciones en dependencias técnicas.

**Resultados previstos:** programa aprobado, Wallet emitida, alta funcionando, reseña y NFC verificados, movimientos registrados y recorrido completo probado.

### Fase 6 — Activar NFC en caja

**Periodo:** Semanas 8–12.

**Objetivo reflejado por sus acciones:** conectar la fidelización con una operación real en caja mediante un lector NFC compatible.

**Situación abordada:** falta de conexión entre pago, identificación del cliente, acreditación de puntos o saldo y actualización de Wallet.

**Condiciones formales para avanzar:** no existen. La acción 6D indica textualmente que se integra con la gestión construida en la fase 5.

**Resultados previstos:** hardware validado, operación definida, lector instalado, compra registrada en Wallet, personal preparado y prueba completa.

### Etapa 7 — Búsqueda de mejora permanente

**Periodo:** Recurrente.

**Objetivo reflejado por sus acciones:** consolidar resultados, compararlos con la fotografía inicial, revisar incidencias, informar y elegir la siguiente mejora.

**Situación abordada:** pérdida de continuidad y falta de medición después de las primeras intervenciones.

**Activación:** la interfaz la considera activa cuando las seis fases de implementación están completas. Esto no crea automáticamente las acciones 7A–7E.

**Resultados previstos:** datos mensuales validados, comparación con la línea base, revisión de trabajos, informe mensual y siguiente mejora acordada.

## 3. Inventario completo de acciones

### Fase 1

| Código | Nombre | Descripción | Evidencia | Dependencias explícitas |
|---|---|---|---|---|
| 1A | Analizar el restaurante y su presencia digital | Evaluamos el negocio, su radar digital y su reputación frente a competidores cercanos. | Radar inicial y comparación competitiva documentados. | Ninguna codificada. |
| 1B | Solicitar los accesos de administración | Reunimos los accesos a Google, web, dominio, redes, reservas y carta digital. | Inventario de accesos recibido y validado. | Ninguna codificada. |
| 1C | Extraer la primera fotografía de rendimiento | Registramos la situación inicial con los datos reales que Google ya tiene disponibles. | Fotografía inicial fechada y guardada como referencia. | Ninguna codificada. |

### Fase 2

| Código | Nombre | Descripción | Evidencia | Dependencias explícitas |
|---|---|---|---|---|
| 2A | Corregir la información básica | Unificamos nombre, dirección, teléfono, horarios, ubicación, servicios y enlaces. | Datos principales coherentes y comprobados desde móvil. | Ninguna codificada. |
| 2B | Ordenar y mejorar la carta digital | La carta debe abrir rápido, leerse bien en móvil y mostrar precios, alérgenos y propuesta. | Carta vigente, accesible y comprobada desde móvil. | Ninguna codificada. |
| 2C | Preparar los contenidos esenciales | Ordenamos logotipo, fotografías, descripciones, especialidades y elementos diferenciadores. | Biblioteca de contenidos organizada y aprobada. | Ninguna codificada. |
| 2D | Instalar o corregir la medición digital | Preparamos la medición de web, llamadas, WhatsApp, carta, indicaciones y reservas actuales. | Acciones de prueba registradas correctamente. | Ninguna codificada. |
| 2E | Proteger y ordenar los activos digitales | Ordenamos propietarios, permisos, recuperación, dominio, hosting y copias de seguridad. | Activos con propietario, recuperación y responsable identificados. | Ninguna codificada. |

### Fase 3

| Código | Nombre | Descripción | Evidencia | Dependencias explícitas |
|---|---|---|---|---|
| 3A | Optimizar el Perfil de Empresa de Google | Corregimos categorías, descripción, horarios, servicios, atributos, fotografías y enlaces. | Ficha publicada, completa y comprobada desde móvil. | Ninguna codificada; el texto utiliza información validada en la fase anterior. |
| 3B | Mejorar la presencia en búsquedas locales | Corregimos duplicados e incoherencias en mapas, buscadores y directorios relevantes. | Búsqueda documentada y perfiles principales sin contradicciones. | Ninguna codificada. |
| 3C | Mejorar la presentación visual | Publicamos imágenes actuales de fachada, sala, platos, ambiente y equipo. | Perfiles principales con imágenes actuales y representativas. | Ninguna codificada; el texto menciona contenidos preparados en la fase 2. |
| 3D | Gestionar la reputación digital existente | Revisamos puntuación, comentarios, reseñas sin responder y problemas repetidos. | Reseñas pendientes revisadas y protocolo de respuesta aprobado. | Ninguna codificada. |

### Fase 4

| Código | Nombre | Descripción | Evidencia | Dependencias explícitas |
|---|---|---|---|---|
| 4A | Revisar el recorrido actual de reservas | Localizamos pasos innecesarios, enlaces rotos, canales desatendidos y puntos de abandono. | Mapa inicial de reservas con errores identificados. | Ninguna codificada. |
| 4B | Definir el canal principal de reserva | Elegimos un destino prioritario y asignamos una función clara a los canales alternativos. | Canal principal y responsable aprobados. | Ninguna codificada. |
| 4C | Simplificar la solicitud de reserva | Reducimos la solicitud a nombre, fecha, hora, personas, teléfono y observaciones necesarias. | Solicitud completada fácilmente desde móvil. | Ninguna codificada. |
| 4D | Conectar los canales actuales | Google, web, redes, carta, teléfono y WhatsApp deben llevar al destino correcto. | Todos los accesos conducen al destino correcto. | Ninguna codificada. |
| 4E | Organizar la atención de solicitudes | Definimos responsable, tiempo de respuesta, confirmación, modificación, cancelación y fuera de horario. | Procedimiento aprobado y utilizable por el equipo. | Ninguna codificada. |
| 4F | Comprobar el recorrido completo | Verificamos después de los cambios que cada solicitud llega, se confirma y registra su origen. | Reserva o contacto completado de principio a fin. | Ninguna codificada; verifica funcionalmente el recorrido anterior. |

### Fase 5

| Código | Nombre | Descripción | Evidencia | Dependencias explícitas |
|---|---|---|---|---|
| 5A | Definir el programa de fidelización | Establecemos puntos o saldo, recompensas, vencimientos y condiciones de uso. | Programa y condiciones aprobados. | Ninguna codificada. |
| 5B | Construir la tarjeta Wallet | Creamos la tarjeta para Apple Wallet y Google Wallet con la identidad del restaurante. | Tarjeta emitida y añadida correctamente en ambos sistemas. | Ninguna codificada. |
| 5C | Crear el alta de clientes | Preparamos un formulario breve, consentimiento y registro seguro de cada cliente. | Cliente de prueba registrado y tarjeta emitida. | Ninguna codificada; el texto establece conexión con la emisión de Wallet. |
| 5D | Preparar la invitación a dejar una reseña | Creamos un acceso voluntario a Google sin vincular la reseña con puntos o recompensas. | Invitación y enlace de reseña verificados. | Ninguna codificada. |
| 5E | Activar NFC en la mesa | Una etiqueta NFC abre dos acciones claras: añadir Wallet o dejar voluntariamente una reseña. | NFC leído correctamente desde la mesa con distintos móviles. | Ninguna codificada; relación textual con Wallet y reseñas. |
| 5F | Construir la gestión de puntos y recompensas | Registramos movimientos, saldo, recompensas e historial de cada cliente. | Movimientos, saldo y canje registrados correctamente. | Ninguna codificada. |
| 5G | Probar el recorrido completo | Probamos lectura NFC, alta, Wallet, reseña, puntos y recompensa con un cliente de prueba. | Recorrido de fidelización completado sin errores. | Ninguna codificada; verifica expresamente los componentes anteriores. |

### Fase 6

| Código | Nombre | Descripción | Evidencia | Dependencias explícitas |
|---|---|---|---|---|
| 6A | Validar la solución técnica | Comprobamos qué lector, dispositivo o terminal es compatible con Wallet y la operación del local. | Solución técnica documentada y aprobada. | Ninguna codificada. |
| 6B | Definir la operación en caja | Precisamos cómo identificar, acreditar, canjear y corregir una operación. | Operación de caja aprobada paso a paso. | Ninguna codificada. |
| 6C | Instalar y configurar el lector NFC | Preparamos el dispositivo y comprobamos que reconoce la tarjeta Wallet. | Lector operativo y tarjeta identificada correctamente. | Ninguna codificada. |
| 6D | Conectar el lector con la fidelización | La compra actualiza puntos, saldo o recompensas y conserva el historial. | Compra acreditada y registrada correctamente en Wallet. | Ninguna codificada; el texto indica integración con la gestión construida en la fase 5. |
| 6E | Preparar al personal de caja | El equipo aprende a acreditar, canjear, corregir y resolver una lectura fallida. | Personal designado capaz de completar la operación. | Ninguna codificada. |
| 6F | Probar una operación completa | Realizamos una compra, lectura, acreditación o canje y actualización de Wallet. | Operación completada sin intervención técnica. | Ninguna codificada; verifica funcionalmente la operación anterior. |

### Mejora continua

| Código | Nombre | Descripción | Evidencia | Dependencias explícitas |
|---|---|---|---|---|
| 7A | Recoger y validar los resultados | Consolidamos datos de Google, web, contactos, reservas, Wallet y NFC. | Datos mensuales consolidados y validados. | Ninguna codificada. |
| 7B | Comparar con la fotografía inicial | Medimos los cambios frente a la referencia guardada en la fase 1. | Comparación mensual documentada. | Ninguna codificada; referencia textual explícita a la fase 1. |
| 7C | Revisar incidencias y trabajos realizados | Comprobamos errores, pendientes, acciones completadas y resultados obtenidos. | Incidencias y trabajos del periodo revisados. | Ninguna codificada. |
| 7D | Entregar el informe mensual | Mostramos qué cambió, qué hizo Nexaro y qué necesita atención. | Informe mensual entregado y revisado. | Ninguna codificada. |
| 7E | Elegir la siguiente mejora prioritaria | Definimos una acción concreta para el siguiente ciclo y actualizamos el recorrido. | Siguiente mejora acordada y registrada. | Ninguna codificada. |

## 4. Funcionamiento real del recorrido

### Plantilla y estados

`restaurant-roadmap.ts` define `key`, código, fase, periodo, título, descripción, necesidad del restaurante, acción de Nexaro, evidencia, responsable y prioridad. Los estados disponibles son `pending`, `in_progress`, `completed` y `cancelled`.

### Selección y recorrido personalizado

El administrador selecciona las acciones aplicables. `assignRestaurantRoadmapSteps()` valida las claves e inserta o reactiva registros en `nexaro_tasks`. Las tareas del recorrido se reconocen por `source_reference = restaurant:<key>`.

`mergeRestaurantRoadmapTasks()` combina la plantilla con el estado, nota, fecha prevista y fecha realizada. `assignedRestaurantRoadmapSteps()` devuelve únicamente acciones almacenadas y no canceladas.

### Orden y dependencias

El orden visual es fijo, pero no obligatorio en el backend. Se puede asignar o completar una acción posterior sin completar las anteriores. No existe un campo de dependencias ni validación de prerrequisitos.

`getCurrentRestaurantStep()` elige primero la primera acción `in_progress` y, si no existe, la primera `pending`, respetando el orden de la plantilla.

### Progreso

`getRestaurantRoadmapProgress()` calcula el avance por fases. Una fase queda completa cuando tiene al menos una acción asignada y todas las acciones asignadas están completadas. Esto implica que una fase puede completarse aunque no se hayan asignado todas sus acciones de plantilla.

El porcentaje principal es `fases completadas / 6`. La mejora continua no forma parte de ese porcentaje.

### Ejecución y comprobación

`updateRestaurantRoadmapStep()` guarda estado, nota, fecha prevista y fecha realizada. Al completar registra `completed_at` y `completed_by`.

El campo `evidence` describe la comprobación esperada, pero la tarea no obliga a adjuntar archivos, fotografías, URL, capturas o valores medidos. Actualmente “Comprobado” es una validación administrativa, no una prueba estructurada obligatoria.

### Historial y vista del cliente

La página `src/app/trabajo-nexaro/page.tsx` combina entradas manuales de `nexaro_work_entries` con acciones completadas del recorrido. El cliente ve fases, porcentaje, fase actual, siguiente acción, estados, explicación del trabajo, comprobación y notas de Nexaro.

La mejora continua se muestra al completar las seis fases, pero sus acciones no se asignan ni ejecutan automáticamente.

## 5. Acciones relacionadas con identidad y visibilidad

| Capacidad | Acciones relacionadas | Estado actual |
|---|---|---|
| Identidad comercial | 1A, 2A, 2C, 3A, 5B | Distribuida entre varias acciones; no existe una entidad única de identidad digital. |
| Nombre, dirección, teléfono y horarios | 2A, 3A, 3B; parcialmente 4D | Contemplado explícitamente, especialmente en 2A y 3B. |
| Google Business Profile | 1B, 1C, 3A, 3C, 3D, 5D | Contemplado desde acceso y línea base hasta optimización y reseñas. |
| Sitio web | 1B, 2B, 2D, 2E, 4A, 4D, 4F | Contemplado en acceso, medición, carta, seguridad y conversión. |
| Datos estructurados | Ninguna | No aparecen Schema.org, JSON-LD, Restaurant, LocalBusiness ni identificadores de entidad. |
| SEO local | 2A, 3A, 3B | Contemplado parcialmente, aunque no existe una acción denominada auditoría SEO local. |
| Reputación y reseñas | 1A, 3D, 5D, 5E, 5G | Contemplado explícitamente. |
| Visibilidad en buscadores | 1A, 1C, 2D, 3A, 3B, 7A, 7B | Contemplada mediante presencia, Google, Search Console y comparación temporal. |
| Visibilidad en asistentes de IA | Ninguna acción de la plantilla | Existe un módulo separado, pero no una acción del recorrido. |
| Análisis competitivo | 1A | Contemplado directamente sólo en la línea base. |
| Medición de resultados | 1C, 2D, 4F, 5G, 6F, 7A, 7B, 7C, 7D | Contemplada como línea base, pruebas y revisión recurrente. |
| Seguimiento posterior | 4F, 5G, 6F y 7A–7E | La etapa 7 concentra el seguimiento periódico. |

## 6. Relación con el módulo de visibilidad en IA

### Funcionamiento del módulo

El módulo es funcionalmente independiente del recorrido. `src/lib/visibility/runner.ts` ejecuta consultas aprobadas contra OpenAI, Gemini y Perplexity y conserva respuestas, menciones de marca y competidores, posiciones, sentimiento, citaciones, métricas, consumo y recomendaciones.

`src/lib/visibility/metrics.ts` contempla presencia, citación, cobertura, Share of Voice, sentimiento positivo, autoridad y posición competitiva.

### Relación con las fases

- No se activa desde una fase determinada.
- No existe relación automática entre 1A y una auditoría inicial de IA.
- No existe relación automática entre 7B y una medición posterior.
- Sus resultados no completan acciones ni fases.

### Recomendaciones e intervenciones

Las recomendaciones pueden convertirse en tareas con `source = visibility`. Estas no son acciones del recorrido porque no utilizan el prefijo `restaurant:`. Por ello no modifican el porcentaje ni el estado de las fases.

### Mediciones antes y después

El sistema conserva diferentes ejecuciones, fechas, respuestas, menciones, citaciones e instantáneas de métricas. Puede ejecutarse una medición antes y otra después de una intervención.

No existe, sin embargo, una relación estructurada que identifique una ejecución como línea base, otra como medición posterior y una intervención concreta como el trabajo realizado entre ambas. Tampoco hay un cálculo causal automático del impacto.

### Comparación

Los datos históricos necesarios para comparar están almacenados y pueden inspeccionarse o filtrarse. No se verificó un modelo específico de comparación antes/después vinculado a una intervención determinada.

Completar una corrección técnica no demuestra automáticamente una mejora en visibilidad. La mejora sólo puede afirmarse tras repetir las consultas bajo condiciones comparables y evaluar los resultados observados.

## 7. Aspectos no implementados o no verificables

### No implementados en el recorrido

- Dependencias técnicas entre acciones.
- Bloqueo de fases por orden.
- Requisitos automáticos de entrada y salida.
- Evidencias adjuntas estructuradas por acción.
- Asociación entre mediciones de IA e intervenciones concretas.
- Clasificación formal de una ejecución como auditoría inicial o posterior.
- Cálculo automático de cambios entre auditorías.
- Influencia de las métricas de visibilidad sobre el estado del recorrido.
- Acción explícita de reconocimiento de entidades digitales.
- Acción explícita de visibilidad en asistentes de IA.
- Acción explícita de datos estructurados Schema.org.
- Verificación automática de la exactitud de los datos comerciales dentro de respuestas de IA.
- Creación automática de las acciones recurrentes al completar las seis fases.

### Implementación parcial

- El historial cronológico conserva trabajos y acciones completadas, pero no vincula pruebas y métricas de manera estructurada.
- El módulo de visibilidad conserva ejecuciones históricas, pero no las vincula formalmente a una intervención.
- Cada acción define qué debería comprobarse, pero no obliga a guardar la prueba.
- Nexaro personaliza el recorrido, aunque una fase puede completarse con sólo las acciones seleccionadas.
- La mejora continua está definida y representada visualmente, pero no constituye un ciclo automático.

### No verificable únicamente desde estas definiciones

- Que todas las pruebas descritas se hayan realizado realmente.
- Que las evidencias existan fuera de la aplicación.
- Que Google Business Profile o Search Console estén conectados por API.
- Que Wallet y NFC estén operativos en producción.
- Que los informes mensuales se generen automáticamente.
- Que las recomendaciones de visibilidad se hayan aplicado.
- Que un cambio observado sea consecuencia directa de una intervención de Nexaro.

## 8. Conclusión

El recorrido actual ya expresa la secuencia conceptual:

```text
situación inicial → intervención → comprobación → seguimiento
```

La fase 1 establece la línea base; las fases 2–6 organizan las intervenciones; y la etapa 7 propone medir, comparar y abrir un nuevo ciclo. Sin embargo, la conexión sigue siendo metodológica y visual.

El módulo de visibilidad conserva ejecuciones, respuestas y métricas, pero funciona en paralelo al recorrido. Nexaro puede documentar que corrigió una información o completó un trabajo, pero no debe interpretar esa finalización como prueba automática de mejora en buscadores o asistentes de IA. Esa mejora requiere una medición posterior comparable y una evaluación separada del trabajo técnico ejecutado.
