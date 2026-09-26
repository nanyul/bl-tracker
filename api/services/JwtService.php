<?php
/**
 * Servicio JWT para autenticación
 */
require_once __DIR__ . '/../vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtService
{
    private string $secret;
    private string $algorithm;
    private int $expiration;

    public function __construct()
    {
        $config = require __DIR__ . '/../config/config.php';
        $this->secret = $config['jwt']['secret'];
        $this->algorithm = $config['jwt']['algorithm'];
        $this->expiration = $config['jwt']['expiration'];
    }

    public function generate(array $payload): string
    {
        $now = time();
        $payload = array_merge($payload, [
            'iat' => $now,
            'exp' => $now + $this->expiration,
        ]);
        
        return JWT::encode($payload, $this->secret, $this->algorithm);
    }

    public function validate(string $token): ?array
    {
        try {
            $decoded = JWT::decode($token, new Key($this->secret, $this->algorithm));
            return (array)$decoded;
        } catch (Exception $e) {
            return null;
        }
    }

    public function refresh(string $token): ?string
    {
        $payload = $this->validate($token);
        if (!$payload) return null;
        
        // Remover campos de tiempo
        unset($payload['iat'], $payload['exp']);
        return $this->generate($payload);
    }
}