# Decisiones del producto

## Propósito del documento

Este documento explica las decisiones tomadas para la primera versión de la aplicación solicitada en el documento "Prueba tecnica - Product Engineer_Full Stack Dev - Galileo Studio.pdf". La información de partida eran únicamente unas notas de reunión, por lo que algunas decisiones son hipótesis de producto que deberán validarse con el cliente antes de una segunda versión. Los requisitos iniciales extraídos de las notas se pueden encontrar en el fichero "Requisitos.md".

## Interpretación de producto

### Problema real

El problema principal no es simplemente sustituir el correo o WhatsApp por otra pantalla. Es la falta de trazabilidad de la relación de soporte:

- El cliente no sabe qué solicitudes están abiertas, en progreso o resueltas.
- Las conversaciones quedan dispersas en canales distintos.
- No existe un responsable ni un historial único por asunto.
- Las personas de una misma empresa pueden necesitar colaborar sin acceder a información de otros equipos.
- Se repiten consultas porque no existe un histórico fácil de buscar.

La solución se ha interpretado como un portal privado de solicitudes y conversaciones, con estado visible, historial centralizado, búsqueda y aislamiento por organización y grupo.

### Funcionalidades priorizadas

Se han implementado primero las capacidades que validan el flujo principal del producto:

1. **Autenticación e invitaciones**: el acceso es privado y el registro se realiza mediante invitación.
2. **Solicitudes**: creación con título, tipo, urgencia y descripción.
3. **Estados**: abierta, en progreso, resuelta y cerrada.
4. **Hilos de conversación**: cada solicitud tiene mensajes cronológicos.
5. **Panel master-detail**: listado de solicitudes a la izquierda y conversación a la derecha.
6. **Búsqueda y filtros**: búsqueda por título o mensajes, estado y fechas.
7. **Sugerencias**: se muestran solicitudes cerradas parecidas al redactar una nueva.
8. **Usuarios de organización**: altas, bajas, activación, desactivación e invitaciones.
9. **Grupos**: una solicitud pertenece a un grupo y los miembros solo ven los grupos a los que pertenecen.
10. **Responsables de grupo**: la responsabilidad se modela dentro del grupo, no como rol global del usuario.
11. **Administrador de plataforma**: se separa del administrador de cada organización.

Estas funcionalidades se priorizaron porque cubren directamente las frases de la reunión: transparencia del estado, colaboración entre personas, reducción de WhatsApp, histórico y aislamiento.

### Funcionalidades fuera de la primera versión

Se han dejado fuera, deliberadamente, varias capacidades que requieren decisiones de negocio o infraestructura adicional:

- Notificaciones por email, push o integraciones con WhatsApp/Teams/Slack.
- WebSockets y tiempo real estricto. La interfaz utiliza refresco periódico para el MVP.
- Carga real de archivos y almacenamiento de objetos. Los mensajes solo conservan metadatos de adjuntos.
- Base de datos relacional. La primera versión usa un documento JSON para acelerar la validación del flujo.
- Backups automáticos, cifrado en reposo y política formal de retención.
- Rate limiting, bloqueo progresivo y MFA.
- Recuperación y cambio de contraseña.
- Auditoría de acciones y registro de actividad.
- Gestión completa del administrador de plataforma y de organizaciones desde una consola propia.
- Páginas legales reales: los enlaces del footer son placeholders.

No se han incluido porque aumentaban el alcance sin resolver antes las incertidumbres principales del flujo de soporte.

### Preguntas para una V2

Antes de desarrollar la siguiente versión se deberían validar estas decisiones con el cliente:

#### Roles y permisos

- ¿Qué puede hacer exactamente el administrador de plataforma?
- ¿El administrador de organización puede ver todas las solicitudes de su empresa o solo las de sus grupos?
- ¿Qué acciones adicionales necesita un responsable de grupo?
- ¿Puede una solicitud pertenecer a varios grupos o solo a uno?
- ¿Quién puede cambiar el estado y cerrar definitivamente una solicitud?

#### Operación de soporte

- ¿La consultora necesita usuarios internos separados de los usuarios del cliente?
- ¿Debe asignarse cada solicitud a una persona concreta o basta con asignarla a un grupo?
- ¿Qué estados y transiciones son válidos?
- ¿Se necesitan comentarios internos no visibles para el cliente?
- ¿Hay prioridades o tiempos de respuesta comprometidos por contrato?
- ¿Qué ocurre cuando una solicitud se reabre después de cerrarse?

