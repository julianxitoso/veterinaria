# Roadmap de desarrollo

Basado en [PLAN_DESARROLLO_VETERINARIA.md](PLAN_DESARROLLO_VETERINARIA.md), ajustado para desplegar en **VPS con cPanel (sin Docker)**.

Leyenda: ✅ hecho · 🚧 en curso · ⬜ pendiente

---

## Accesos de desarrollo (datos demo)

> Solo para entorno local. Se crean con `php artisan migrate:fresh --seed`. **No usar en producción.**

**Arrancar el proyecto:** la API la sirve Herd automáticamente en http://veterinaria-api.test (sitio enlazado con `herd link veterinaria-api`). Solo hace falta el frontend:
```powershell
cd frontend; npm run dev          # App en http://localhost:5173
```
> No usar `php artisan serve` en Windows: no pasa la variable TEMP a PHP y fallan las subidas de archivos.

**Clínica demo** (slug `demo`) — entrar en http://localhost:5173

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | `admin@demo.test` | `password` |
| Veterinario | `veterinario@demo.test` | `password` |
| Recepcionista | `recepcionista@demo.test` | `password` |
| Asistente | `asistente@demo.test` | `password` |
| Contador | `contador@demo.test` | `password` |

**Agenda en línea para clientes** (sin usuario ni contraseña): http://localhost:5173/agendar

**Super admin de la plataforma** (sin clínica): `superadmin@app.test` / `password`
*Aún no tiene pantalla de acceso; su panel llega en la Fase 8.*

**Base de datos local:** SQLite (`backend/database/database.sqlite`). Pendiente pasar a MariaDB (falta la contraseña de `root`).

---

## Fase 1 — Arquitectura base ✅
- ✅ Backend Laravel 13 (API REST) en `backend/`
- ✅ Frontend React + Vite + Tailwind en `frontend/`
- ✅ Multi-tenant por subdominio (`{clinica}.dominio.com`) con `tenant_id` y header `X-Tenant` en desarrollo
- ✅ Login con Sanctum (tokens), aislado por clínica
- ✅ Roles y permisos por clínica (administrador, veterinario, recepcionista, asistente, contador)
- ✅ Comando `php artisan tenant:create` para dar de alta clínicas
- ✅ Layout con menú según permisos, branding básico por clínica

## Fase 2 — Clientes y mascotas (pacientes) ✅
- ✅ Clientes (responsables): CRUD, búsqueda por nombre, documento, teléfono o email; documento único por clínica
- ✅ Mascotas: CRUD, asociadas a un dueño, búsqueda por nombre, microchip o datos del dueño, filtro por especie
- ✅ Ficha del cliente con sus mascotas, ficha de la mascota con foto, edad calculada y alerta de alergias
- ✅ Borrado lógico; no se puede eliminar un cliente que tenga mascotas
- ✅ Permisos `pacientes.*` aplicados en API y en la interfaz

## Fase 3 — Consultas e historia clínica ✅
- ✅ Entrada de consulta: motivo, anamnesis, examen físico (peso, temperatura, FC, FR), diagnóstico, tratamiento, indicaciones, observaciones
- ✅ Medicamentos indicados (dosis, frecuencia, duración, vía) y exámenes solicitados con registro de resultado
- ✅ Fecha de control y notas de evolución; consulta abierta → cerrada (cerrada no se edita)
- ✅ El peso de la consulta más reciente actualiza el peso de la mascota
- ✅ Historia clínica por mascota (línea de tiempo): consultas, vacunas, desparasitaciones, procedimientos, notas; sin eliminación (solo archivado)
- ✅ Adjuntos privados (PDF, imágenes, Office), descarga solo con sesión de la clínica
- ✅ Listado de consultas con filtros por fecha, estado, veterinario y búsqueda
- ✅ Mejora de usabilidad para el médico:
  - Ficha de la mascota con resumen clínico (alergias, consulta en curso, control pendiente, vacunas vencidas/próximas)
  - Botón principal "Nueva consulta" y acciones rápidas: Vacuna, Desparasitar, Procedimiento, Nota
  - Historia con filtros (consultas, vacunas, procedimientos, notas)
  - Consulta con lo esencial visible y secciones plegables; "Guardar y seguir después" / "Finalizar consulta"
  - Vacunas y desparasitaciones aplicadas dentro de la misma consulta
- ⬜ Pendiente (opción C): permitir al autor corregir un registro rápido durante 24 h

## Fase 4 — Inventario ✅
- ✅ Productos con código, categoría, proveedor, unidad, costo, precio, IVA (0/5/19%), stock mínimo y vencimiento; margen calculado
- ✅ Movimientos (kardex): entradas con costo, factura, lote y vencimiento; salidas con motivo; ajustes por conteo físico
- ✅ El stock nunca queda negativo; cada cambio guarda motivo, usuario y saldo resultante
- ✅ Alertas: stock bajo, por vencer (30 días) y vencidos con existencias
- ✅ Productos no se borran: se desactivan conservando su historial
- ✅ En la consulta, los medicamentos se vinculan al inventario y se marca "Lo lleva" con cantidad
- ⏭️ El descuento de stock por venta se hace al facturar (Fase 5)

