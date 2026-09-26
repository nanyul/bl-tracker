<?php
/**
 * Configuración general de la API
 */

// Cargar variables de entorno
$dotenv = __DIR__ . '/../../.env';
if (file_exists($dotenv)) {
    $lines = file($dotenv, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        [$name, $value] = explode('=', $line, 2);
        $_ENV[trim($name)] = trim($value);
        putenv(trim($name) . '=' . trim($value));
    }
}

return [
    'app' => [
        'name' => 'BL Tracker API',
        'version' => '1.0.0',
        'debug' => $_ENV['APP_DEBUG'] ?? true,
        'url' => $_ENV['APP_URL'] ?? 'http://localhost/BL/api',
    ],
    'jwt' => [
        'secret' => $_ENV['JWT_SECRET'] ?? 'bl-tracker-secret-key-change-in-production',
        'algorithm' => 'HS256',
        'expiration' => $_ENV['JWT_EXPIRATION'] ?? 604800, // 7 días
    ],
    'anilist' => [
        'url' => 'https://graphql.anilist.co',
        'timeout' => 10,
    ],
    'mangadex' => [
        'url' => 'https://api.mangadex.org',
        'timeout' => 10,
    ],
    'cors' => [
        'allowed_origins' => ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:81', 'http://127.0.0.1:5173'],
        'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With'],
    ],
];