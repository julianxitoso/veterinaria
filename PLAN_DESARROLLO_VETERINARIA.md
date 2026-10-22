# Plan de desarrollo: Sistema SaaS para clínicas veterinarias

## 1. Visión del producto

Desarrollar una plataforma web para gestionar una clínica veterinaria con enfoque en crecimiento a futuro como SaaS para múltiples clientes.

La primera versión será para una sola clínica, pero la arquitectura estará preparada para escalar a varias clínicas bajo el modelo multi-tenant, cada una con su propia información, usuarios, pacientes, inventario, facturación y configuración.

### Objetivo principal

Centralizar la operación clínica para que la veterinaria pueda:

- registrar y gestionar pacientes (animales)
- llevar la historia clínica por cada consulta
- controlar citas y seguimientos
- administrar inventario y ventas de productos
- facturar servicios y productos
- generar PDFs y documentos clínicos
- operar de forma organizada y escalable

### Modelo de negocio

- Producto tipo SaaS
- Una plataforma central con múltiples clientes
- Cada cliente vive en su propio subdominio
- Cobro mensual o anual por plan
- Posibilidad de vender el software a otras clínicas en un futuro cercano

---

## 2. Stack tecnológico recomendado

### Frontend
- React
- Vite o Create React App compatible con el proyecto
- Estado global: Zustand o Redux Toolkit
- Routing: React Router
- UI: Tailwind CSS o Bootstrap
- Formularios: React Hook Form + Yup
- Manejo de PDFs: jsPDF o react-pdf

### Backend
- Laravel
- API REST con Laravel Sanctum o JWT
- Controladores, servicios, jobs y tareas programadas
- Validación y lógica de negocio centralizada
- Módulos de permisos y roles

### Base de datos
- MySQL o MariaDB
- PostgreSQL no es requerido para esta decisión, pero MySQL/MariaDB es una buena opción para compatibilidad con hosting y facilidad de uso

### Infraestructura
- VPS Ubuntu
- Docker + Docker Compose
- Nginx o Traefik
- SSL con Let’s Encrypt
- Backups automáticos
- Redis para cache y cola

### Infraestructura multi-tenant
- Dominio principal: app.com
- Subdominios por cliente: cliente1.app.com, cliente2.app.com
- Un único backend y frontend compartidos
- Aislamiento por tenant_id en cada tabla crítica

---

## 3. Estrategia multi-tenant

### Opción elegida
Se recomienda multi-tenant por subdominio.

Ejemplo:

- app.com -> panel principal / administración de clientes
- clinica1.app.com -> clínica 1
- clinica2.app.com -> clínica 2

### Cómo se implementa

- Cada clínica es un tenant
- Cada usuario pertenece a un tenant
- Cada paciente, cita, producto, factura, historial, etc. pertenece a un tenant
- Las consultas y permisos se filtran por tenant
- La base de datos puede ser compartida con tenant_id en todas las tablas principales o separada por cliente, según crecimiento

### Recomendación inicial

Para empezar, usa esta estrategia:

- 1 base de datos principal
- campo tenant_id en tablas relevantes
- middleware o sesión para detectar el tenant actual por subdominio
- usuarios, roles y permisos filtrados por tenant

Esto permite vender más rápido y reducir la complejidad en la fase inicial.

---

## 4. Modelo de dominio principal

### Entidades clave

#### Tenant
- id
- nombre de la clínica
- razon social
- nit / documento legal
- email principal
- teléfono
- dirección
- logo
- configuración general
- plan actual
- estado activo/inactivo
- fecha de creación

#### User
- id
- tenant_id
- nombre
- email
- contraseña
- rol
- estado

#### Role
- id
- tenant_id
- nombre
- permisos

#### Client / Responsable del paciente
- id
- tenant_id
- nombre
- documento
- teléfono
- email
- dirección
- ciudad
- observaciones

#### Pet / Animal
- id
- tenant_id
- nombre
- especie
- raza
- sexo
- edad
- peso
- foto
- microchip (si aplica)
- dueño
- fecha de nacimiento
- alergias
- notas generales

