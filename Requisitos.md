# Documento de Especificación de Requisitos

## Contexto y Actores

**Actores identificados:**
* **Administrador de plataforma (PLATFORM_ADMIN):** Gestiona transversalmente la plataforma y puede consultar y administrar las organizaciones, grupos y usuarios según sus permisos.
* **Administrador de organización (ORG_ADMIN):** Responsable de la configuración de una empresa cliente, sus usuarios, grupos e invitaciones.
* **Miembro (MEMBER):** Usuario perteneciente a una organización y a uno o varios grupos. Solo puede acceder a las solicitudes de sus grupos.
* **Responsable de grupo:** No es un rol global. Es un miembro incluido en `manager_ids` de un grupo concreto y su responsabilidad se limita a ese grupo.
* **Sistema (SYS):** La plataforma web que autentica usuarios, aplica permisos y conserva las solicitudes y conversaciones.

### Matriz de acciones por actor

| Acción | PLATFORM_ADMIN | ORG_ADMIN | Responsable de grupo | MEMBER |
|---|---:|---:|---:|---:|
| Iniciar sesión y cerrar sesión | Sí | Sí | Sí | Sí |
| Consultar solicitudes | Todas las organizaciones | Todos los grupos de su organización | Sus grupos | Sus grupos |
| Crear solicitudes | En grupos autorizados | En cualquier grupo de su organización | En sus grupos | En sus grupos |
| Responder y consultar hilos | Según alcance de plataforma | Sus grupos | Sus grupos | Sus grupos |
| Cambiar el estado de solicitudes | Sí | Sí | En sus grupos | Sí, en sus grupos |
| Gestionar usuarios | Global | Su organización | No | No |
| Crear invitaciones | Global | Su organización | No | No |
| Crear, editar o eliminar grupos | Global | Su organización | No | No |
| Gestionar miembros y responsables | Global | Su organización | No | No |

La condición de responsable se determina por la relación del usuario con cada grupo. Una misma persona puede ser responsable de un grupo y miembro normal de otro.

---

## Requisitos Funcionales (RF) - *Casos de Uso*

### RF-01: Iniciar sesión
* **Prioridad:** Alta
* **Fuente:** Idea propuesta
* **Descripción:** El sistema debe permitir a los usuarios autenticarse mediante email y contraseña para acceder únicamente a las organizaciones, grupos y solicitudes autorizadas.

### RF-02: Gestionar usuarios de la organización
* **Prioridad:** Alta
* **Fuente:** Notas ("Hay clientes que tienen varias personas")
* **Descripción:** El sistema debe permitir al ORG_ADMIN consultar, invitar, crear, activar, desactivar, modificar y eliminar usuarios de su organización. Los usuarios creados podrán ser MEMBER y podrán asignarse a uno o varios grupos. El PLATFORM_ADMIN podrá realizar estas acciones de forma global. Ningún ORG_ADMIN podrá modificar al PLATFORM_ADMIN.

### RF-03: Crear nueva solicitud
* **Prioridad:** Alta
* **Fuente:** Notas ("Algunos temas son muy urgentes y otros simplemente son dudas")
* **Descripción:** El sistema debe permitir al PLATFORM_ADMIN, ORG_ADMIN y MEMBER crear una nueva solicitud en un grupo al que tengan acceso, seleccionando obligatoriamente su tipología, nivel de urgencia, grupo y descripción.

### RF-04: Enviar mensaje en solicitud
* **Prioridad:** Alta
* **Fuente:** Idea propuesta ("Apartado igual que WhatsApp Web")
* **Descripción:** El sistema debe permitir a los usuarios autorizados enviar mensajes de texto y adjuntos dentro del hilo de una solicitud de sus grupos. El acceso al hilo debe validarse en backend y no solo ocultarse en la interfaz.

### RF-05: Consultar estado de solicitudes
* **Prioridad:** Alta
* **Fuente:** Notas ("Nuestros clientes muchas veces no saben en qué estado está")
* **Descripción:** El sistema debe mostrar al usuario las solicitudes de los grupos a los que pertenece, indicando claramente el estado actual de cada una. El ORG_ADMIN podrá consultar todos los grupos de su organización y el PLATFORM_ADMIN podrá consultar el alcance global permitido.

### RF-06: Buscar solicitudes históricas
* **Prioridad:** Media
* **Fuente:** Notas ("Nos piden cosas que ya nos habían pedido")
* **Descripción:** El sistema debe permitir buscar solicitudes mediante palabras clave y filtrar por estado o fecha, limitando siempre los resultados a las solicitudes que el usuario pueda consultar por organización y grupo.

### RF-07: Sugerir solicitudes similares
* **Prioridad:** Baja
* **Fuente:** Notas ("Nos piden cosas que ya nos habían pedido")
* **Descripción:** Durante la creación de una nueva solicitud, el SYS debe sugerir solicitudes previas cerradas visibles para el usuario que contengan coincidencias con el título o texto que está escribiendo.

