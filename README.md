# BL Tracker

Tu biblioteca personal de manhwas / mangas / webtoons BL.

**Stack:** React 18 + Vite + TailwindCSS (frontend `app/`) · PHP 8.2 + MySQL (backend `api/`) · AniList + MangaDex.

## Estructura

```
BL/
├── app/        # Frontend React + Vite + PWA
├── api/        # Backend PHP (public/index.php es el entrypoint)
├── database/   # migrate.php crea la DB + 5 tablas
├── .env.example
```

## Desarrollo local (XAMPP)

1. Copiar env:
   ```bash
   cp .env.example .env
   # editar DB_PASS, JWT_SECRET, VITE_API_URL
   ```
2. Instalar dependencias:
   ```bash
   cd app && npm install
   cd ../api && composer install
   ```
3. Crear base de datos:
   ```bash
   php database/migrate.php
   ```
4. Correr en 2 terminales:
   ```bash
   cd api && php -S localhost:8000 -t public
   cd app && npm run dev  # http://localhost:5173
   ```

## Variables de entorno

Ver `.env.example`. Nunca commitear `.env` real. En producción (Vercel/Render) se configuran en el panel.

## Despliegue gratuito (uso personal)

- Frontend → Vercel / Cloudflare Pages (`app/`, build `npm run build`, output `dist`, `VITE_API_URL` apuntando a la API).
- Backend → Render Free (`api/public/`, Docker `php:8.2-apache`).
- DB → MySQL gratis (Aiven / Clever Cloud / PlanetScale), luego `php database/migrate.php` contra el host remoto.

Documentación extendida en `BL-TRACKER-DOCS.md`.