#### Comunicación

- ¿Qué notificaciones deben enviarse y a quién?
- ¿Se necesita email como canal de aviso, aunque la conversación quede en el portal?
- ¿Qué tamaño, tipos y número de archivos se permitirán?
- ¿Se necesita historial de cambios y confirmación de lectura?
- ¿El tiempo real debe ser WebSocket o es suficiente una actualización cada cierto intervalo?

#### Datos y cumplimiento

- ¿Qué periodo de conservación exige cada cliente?
- ¿Qué requisitos de RGPD, exportación y borrado existen?
- ¿Dónde se alojarán los datos y los adjuntos?
- ¿Qué frecuencia de backup y qué objetivo de recuperación se necesita?

#### Producto y uso

- ¿Cuántas organizaciones, usuarios, grupos y solicitudes se esperan en el primer año?
- ¿Se necesitan idiomas distintos del español?
- ¿Qué métricas demostrarían que se ha reducido el uso de WhatsApp?
- ¿Qué pantallas necesita el administrador de plataforma?
- ¿Qué contenido deben tener las páginas de privacidad, cookies y términos?

## Arquitectura

### Arquitectura elegida

Se ha separado la solución en dos aplicaciones:

- **Frontend**: Next.js con React y TypeScript.
- **Backend**: Flask en Python con una API REST.
- **Persistencia inicial**: documento JSON protegido por un lock de proceso y escritura atómica.

El frontend consume `/api/...` y Next.js reenvía esas peticiones al backend Flask. Esta separación permite sustituir la persistencia o desplegar el backend independientemente sin rehacer la interfaz.

Se eligió REST porque el dominio principal está compuesto por recursos claros: usuarios, invitaciones, grupos, solicitudes y mensajes. Para el MVP es más simple de probar y desplegar que introducir WebSockets o una arquitectura distribuida desde el inicio.

### Modelo de datos

El documento persistido contiene estas entidades principales:

- `organizations`: empresas cliente.
- `users`: identidad, organización, nombre, estado y rol global.
- `groups`: grupos pertenecientes a una organización.
- `group_members`: relación muchos-a-muchos entre usuarios y grupos.
- `requests`: solicitud, grupo, tipo, urgencia, estado y autor.
- `messages`: mensajes asociados a una solicitud.
- `invitations`: invitaciones pendientes o aceptadas.
- `sessions`: sesiones activas con expiración.

Los roles globales actuales son `PLATFORM_ADMIN`, `ORG_ADMIN` y `MEMBER`. La responsabilidad de un usuario no se guarda como rol global: cada grupo mantiene `manager_ids`, que siempre debe ser un subconjunto de sus miembros.

Las solicitudes contienen `org_id` y `group_id`. El backend comprueba ambos datos en cada lectura y mutación; la interfaz no es la frontera de seguridad.

### Decisiones de escalabilidad

Aunque el almacenamiento JSON es solo una solución de primera versión, el diseño prepara la evolución:

- Se mantienen IDs estables y relaciones explícitas.
- Se separan usuarios, grupos, solicitudes y mensajes en colecciones independientes.
- La pertenencia a grupos se modela como relación muchos-a-muchos.
- La API no expone directamente la estructura interna del almacén.
- El frontend utiliza un fetcher común y SWR para refresco y caché.
- El acceso por organización y grupo está centralizado en funciones de autorización.
- La migración de esquema permite actualizar datos antiguos sin perder solicitudes ni usuarios.
- Flask expone una aplicación WSGI compatible con despliegue independiente.

El siguiente paso de escalabilidad sería migrar estas mismas entidades a una base de datos relacional y usar almacenamiento de objetos para adjuntos, manteniendo los contratos de la API.

### Seguridad considerada

