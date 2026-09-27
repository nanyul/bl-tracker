<?php
/**
 * Configuración general de la API
 */

// Cargar variables de entorno (sin pisar las reales: Render/Vercel > .env > default)
$dotenv = __DIR__ . '/../../.env';
if (file_exists($dotenv)) {
    $lines = file($dotenv, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        [$name, $value] = explode('=', $line, 2);
        $name = trim($name);
        if (getenv($name) === false && !isset($_ENV[$name])) {
            $_ENV[$name] = trim($value);
            putenv($name . '=' . trim($value));
        }
    }
}

if (!function_exists('bl_env')) {
    function bl_env(string $name, $default = null) {
        $v = getenv($name);
        if ($v !== false && $v !== '') return $v;
        return $_ENV[$name] ?? $default;
    }
}

$extraOrigins = array_filter(array_map('trim', explode(',', (string) bl_env('CORS_ALLOWED_ORIGINS', ''))));

return [
    'app' => [
        'name' => 'BL Tracker API',
        'version' => '1.0.0',
        'debug' => filter_var(bl_env('APP_DEBUG', true), FILTER_VALIDATE_BOOLEAN),
        'url' => bl_env('APP_URL', 'http://localhost/BL/api'),
    ],
    'jwt' => [
        'secret' => bl_env('JWT_SECRET', 'bl-tracker-secret-key-change-in-production'),
        'algorithm' => 'HS256',
        'expiration' => (int) bl_env('JWT_EXPIRATION', 604800), // 7 días
    ],
    'anilist' => [
        'url' => 'https://graphql.anilist.co',
        'timeout' => 10,
    ],
    'mangadex' => [
        'url' => 'https://api.mangadex.org',
        'timeout' => 10,
    ],
    'newcatharsis' => [
        'url' => bl_env('NEWCATHARSIS_URL', 'https://newcatharsis.dig-it.info'),
        'timeout' => (int) bl_env('NEWCATHARSIS_TIMEOUT', 15),
        // Key pública embebida en el frontend del sitio (la envía cualquier
        // navegador). Solo se configura por env para poder rotarla sin deploy.
        'api_key' => bl_env('NEWCATHARSIS_API_KEY', 'SrfnigkBo3YLbySfIE0DU9WtmlF7Ov4mzakJlBV9ZCw'),
    ],
    'cors' => [
        'allowed_origins' => array_values(array_unique(array_merge(
            ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:81', 'http://127.0.0.1:5173'],
            $extraOrigins // prod: CORS_ALLOWED_ORIGINS=https://tu-api.onrender.com,https://tu-app.vercel.app
        ))),
        'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With'],
    ],
];