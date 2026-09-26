# BL Tracker - Documentación Completa

## 📋 Resumen del Proyecto

**BL Tracker** - Aplicación web personal para rastrear manhwas/mangas/webtoons BL (Boys' Love)

### Stack Tecnológico
- **Frontend**: React 18 + Vite + TailwindCSS 3.4 + Framer Motion
- **Backend**: PHP 8.2 (MVC simple) + MySQL
- **APIs Externas**: AniList (GraphQL) + MangaDex (REST)
- **Autenticación**: JWT (firebase/php-jwt)
- **UI Components**: shadcn/ui style + Lucide React icons

---

## 🏗️ Estructura del Proyecto

```
C:\xampp\htdocs\BL\
├── api/                      # Backend PHP
│   ├── config/               # DB, JWT, CORS, AniList, MangaDex
│   ├── controllers/          # Auth, Manhwa, Library, Chapter, User
│   ├── middleware/           # AuthMiddleware (JWT)
│   ├── models/               # User, Manhwa, Library, Chapter
│   ├── routes/               # api.php (router único)
│   ├── services/             # AniListService, MangaDexService, JwtService
│   ├── public/               # index.php + .htaccess
│   ├── vendor/               # Composer deps
│   └── composer.json
├── app/                      # Frontend React
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/           # Button, Input, Card, Badge, Modal, Skeleton
│   │   │   ├── layout/       # Navbar, Footer, Layout
│   │   │   ├── manhwa/       # ManhwaCard, ChapterProgress
│   │   │   ├── library/      # (vacío)
│   │   │   ├── search/       # SearchBar, SearchFilters, SearchResults
│   │   │   ├── dashboard/    # (vacío)
│   │   │   └── auth/         # ProtectedRoute, GuestRoute
│   │   ├── pages/            # Dashboard, Library, Search, ManhwaDetail, Favorites, Settings, Login, Register
│   │   ├── services/         # api.js (axios + interceptors)
│   │   ├── context/          # AuthContext
│   │   ├── hooks/            # (vacío - listo para useAblySubasta)
│   │   ├── utils/            # helpers.js
│   │   ├── App.jsx           # Rutas con ProtectedRoute/GuestRoute
│   │   ├── main.jsx          # Entry + Toaster
│   │   └── index.css         # Tailwind + animaciones + paleta BL
│   ├── public/
│   ├── package.json
│   ├── tailwind.config.js    # Paleta: cream, sand, rose, sage, butter
│   ├── vite.config.js        # Proxy /api → http://localhost:8000
│   └── postcss.config.js
├── database/
│   └── migrate.php           # Crea 5 tablas
├── .env                      # Configura DB_PASS aquí
├── .env.example
└── package.json              # Scripts raíz
```

---

## 🎨 Paleta de Colores (Tailwind)

```js
colors: {
  bl: {
    cream: '#EEEFE8',      // Fondo principal
    sand: '#C9B297',       // Acento cálido
    rose: '#E9ACBB',       # Rosa BL
    sage: '#8FBC93',       // Verde suave
    butter: '#FCEBBF',     // Amarillo mantequilla
    creamDark: '#E0E1D8',
    sandDark: '#B8A085',
    roseDark: '#D89BAA',
    sageDark: '#7FAB83',
    butterDark: '#EBDCB0',
  }
}
```

---

## ⚡ Animaciones (Framer Motion + Tailwind)

```css
/* Keyframes personalizados */
fade-in, slide-up, slide-down, scale-in, pulse-soft, float, shimmer

/* Clases utilitarias */
.animate-in, .delay-100..500, .skeleton, .shimmer, .glass
```

---

## 🗄️ Esquema de Base de Datos

### users
```sql
id, name, email, password_hash, avatar, created_at, updated_at
```

### manhwas
```sql
id, anilist_id (UNIQUE), mangadex_id (UNIQUE), title, title_english, title_romaji, title_native,
description, cover_image, banner_image, genres (JSON), tags (JSON),
status (ENUM), format, source, chapters, volumes,
start_date, end_date, season, season_year, country_of_origin,
is_licensed, is_adult, average_score, popularity, favourites,
created_at, updated_at
```

### library
```sql
id, user_id (FK), manhwa_id (FK), 
status (ENUM: LEYENDO, PENDIENTE, COMPLETADO, PAUSADO, ABANDONADO, RELECTURA),
current_chapter, favorite, score, notes, started_at, finished_at,
created_at, updated_at
UNIQUE(user_id, manhwa_id)
```

### chapters
```sql
id, manhwa_id (FK), mangadex_chapter_id (UNIQUE),
chapter_number (DECIMAL), title, volume, language, pages, publish_date, created_at
```

### user_settings
```sql
user_id (PK), theme, default_view, notifications_new_chapters, 
notifications_weekly, notifications_recommendations, language
```

---

## 🔌 Endpoints API

### Auth
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/register` | Registro + JWT |
| POST | `/auth/login` | Login + JWT |
| GET | `/auth/me` | Usuario actual |
| PUT | `/auth/profile` | Actualizar perfil |
| PUT | `/auth/password` | Cambiar contraseña |
| DELETE | `/auth/account` | Eliminar cuenta |

### Manhwas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/manhwa/search?q=...` | Buscar en AniList |
| GET | `/manhwa/:id` | Detalle por ID local |
| GET | `/manhwa/anilist/:anilist_id` | Buscar/crear por AniList ID |
| POST | `/manhwa/from-anilist` | Crear desde AniList ID |
| POST | `/manhwa/:id/update-chapters` | Sincronizar capítulos MangaDex |
| GET | `/manhwa/genres` | Lista géneros |
| GET | `/manhwa/tags` | Lista tags |

### Library
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/library` | Biblioteca del usuario (filtros, paginación) |
| GET | `/library/:manhwa_id` | Entrada específica |
| POST | `/library` | Añadir a biblioteca |
| PUT | `/library/:manhwa_id` | Actualizar entrada |
| PATCH | `/library/:manhwa_id/progress` | Actualizar capítulo |
| PATCH | `/library/:manhwa_id/favorite` | Toggle favorito |
| DELETE | `/library/:manhwa_id` | Eliminar |
| GET | `/library/stats` | Estadísticas |
| GET | `/library/new-chapters` | Capítulos nuevos |

### Chapters
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/chapters/:manhwa_id` | Capítulos de un manhwa |
| POST | `/chapters/:manhwa_id/update` | Actualizar desde MangaDex |
| GET | `/chapters/new` | Capítulos nuevos del usuario |
| PATCH | `/chapters/:chapter_id/read` | Marcar como leído |

---

## 🚀 Instalación y Ejecución

### 1. Configurar .env
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=bl_tracker
DB_USER=root
DB_PASS=tu_password_mysql  # Si XAMPP sin pass, dejar vacío

JWT_SECRET=bl-tracker-super-secret-jwt-key-2024-change-in-production-min-32-chars
JWT_EXPIRATION=604800

MANGADEX_USERNAME=
MANGADEX_PASSWORD=

VITE_API_URL=http://localhost/BL/api
```

### 2. Migración DB
```bash
cd C:\xampp\htdocs\BL\database
php migrate.php
# Debe salir: ✅ Migración completada exitosamente
```

### 3. Instalar dependencias
```bash
# Frontend
cd C:\xampp\htdocs\BL\app
npm install

# Backend
cd C:\xampp\htdocs\BL\api
composer install
```

### 4. Ejecutar (2 terminales)

**Terminal 1 - API PHP:**
```bash
cd C:\xampp\htdocs\BL\api
php -S localhost:8000 -t public
# → PHP 8.2 Development Server (http://localhost:8000) started
```

**Terminal 2 - Frontend React:**
```bash
cd C:\xampp\htdocs\BL\app
npm run dev
# → Local: http://localhost:5173
```

### 5. Verificar proxy en `vite.config.js`
```js
proxy: {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
}
```

---

## 🧪 Testing Rápido

### Registro
1. `http://localhost:5173/register`
2. Password válido: **Password123** (8+ chars, mayúscula, minúscula, número)
3. Debe redirigir a `/` (Dashboard)

### Búsqueda
1. `/search` → "Jinx" → Enter
2. Debe mostrar cards con géneros/tags

### Detalle & Biblioteca
1. Click card → `/manhwa/:id`
2. "Añadir a mi biblioteca" → elegir estado
3. `/library` → ver progreso, favoritos, estados

### Dashboard
- Stats: Leyendo, Pendientes, Completados, Favoritos
- Continuar leyendo (horizontal cards)
- Capítulos nuevos (alertas)
- Favoritos

---

## ⚠️ Known Issues

### Registro de usuario (BLOQUEANTE)
- **Estado**: ❌ No funcional
- **Error**: `POST /api/auth/register` → 422 "Las contraseñas no coinciden"
- **Causa**: Al pegar password en campos `type="password"`, el evento `onChange` no dispara en React, dejando `confirmPassword` vacío
- **Workaround**: Escribir manualmente en ambos campos o usar el botón 👁 para ver el texto
- **Fix intentado**: `onPaste` handler en `Input.jsx` - pendiente verificación
- **Prioridad**: Alta - bloquea todo el flujo de usuario

---

## 📖 Lectura de Capítulos con MangaDex (PLANIFICADO)

### Objetivo
Permitir leer capítulos directamente en la app usando imágenes de MangaDex.

### Arquitectura propuesta
```
Usuario → /manhwa/:id → Click capítulo → /read/:manhwaId/:chapterId
         ↓
Frontend: ReaderPage.jsx (visor de imágenes)
         ↓
API: GET /chapters/:manhwa_id/:chapter_id/pages
     ↓
MangaDexService: getChapterPages(chapterId)
     ↓
MangaDex API: /at-home/server/:chapterId
     ↓
Respuesta: { baseUrl, chapter: { hash, data, dataSaver } }
     ↓
Frontend: Renderizar imágenes con lazy loading, zoom, fullscreen
```

### Endpoints necesarios
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/chapters/:manhwa_id/:chapter_id` | Info del capítulo |
| GET | `/chapters/:manhwa_id/:chapter_id/pages` | URLs de páginas (proxy a MangaDex at-home) |
| GET | `/proxy/mangadex/*` | Proxy de imágenes (evitar CORS/hotlink) |

### Features del Reader
- [ ] Navegación teclado (← → / A D)
- [ ] Zoom pinch / wheel
- [ ] Fullscreen
- [ ] Modo vertical/horizontal (webtoon vs manga)
- [ ] Precarga páginas adyacentes
- [ ] Marcar como leído automático
- [ ] Guardar posición de lectura
- [ ] Tema oscuro/claro

### Configuración MangaDex
```env
MANGADEX_USERNAME=tu_usuario
MANGADEX_PASSWORD=tu_pass
# Necesario para at-home server (imágenes)
```

---

## 🐛 Fixes Aplicados Durante Desarrollo

| Error | Solución |
|-------|----------|
| `genres.slice().map is not a function` | `typeof genres === 'string' ? JSON.parse(genres) : genres` |
| `asChild` warning en Button | `cloneElement` con `isValidElement` check |
| Regex routes PHP 422/500 | `(?P<$1>\\d+)` en lugar de `(?P<$1\d+)` |
| Password paste no actualiza estado | `onPaste` handler en Input component |
| `Card is not defined` en Skeleton | Import `Card` en `Skeleton.jsx` |
| `prose prose-bl` no existe | Removido, usar clases Tailwind nativas |
| API response wrapper | `unwrap()` helper en `api.js` |

---

## 📝 Próximos Pasos (Roadmap)

### Fase 1 - Core ✅
- [x] Auth JWT + Protected routes
- [x] AniList search + detail
- [x] Library CRUD + progress tracking
- [x] MangaDex chapter sync
- [x] Dashboard + Search + Detail pages

### Fase 2 - Mejoras
- [ ] Cron job para auto-sync capítulos (cada 6h)
- [ ] Notificaciones toast para capítulos nuevos
- [ ] Filtros avanzados en Library (por tag, año, score)
- [ ] Estadísticas con Recharts (gráficas)
- [ ] Modo oscuro/light toggle
- [ ] PWA + Service Worker
- [ ] **Lector de capítulos MangaDex** (visor imágenes, zoom, fullscreen)

---

## 🔗 URLs de Referencia

- **AniList GraphQL**: https://graphql.anilist.co
- **AniList Docs**: https://docs.anilist.co
- **MangaDex API**: https://api.mangadex.org
- **MangaDex Docs**: https://api.mangadex.org/docs.html
- **TailwindCSS**: https://tailwindcss.com
- **Framer Motion**: https://www.framer.com/motion/
- **React Router**: https://reactrouter.com

---

## 📅 Última Actualización
**2026-09-20** - Proyecto funcional completo con todas las features core implementadas.