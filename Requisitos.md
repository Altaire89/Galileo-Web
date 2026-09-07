# Documento de Especificación de Requisitos

## Contexto y Actores

**Actores identificados:**
* **Usuario Cliente Administrador (UCA):** Responsable de la cuenta del cliente.
* **Usuario Cliente (UC):** Empleado del cliente.
* **Sistema (SYS):** La plataforma web.

---

## Requisitos Funcionales (RF) - *Casos de Uso*

### RF-01: Iniciar sesión
* **Prioridad:** Alta
* **Fuente:** Idea propuesta
* **Descripción:** El sistema debe permitir a los usuarios (UCA y UC) autenticarse mediante credenciales (email y contraseña) para acceder a su área privada.

### RF-02: Gestionar usuarios de la organización
* **Prioridad:** Alta
* **Fuente:** Notas ("Hay clientes que tienen varias personas")
* **Descripción:** El sistema debe permitir al UCA dar de alta, modificar y dar de baja a otros usuarios (UC) pertenecientes a su misma organización.

### RF-03: Crear nueva solicitud
* **Prioridad:** Alta
* **Fuente:** Notas ("Algunos temas son muy urgentes y otros simplemente son dudas")
* **Descripción:** El sistema debe permitir al usuario (UCA y UC) crear una nueva solicitud seleccionando obligatoriamente su tipología (ej. duda, incidencia) y su nivel de urgencia.

### RF-04: Enviar mensaje en solicitud
* **Prioridad:** Alta
* **Fuente:** Idea propuesta ("Apartado igual que WhatsApp Web")
* **Descripción:** El sistema debe permitir al usuario enviar mensajes de texto y archivos adjuntos dentro del hilo de una solicitud específica previamente creada.

### RF-05: Consultar estado de solicitudes
* **Prioridad:** Alta
* **Fuente:** Notas ("Nuestros clientes muchas veces no saben en qué estado está")
* **Descripción:** El sistema debe mostrar al usuario un listado de todas las solicitudes de su organización, indicando claramente el estado actual de cada una (ej. abierta, en proceso, resuelta).

### RF-06: Buscar solicitudes históricas
* **Prioridad:** Media
* **Fuente:** Notas ("Nos piden cosas que ya nos habían pedido")
* **Descripción:** El sistema debe permitir al usuario buscar solicitudes mediante palabras clave y filtrar por estado o fecha, buscando en toda la base de datos de su organización.

### RF-07: Sugerir solicitudes similares
* **Prioridad:** Baja
* **Fuente:** Notas ("Nos piden cosas que ya nos habían pedido")
* **Descripción:** Durante la creación de una nueva solicitud (RF-03), el SYS debe sugerir enlaces a solicitudes previas cerradas que contengan coincidencias con el título o texto que el usuario está escribiendo.

### RF-08: Invitación y registro de usuarios
* **Prioridad:** Alta
* **Fuente:** Deducción técnica (Seguridad)
* **Descripción:** Los nuevos usuarios (UC) solo podrán registrarse mediante un enlace de invitación único enviado por correo electrónico por su administrador (UCA) o por la consultora. Al usar el enlace, el usuario definirá su contraseña y completará su perfil.

---

## Requisitos No Funcionales (RNF) - *Restricciones, Diseño y Arquitectura*

### RNF-01: Aislamiento de datos (Seguridad / Multi-tenant)
* **Prioridad:** Alta
* **Fuente:** Notas ("Cada cliente tiene su gente, y no queremos que unos vean lo de otros")
* **Descripción:** La arquitectura de la base de datos y del backend debe garantizar que un usuario de un cliente "A" bajo ninguna circunstancia (ni siquiera por manipulación de URLs o APIs) pueda acceder a los datos de un cliente "B".

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
* **Descripción:** Los datos estructurados (usuarios, solicitudes, metadatos de mensajes) deberán almacenarse en una base de datos relacional para garantizar la integridad referencial. Los archivos adjuntos enviados en los chats se almacenarán en un servicio de almacenamiento de objetos en la nube (ej. AWS S3), guardando solo la referencia (URL) en la base de datos.

### RNF-06: Copias de seguridad y retención (Disponibilidad / Legal)
* **Prioridad:** Alta
* **Fuente:** Normativa estándar (ej. RGPD)
* **Descripción:** El sistema de almacenamiento deberá realizar copias de seguridad incrementales diarias y completas semanales. Los datos de los chats y los adjuntos deberán conservarse de forma cifrada en reposo para cumplir con las normativas de protección de datos aplicables.