<?php
/**
 * Middleware de autenticación JWT
 */
class AuthMiddleware
{
    private JwtService $jwt;

    public function __construct()
    {
        $this->jwt = new JwtService();
    }

    public function handle(): ?array
    {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return null;
        }

        $token = $matches[1];
        $payload = $this->jwt->validate($token);
        
        if (!$payload) {
            return null;
        }

        return $payload;
    }

    public function requireAuth(): array
    {
        $user = $this->handle();
        
        if (!$user) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'No autorizado. Token inválido o expirado.'
            ]);
            exit;
        }
        
        return $user;
    }

    public function optionalAuth(): ?array
    {
        return $this->handle();
    }
}