### RF-08: Invitación y registro de usuarios
* **Prioridad:** Alta
* **Fuente:** Deducción técnica (Seguridad)
* **Descripción:** Los nuevos usuarios solo podrán registrarse mediante un enlace de invitación único creado por un ORG_ADMIN o PLATFORM_ADMIN. La invitación definirá la organización, el rol global permitido y los grupos iniciales. Al usar el enlace, el usuario definirá su contraseña y completará su perfil.

### RF-09: Gestionar grupos
* **Prioridad:** Alta
* **Fuente:** Necesidad detectada durante la primera versión
* **Descripción:** El ORG_ADMIN y el PLATFORM_ADMIN deben poder crear, editar y eliminar grupos. Cada grupo pertenecerá a una organización y tendrá miembros y responsables asignados. Un responsable será siempre miembro del grupo y su responsabilidad no se aplicará automáticamente a otros grupos.

### RF-10: Gestionar pertenencia y responsables
* **Prioridad:** Alta
* **Fuente:** Necesidad detectada durante la primera versión
* **Descripción:** El ORG_ADMIN y el PLATFORM_ADMIN deben poder añadir y quitar usuarios de grupos y marcar miembros como responsables. El sistema debe impedir asignar como responsable a una persona que no sea miembro del grupo.

### RF-11: Administrar la plataforma
* **Prioridad:** Media
* **Fuente:** Necesidad detectada durante la primera versión
* **Descripción:** El PLATFORM_ADMIN debe disponer de permisos diferenciados para administrar organizaciones, usuarios y grupos de forma global, sin que su existencia elimine las restricciones de acceso aplicables a los usuarios de cada organización.

---

## Requisitos No Funcionales (RNF) - *Restricciones, Diseño y Arquitectura*

### RNF-01: Aislamiento de datos (Seguridad / Multi-tenant)
* **Prioridad:** Alta
* **Fuente:** Notas ("Cada cliente tiene su gente, y no queremos que unos vean lo de otros")
* **Descripción:** La arquitectura de datos y el backend deben garantizar que un usuario de una organización A no pueda acceder a datos de una organización B ni a solicitudes de grupos a los que no pertenece, ni siquiera manipulando URLs o APIs. El ORG_ADMIN tendrá alcance completo solo dentro de su organización.

### RNF-02: Interfaz de mensajería (Usabilidad)
* **Prioridad:** Alta
* **Fuente:** Idea propuesta ("Apartado igual que WhatsApp Web")
* **Descripción:** La vista de detalle de las solicitudes debe tener una interfaz de panel dividido (Master-Detail): a la izquierda el listado de solicitudes activas y a la derecha el chat cronológico de la solicitud seleccionada, simulando la experiencia de usuario de WhatsApp Web.

### RNF-03: Actualización en tiempo real (Rendimiento)
* **Prioridad:** Media
* **Fuente:** Idea propuesta ("Evitar que nos escriban por WhatsApp")
* **Descripción:** Los mensajes enviados y recibidos (RF-04), así como los cambios de estado (RF-05), deben reflejarse en la pantalla del usuario en tiempo real sin necesidad de recargar la página (usando tecnologías como WebSockets).

### RNF-04: Interfaz escalable modular (Mantenibilidad)
* **Prioridad:** Media
* **Fuente:** Notas ("En el futuro seguramente querremos añadir más funcionalidades")
* **Descripción:** El diseño del layout (front-end) debe utilizar un patrón de navegación ampliable (como una barra lateral tipo *sidebar*) que permita incorporar nuevas secciones sin alterar la estructura y la navegación de la aplicación actual.

### RNF-05: Persistencia y bases de datos (Arquitectura)
* **Prioridad:** Alta
* **Fuente:** Deducción técnica
* **Descripción:** Los datos estructurados deberán modelar organizaciones, usuarios, grupos, membresías, responsables, solicitudes y mensajes. En producción deberán almacenarse en una base de datos relacional para garantizar la integridad referencial. Los adjuntos se almacenarán en un servicio de objetos, conservando solo su referencia en la base de datos.

### RNF-07: Autorización por organización y grupo
* **Prioridad:** Alta
* **Fuente:** Necesidad detectada durante la primera versión
* **Descripción:** Los permisos deben comprobarse en el backend en cada lectura y modificación. La pertenencia a una organización no concede automáticamente acceso a todos sus grupos. La relación `manager_ids` solo identifica responsabilidad dentro del grupo correspondiente y no constituye un rol global.

### RNF-06: Copias de seguridad y retención (Disponibilidad / Legal)
* **Prioridad:** Alta
* **Fuente:** Normativa estándar (ej. RGPD)
* **Descripción:** El sistema de almacenamiento deberá realizar copias de seguridad incrementales diarias y completas semanales. Los datos de los chats y los adjuntos deberán conservarse de forma cifrada en reposo para cumplir con las normativas de protección de datos aplicables.
