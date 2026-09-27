<?php
/**
 * Configuración de base de datos
 *
 * Lee variables de entorno reales (getenv) con fallback a $_ENV
 * (cargado desde .env) y luego a valores locales por defecto.
 * NOTA: $_ENV suele estar vacío cuando variables_order=GPCS, por eso
 * se usa getenv() primero — imprescindible en Render (env del dashboard).
 * En TiDB Cloud: DB_SSL=true + puerto 4006/4000 + TLS obligatorio.
 */
if (!function_exists('bl_env')) {
    function bl_env(string $name, $default = null) {
        $v = getenv($name);
        if ($v !== false && $v !== '') return $v;
        return $_ENV[$name] ?? $default;
    }
}

$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

$ssl = filter_var(bl_env('DB_SSL', false), FILTER_VALIDATE_BOOLEAN);
$sslCa = bl_env('DB_SSL_CA', null);
if ($ssl) {
    // TiDB Cloud usa CA pública (Let's Encrypt ISRG Root X1).
    // Docker: bundle del sistema. Windows/XAMPP: apuntar DB_SSL_CA al .pem.
    $caFile = $sslCa ?: '/etc/ssl/certs/ca-certificates.crt';
    if ($caFile && @file_exists($caFile)) {
        $options[PDO::MYSQL_ATTR_SSL_CA] = $caFile;
    } else {
        // TLS cifrado sin verificación estricta del CA (fallback).
        $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
    }
}

return [
    'host' => bl_env('DB_HOST', 'localhost'),
    'port' => bl_env('DB_PORT', '3306'),
    'database' => bl_env('DB_NAME', 'bl_tracker'),
    'username' => bl_env('DB_USER', 'root'),
    'password' => bl_env('DB_PASS', ''),
    'charset' => 'utf8mb4',
    'ssl' => $ssl,
    'ssl_ca' => $sslCa,
    'options' => $options,
];