- Las contraseñas nuevas se almacenan con Argon2id.
- Los hashes PBKDF2 antiguos se verifican una última vez y se migran a Argon2id al iniciar sesión.
- Nunca se devuelve la contraseña en respuestas públicas.
- Las sesiones usan tokens aleatorios largos, expiración de ocho horas y cookies `HttpOnly`.
- En el almacén se guarda el digest SHA-256 de los tokens de sesión, no el token original.
- Los tokens de invitación también se almacenan mediante digest.
- El registro requiere una invitación no aceptada.
- Las contraseñas nuevas exigen longitud mínima, mayúscula, minúscula y número.
- Las peticiones se filtran por organización y grupo en el backend.
- CORS se configura con orígenes explícitos mediante `FRONTEND_ORIGIN`.
- Las operaciones administrativas se protegen por rol.

Quedan pendientes rate limiting, MFA, gestión de recuperación de contraseña, cifrado del almacén y una solución de persistencia con backups formales. El rate limiting y la base de datos relacional se reservan expresamente para una fase posterior.

## Estado de la entrega

### Terminado

- Frontend Next.js funcional.
- Backend Flask funcional.
- Proxy `/api` desde Next.js al backend.
- Login, registro por invitación y logout.
- Sesiones con cookies `HttpOnly` y expiración.
- Hashing de contraseñas con migración a Argon2id.
- Gestión de usuarios e invitaciones.
- Roles de plataforma, organización y miembro.
- Creación, edición y eliminación de grupos.
- Gestión de miembros y responsables de grupo.
- Aislamiento por organización y grupo.
- Creación y consulta de solicitudes.
- Mensajes en hilos.
- Cambio de estados.
- Búsqueda, filtros y sugerencias.
- Layout master-detail y navegación lateral.
- Footer con enlaces placeholder.
- Validaciones de lint, TypeScript, build y pruebas de permisos/autenticación realizadas durante la entrega.

### A medias

- **Tiempo real**: se consigue mediante refresco periódico, no mediante WebSockets.
- **Adjuntos**: se aceptan metadatos, pero no existe todavía subida ni almacenamiento de archivos.
- **Administrador de plataforma**: existe el rol y parte de la autorización, pero falta una consola completa para gestionar organizaciones.
- **Responsables de grupo**: ya se asignan dentro del grupo, pero todavía no tienen permisos adicionales diferenciados respecto a un miembro.
- **Invitaciones**: generan enlaces, pero no hay envío real de correo ni caducidad específica de invitación.
- **Persistencia**: hay migración de esquema y escritura atómica, pero sigue siendo un JSON local.
- **Footer legal**: los enlaces existen como placeholders, sin páginas ni textos legales.

### No tocado

- Integración con proveedores de email.
- Integraciones con WhatsApp, Teams, Slack o herramientas de ticketing.
- WebSockets o servidor de eventos.
- S3 u otro almacenamiento de objetos.
- Base de datos relacional.
- Backups automáticos y restauración probada.
- Rate limiting y protección contra fuerza bruta.
- MFA.
- Recuperación y cambio de contraseña.
- Auditoría completa.
- Métricas y analítica de uso.
- Internacionalización.
- Pruebas end-to-end automatizadas con navegador.

## Cómo continuar

### Fase 1: validar el MVP

1. Probar con usuarios reales de una organización.
2. Observar cómo crean solicitudes, usan grupos y consultan estados.
3. Medir dónde siguen recurriendo a email o WhatsApp.
4. Recoger ejemplos reales de permisos, estados y adjuntos.

### Fase 2: cerrar el modelo funcional

1. Confirmar roles y permisos con la consultora.
2. Definir estados, transiciones y responsables.
3. Definir política de adjuntos y notificaciones.
4. Definir requisitos de RGPD, retención y auditoría.
5. Acordar volúmenes, disponibilidad y objetivos de recuperación.

### Fase 3: preparar producción

1. Migrar el almacén JSON a PostgreSQL u otra base relacional.
2. Migrar adjuntos a almacenamiento de objetos con URLs firmadas.
3. Implementar backups y restauración verificada.
4. Añadir rate limiting, MFA y recuperación de contraseña.
5. Incorporar observabilidad, logs estructurados y alertas.
6. Configurar CI/CD, secretos por entorno y HTTPS obligatorio.

### Fase 4: mejorar la experiencia

1. Añadir notificaciones configurables.
2. Implementar tiempo real si el uso lo justifica.
3. Añadir auditoría visible para administradores.
4. Crear la consola completa de plataforma.
5. Publicar las páginas legales reales.
6. Añadir pruebas end-to-end y pruebas de aislamiento multi-tenant.
