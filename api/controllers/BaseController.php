<?php
/**
 * Controlador base con utilidades comunes
 */
abstract class BaseController
{
    protected PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    protected function jsonResponse(array $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    protected function success(array $data = [], string $message = '', int $status = 200): void
    {
        $response = ['success' => true];
        if ($message) $response['message'] = $message;
        if ($data) $response['data'] = $data;
        $this->jsonResponse($response, $status);
    }

    protected function error(string $message, int $status = 400, array $errors = []): void
    {
        $response = ['success' => false, 'message' => $message];
        if ($errors) $response['errors'] = $errors;
        $this->jsonResponse($response, $status);
    }

    protected function paginatedResponse(array $items, int $total, int $page, int $perPage): void
    {
        $this->success([
            'data' => $items,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => ceil($total / $perPage),
                'has_more' => $page * $perPage < $total,
            ],
        ]);
    }

    protected function getInput(): array
    {
        $input = json_decode(file_get_contents('php://input'), true);
        return $input ?? $_POST ?? [];
    }

    protected function getBearerToken(): ?string
    {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return $matches[1];
        }
        return null;
    }
}