# Despliegue en el VPS (HostGator · cPanel/WHM · CentOS 7)

Servidor: `162.214.196.37` (VPS compartido con otros negocios: **no tocar** su configuración).
Dirección temporal sin dominio propio: **`162.214.196.37.nip.io`** (nip.io resuelve cualquier subdominio a esa IP).

| Qué | Dirección |
|---|---|
| Plataforma | http://162.214.196.37.nip.io |
| Clínica demo | http://demo.162.214.196.37.nip.io |
| Agenda pública demo | http://demo.162.214.196.37.nip.io/agendar |

> Sin https por ahora (nip.io no garantiza certificado). Solo datos de prueba hasta tener dominio propio.

La aplicación vive aislada en su **propia cuenta de cPanel** (`veterinaria`): usuario, base de datos y carpeta propios.

---

## 1. WHM (como root) — una sola vez

1. **Crear la cuenta**: WHM → *Account Functions* → *Create a New Account*
   - Domain: `162.214.196.37.nip.io`
   - Username: `veterinaria`
   - Password: una fuerte (guardarla)
2. **Acceso SSH para la cuenta**: WHM → *Account Functions* → *Manage Shell Access* → `veterinaria` → **Normal Shell**.
3. **PHP 8.3 solo para esta cuenta**: WHM → *Software* → *MultiPHP Manager* → marcar `162.214.196.37.nip.io` → **PHP 8.3 (ea-php83)**.

## 2. cPanel de la cuenta `veterinaria`

1. **Subdominio comodín** (una dirección por clínica): *Domains* → *Create A New Domain*
   - Domain: `*.162.214.196.37.nip.io`
   - Document root: **`public_html`** (el mismo del dominio principal)
2. **Base de datos**: *Manage My Databases*
   - Crear base `veterinaria_app` y usuario `veterinaria_app` (contraseña fuerte)
   - Agregar el usuario a la base con **ALL PRIVILEGES**
3. **Cron**: *Cron Jobs* → cada minuto:
   ```
   /opt/cpanel/ea-php83/root/usr/bin/php /home/veterinaria/app/backend/artisan schedule:run >> /dev/null 2>&1
   ```

## 3. Servidor por SSH (como `veterinaria`, NO como root)

```bash
ssh veterinaria@162.214.196.37

# PHP 8.3 por defecto en la terminal de esta cuenta
echo "alias php=/opt/cpanel/ea-php83/root/usr/bin/php" >> ~/.bashrc && source ~/.bashrc

# Código
git clone <URL-DEL-REPOSITORIO> ~/app

# La carpeta pública del sitio apunta a backend/public
mv ~/public_html ~/public_html.original
ln -s ~/app/backend/public ~/public_html

# Configuración
cd ~/app/backend
cp .env.production.example .env
nano .env                 # DB_PASSWORD (y revisar el resto)
/opt/cpanel/composer/bin/composer install --no-dev -o 2>/dev/null || composer install --no-dev -o
php artisan key:generate

# Instalar / actualizar
cd ~/app && bash deploy.sh

# Solo la primera vez: clínica demo con datos de prueba
cd ~/app/backend && php artisan db:seed --force
```

## 4. Verificar

- http://demo.162.214.196.37.nip.io → pantalla de ingreso de la clínica demo
- Ingresar con `admin@demo.test` / `password` (usuarios demo en `ROADMAP.md`) y **cambiar la contraseña** desde *Mi perfil*
- Probar: subir foto de mascota, generar un PDF, agenda pública

## Actualizaciones posteriores

En el equipo de desarrollo: compilar el frontend (`cd frontend && npm run build`), commit y push. En el servidor:

```bash
cd ~/app && bash deploy.sh
```

## Cuando haya dominio propio

1. Apuntar en el DNS del dominio un registro `A` para `@` y otro para `*` a `162.214.196.37`.
2. En cPanel: agregar el dominio y `*.dominio` con document root `public_html`; AutoSSL emite los certificados.
3. En `backend/.env`: `APP_URL` y `TENANCY_CENTRAL_DOMAIN` → el dominio nuevo. Luego `bash deploy.sh`.

No hay que recompilar el frontend: Laravel le inyecta el dominio central.

## Respaldos

WHM → *Backup Configuration*: verificar que el respaldo diario incluya la cuenta `veterinaria` (archivos + base de datos).