#### ConsultationEntry
- id
- tenant_id
- pet_id
- user_id (veterinario)
- fecha
- motivo_consulta
- anamnesis
- observaciones
- examen_fisico
- diagnostico
- tratamiento
- indicaciones
- seguimiento
- estado

#### ClinicalHistory
- id
- tenant_id
- pet_id
- consultation_entry_id
- tipo_registro
- descripcion
- fecha
- archivo adjunto (si aplica)

#### Product
- id
- tenant_id
- nombre
- categoria
- proveedor
- codigo
- stock
- costo
- precio_venta
- unidad
- fecha_vencimiento
- activo

#### InventoryMovement
- id
- tenant_id
- product_id
- tipo (entrada, salida, ajuste, venta)
- cantidad
- motivo
- referencia
- fecha
- usuario

#### Appointment
- id
- tenant_id
- pet_id
- user_id
- cliente_id
- fecha_hora
- motivo
- estado
- observaciones
- recordatorio enviado

#### Invoice
- id
- tenant_id
- pet_id
- client_id
- user_id
- numero_factura
- fecha
- subtotal
- descuento
- total
- estado
- tipo_pago
- observaciones

#### InvoiceItem
- id
- tenant_id
- invoice_id
- type (consulta, producto, servicio, tratamiento)
- description
- quantity
- unit_price
- subtotal
- tax

#### Payment
- id
- tenant_id
- invoice_id
- monto
- metodo_pago
- estado
- fecha

#### Document
- id
- tenant_id
- related_model
- related_id
- tipo_documento
- nombre_archivo
- ruta_archivo
- fecha_creacion

---

## 5. Requerimientos funcionales del MVP

### 5.1 Autenticación y administración
- inicio de sesión para usuarios de la clínica
- roles: administrador, veterinario, asistente, contador, recepcionista
- permisos por módulo
- configuración de perfil y clínica

### 5.2 Pacientes
- registrar mascota
- registrar datos del dueño
- asociar mascota con dueño
- consultar historial por mascota
- editar información del paciente
- buscar por nombre, especie, documento o teléfono

### 5.3 Consultas y entrada de paciente
Cada vez que llega un paciente debe crearse una entrada con estos datos:

- fecha y hora
- motivo consulta
- síntomas o anamnesis
- examen físico
- diagnóstico
- tratamiento
- indicaciones
- exámenes solicitados
- medicamentos indicados
- fecha de control
- manejo de evolución
- observaciones medicas

Cada entrada debe quedar vinculada a la historia clínica y al paciente.

### 5.4 Historia clínica
- ver el historial completo del paciente
- agrupado por consultas y procedimientos
- ver evolución por fechas
- anexar archivos, examenes o órdenes
- vincular tratamientos y productos indicados
- registrar citas de seguimiento

### 5.5 Citas
- agendar citas
- calendarización por veterinario
- estado: pendiente, atendida, cancelada, reprogramada
- recordatorio por email o WhatsApp (futuro)
- filtro por día, veterinario o paciente

### 5.6 Inventario
- registro de productos
- categorización por tipo
- stock por producto
- entradas y salidas
- alerta de stock mínimo
- control de vencimientos
- movimientos por fecha

### 5.7 Productos indicados por el veterinario
- agregar productos a la consulta
- marcar si el cliente quiere llevárselos o no
- asociar a la historia clínica
- descontar del inventario si se venden
- vincular con la factura

### 5.8 Facturación
- factura por consulta
- factura por productos
- factura combinada
- total de servicio + productos
- descuento opcional
- impuesto si aplica
- forma de pago
- PDF listo para impresión

### 5.9 Documentos e impresiones
- factura PDF
- receta PDF
- historia clínica resumida
- nota de seguimiento
- orden de exámenes

### 5.10 Configuración y branding
- nombre de la clínica
- logo
- colores institucionales
- contacto
- impuestos
- numeración de facturas
- plantillas de documentos

---

## 6. Requerimientos no funcionales