## Fase 5 — Facturación y documentos ✅
- ✅ Catálogo de servicios (consulta general se agrega sola al facturar una consulta); cada clínica nueva arranca con 5 servicios
- ✅ Factura desde la consulta (servicio + productos "lo lleva"), de mostrador o combinada; líneas libres
- ✅ Descuento % e IVA por línea; subtotal, descuento, IVA y total
- ✅ Estados: borrador (editable) → emitida (consecutivo, descuenta stock, finaliza la consulta) → anulada (devuelve stock)
- ✅ Pagos: efectivo, tarjeta, transferencia, Nequi, Daviplata; abonos parciales; pago al emitir
- ✅ Numeración por clínica (prefijo + consecutivo, no puede retroceder) y datos legales en los documentos
- ✅ PDFs con la marca de la clínica: factura, fórmula médica, orden de exámenes, historia clínica
- ⚠️ Es un comprobante interno: la factura electrónica DIAN está en la Fase 9

## Fase 6 — Administración de la clínica ✅
- ✅ Usuarios: crear, editar, cambiar rol, desactivar (cierra sus sesiones), restablecer contraseña, último ingreso
- ✅ Protecciones: nadie se cambia su propio rol ni se desactiva; siempre queda un administrador activo
- ✅ Roles y permisos: matriz editable por rol, roles personalizados; "administrador" bloqueado con todo
- ✅ Configuración → Clínica: nombre, razón social, NIT, contacto, logo y color con vista previa en vivo
- ✅ Configuración → Facturación: prefijo, consecutivo y pie de página
- ✅ Mi perfil: nombre, email y cambio de contraseña (cierra las demás sesiones)
- ✅ Auditoría: ingresos y fallidos, facturas emitidas/anuladas/pagos, ajustes y salidas de inventario, cambios de precio, consultas finalizadas, registros archivados, usuarios, permisos, configuración y eliminaciones; con filtros y detalle antes → después

## Citas por veterinario (adelantado de la Fase 8) ✅
- ✅ Horario semanal por veterinario (varios bloques por día) y duración de cita configurable
- ✅ Agenda del día con columna por veterinario, zonas fuera de horario, línea de "ahora"; clic en espacio libre para agendar
- ✅ Estados: solicitada → confirmada → atendida / cancelada / no asistió; reprogramar y reasignar; nunca se cruzan citas del mismo veterinario
- ✅ Agenda en línea pública (`/agendar`, sin login): veterinario opcional, solo horarios libres, anticipación mínima, límite de días, anti-bots (límite de intentos + campo trampa)
- ✅ Reconoce clientes existentes por cédula o teléfono; los nuevos se registran al confirmar la cita
- ✅ "Iniciar consulta" desde la cita (queda atendida y vinculada); próxima cita visible en la ficha de la mascota
- ✅ Enlace "¿Eres cliente? Agenda tu cita" en la pantalla de ingreso
- ✅ Aviso al cliente por WhatsApp con un clic (enlace wa.me con el mensaje listo): confirmación, recordatorio y cancelación; plantillas editables con variables y vista previa
- ⬜ Pendiente: envío automático (API oficial de WhatsApp de Meta) y recordatorios programados por email (Fase 8)

## Rediseño visual y celular ✅
- ✅ Diseño minimalista: tipografía Inter, neutros cálidos, íconos de línea (Lucide), estados en tonos pastel
- ✅ Menú agrupado, tablero de inicio con indicadores por rol, login en dos paneles
- ✅ Revisado con capturas en escritorio (1440 px) y celular (390 px)
- ✅ Documentación comercial en PDF: `docs/Documentacion-comercial-plataforma-veterinaria.pdf` (fuente en `docs/comercial/`, se regenera con Edge)

## Fase 7 — Despliegue en cPanel ⬜ *(pospuesta a pedido del usuario)*
- ⬜ Build de React servido por Laravel desde `public/` (mismo origen que la API)
- ⬜ Subdominio comodín `*.dominio.com` → `backend/public`, SSL (AutoSSL / Let's Encrypt)
- ⬜ MySQL/MariaDB de cPanel; cache, sesiones y colas con driver `database`
- ⬜ Cron: `php artisan schedule:run` cada minuto (incluye procesar la cola)
- ⬜ Backups automáticos (cPanel + `mysqldump` programado)
- ⬜ Script de despliegue (git pull, composer, migraciones, cachés)

## Fase 8 — Crecimiento (prioridad 2) ⬜
- ✅ Agenda de citas por veterinario (ver sección "Citas por veterinario")
- ⬜ Recordatorios de citas por email (y WhatsApp a futuro)
- ⬜ Reportes financieros y de inventario, dashboard ejecutivo
- ⬜ Panel super admin: clínicas, planes y límites por plan

## Fase 9 — Expansión (prioridad 3) ⬜
- ⬜ Facturación electrónica, pagos en línea, laboratorio
- ⬜ Multi-sucursal, exportación de reportes, analítica clínica
