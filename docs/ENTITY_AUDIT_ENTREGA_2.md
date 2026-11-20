# Entity Audit — contrato previsto para la Entrega 2

Este documento delimita una necesidad aprobada para la siguiente entrega. No implementa campañas ni ejecuta auditorías.

## Versionado de campañas y preguntas

Cada campaña deberá conservar referencias inmutables a:

1. La versión exacta de `entity_identity_versions` utilizada como identidad oficial.
2. La versión del conjunto de preguntas estándar de Nexaro.
3. La versión del conjunto de preguntas personalizadas del restaurante.
4. La composición final y el orden de las preguntas efectivamente ejecutadas.

Una campaña podrá combinar preguntas estándar y personalizadas. Las preguntas deberán copiarse o referenciarse mediante versiones inmutables, de forma que una modificación posterior de las plantillas no altere campañas históricas ni impida repetir una medición bajo condiciones comparables.

## Precondición obligatoria

La auditoría inicial sólo podrá crearse o ejecutarse cuando el expediente tenga estado `ready` y la campaña referencie explícitamente una versión de identidad con estado `validated`. La existencia de un borrador no satisface esta condición.

## Fuera del alcance de la Entrega 1

- Modelo de campañas y ejecuciones.
- Catálogo de preguntas estándar.
- Preguntas personalizadas.
- Proveedores o automatizaciones externas.
- Integración con Radar, CRM o el motor de visibilidad existente.
