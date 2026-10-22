#!/usr/bin/env bash
#
# Despliegue en el servidor (cPanel). Ejecutar como el usuario de la cuenta,
# desde la raíz del repositorio:   bash deploy.sh
#
# Actualiza el código, instala dependencias, migra la base y regenera cachés.
# El frontend ya viene compilado en backend/public/spa (el servidor no necesita Node).

set -euo pipefail

PHP="${PHP:-/opt/cpanel/ea-php83/root/usr/bin/php}"
COMPOSER="${COMPOSER:-/usr/local/bin/composer}"
ROOT="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT"
echo "==> Actualizando código"
git pull --ff-only

cd "$ROOT/backend"

if [ ! -f .env ]; then
  echo "ERROR: falta backend/.env (copiar .env.production.example y completarlo)" >&2
  exit 1
fi

echo "==> Modo mantenimiento"
"$PHP" artisan down --retry=15 || true

echo "==> Dependencias PHP"
"$COMPOSER" install --no-dev --optimize-autoloader --no-interaction --no-progress

echo "==> Migraciones"
"$PHP" artisan migrate --force

echo "==> Enlace de archivos públicos"
[ -L public/storage ] || "$PHP" artisan storage:link

echo "==> Cachés"
"$PHP" artisan optimize:clear
"$PHP" artisan config:cache
"$PHP" artisan route:cache
"$PHP" artisan view:cache

echo "==> Saliendo de mantenimiento"
"$PHP" artisan up

echo "==> Listo: $(git -C "$ROOT" log -1 --format='%h %s')"