### Seguridad
- autenticación segura
- permisos por rol
- validación de acceso por tenant
- protección de rutas y recursos
- auditoría de acciones críticas

### Escalabilidad
- diseño preparado para crecimiento de clientes
- base de datos con aislamiento funcional por tenant
- infraestructura con contenedores
- posibilidad de crecimiento modular

### Disponibilidad
- respaldo automático
- monitoreo básico
- logs profesionales
- alertas de errores

### Rendimiento
- consultas optimizadas
- paginación de listados
- caché para información frecuente

---

## 7. Flujo principal del producto

### Flujo de una consulta

1. El usuario entra al sistema
2. Busca o registra al dueño
3. Busca o registra la mascota
4. Crea una nueva entrada de consulta
5. Registra motivo, síntomas, diagnóstico, tratamiento
6. Añade exámenes, medicamentos o productos sugeridos
7. Define seguimiento o control futuro
8. Genera factura con la consulta y productos
9. Genera PDF para entrega o impresión
10. La información queda vinculada a la historia clínica del paciente

### Flujo de facturación

1. Consulta terminada
2. Se revisan servicios prestados
3. Se agregan productos indicados por el veterinario
4. Se calcula subtotal, descuento e impuesto
5. Se registra forma de pago
6. Se genera la factura PDF
7. Se marca la consulta como cerrada
8. Se actualiza stock del inventario si aplica

---

## 8. Módulos recomendados por prioridad

### Prioridad 1: MVP
- autenticación y roles
- gestión de clínicas / tenant
- gestión de clientes y mascotas
- entradas de consulta
- historia clínica
- inventario básico
- facturación básica
- PDF de factura

### Prioridad 2: crecimiento
- calendario de citas
- seguimientos automáticos
- recordatorios por email/WhatsApp
- reportes financieros
- reportes de inventario
- dashboard ejecutivo

### Prioridad 3: expansión
- integración con laboratorio
- integración con pagos electrónicos
- facturación electrónica
- exportación de reportes
- multi-sucursal
- analytics clínicos

---

## 9. Estructura recomendada del proyecto

### Backend (Laravel)
- app/
  - Http/Controllers
  - Models
  - Services
  - Repositories
  - Policies
  - Jobs
- database/
  - migrations
  - seeders
  - factories
- routes/
  - api.php
  - web.php
- config/
- resources/

### Frontend (React)
- src/
  - app/
  - components/
  - features/
  - pages/
  - routes/
  - hooks/
  - store/
  - services/
  - utils/

### Infraestructura
- docker/
- nginx/
- scripts/
- .env.example
- docker-compose.yml

---

## 10. Base de datos sugerida

### Tablas esenciales
- tenants
- users
- roles
- permissions
- clients
- pets
- consultations
- clinical_histories
- products
- inventory_movements
- appointments
- invoices
- invoice_items
- payments
- documents
- settings

### Recomendación de índice
- tenant_id en todas las tablas principales
- pet_id en consultas e historial
- client_id en facturas y citas
- product_id en movimientos e inventario
- appointment_date en citas

---

## 11. Reglas de negocio importantes

- cada paciente pertenece a un tenant
- cada consulta pertenece a un paciente y un veterinario
- cada movimiento de inventario debe estar relacionado con una venta o entrada
- cada factura debe estar ligada a una consulta o a productos vendidos
- la historia clínica no debe eliminarse, solo archivarse si aplica
- productos indicados en una consulta deben poder agregarse a una factura
- el cierre final de la cita debe requerir revisión de la factura

---

## 12. Seguridad y permisos sugeridos

### Roles sugeridos
- Super Admin
- Administrador de clínica
- Veterinario
- Asistente / Recepción
- Contador / Finanzas

### Permisos por módulo
- pacientes: ver/crear/editar/eliminar
- consultas: ver/crear/editar
- inventario: ver/crear/editar/mover stock
- facturas: crear/ver/cerrar
- configuración: ver/editar

---

## 13. MVP funcional mínimo para cerrar el primer cliente

Este es el punto más importante para no caer en un proyecto enorme.

### Entregable mínimo viable
- login con roles
- panel principal de clínica
- gestión de clientes y animales
- creación de consultas
- historia clínica por paciente
- registro de inventario básico
- ventas de productos desde la consulta
- facturación con PDF
- multi-tenant base para futuras clínicas

Esto ya es un producto muy útil para una clínica real.

---

## 14. Precio sugerido y modelo de venta

### Planes sugeridos

#### Plan Básico
- para 1 clínica
- hasta 3 usuarios
- inventario básico
- facturación básica
- PDF
- soporte estándar

#### Plan Profesional
- 5 a 10 usuarios
- inventario avanzado
- citas y seguimientos
- reportes
- soporte prioritario

#### Plan Premium / SaaS Multi-clínica
- múltiples clínicas o sucursales
- personalización de marca
- integraciones avanzadas
- soporte especializado
- dashboard central

### Modelo comercial
- mensual o anual
- onboarding inicial
- configuración de branding
- migración de datos
- soporte técnico

---

## 15. Estrategia de despliegue en VPS

### Infraestructura recomendada
- Ubuntu 22.04 o 24.04
- Docker Compose
- App backend (Laravel)
- App frontend (React)
- MySQL/MariaDB
- Redis
- Nginx/Traefik
- SSL con Let’s Encrypt
- Backups automáticos a almacenamiento externo

### Dominio y enrutamiento
- app.com para la plataforma principal
- client1.app.com para cada clínica
- custom domain opcional para clientes grandes

### Ambiente de desarrollo
- local con Docker
- staging para pruebas de cliente piloto
- producción para clientes reales

---

## 16. Roadmap recomendado de desarrollo

### Fase 1: Arquitectura base
- creación del repositorio
- configuración del backend Laravel
- configuración del frontend React
- base de datos MySQL/MariaDB
- autenticación y roles
- multi-tenant por subdominio

### Fase 2: Gestión clínica
- clientes y mascotas
- registro de consultas
- historia clínica
- agenda de citas

### Fase 3: Inventario
- productos
- stock
- movimientos
- alertas
- ventas

### Fase 4: Facturación y documentos
- facturas
- pagos
- PDF
- recetas
- documentos

### Fase 5: Producción
- despliegue en VPS
- SSL
- backups
- pruebas de estabilidad
- configuración de clientes

### Fase 6: Escalamiento
- dashboard de clínicas
- ventas de SaaS a otras veterinarias
- soporte por plan
- migración de más clientes

---

## 17. Recomendaciones clave para evitar un proyecto que se vuelva gigante

- no construir todo desde el inicio
- empezar con el MVP de clínica real
- separar módulos por prioridad
- diseñar la estructura multi-tenant desde el inicio
- crear los roles y permisos antes de construir la interfaz completa
- dejar facturación PDF y documentos en la fase 4, no en la fase 1
- preparar la arquitectura para otros clientes desde el primer día

---

## 18. Recomendación final del enfoque

La mejor decisión para este proyecto es:

- React + Laravel
- MySQL o MariaDB
- multi-tenant por subdominio
- módulo de citas incluido
- historia clínica central
- inventario + ventas + facturación
- arquitectura preparada para vender a varias clínicas

Esto te permite:

- vender el sistema a una clínica piloto
- validar el modelo real
- escalar a otras clínicas en el futuro
- crear una plataforma SaaS con crecimiento real

---

## 19. Siguiente paso recomendado

A partir de este documento, el siguiente paso debe ser:

1. definir la estructura exacta de módulos del MVP
2. crear el diagrama de base de datos
3. preparar el backlog por sprints
4. escoger la estructura exacta de carpetas en frontend y backend
5. iniciar desarrollo del primer sprint

Si quieres, en la siguiente entrega te preparo ya:

- el diagrama de base de datos
- el backlog completo por sprints
- la estructura de archivos del proyecto
- los módulos exactos para MVP
- y la primera versión de arquitectura técnica final
