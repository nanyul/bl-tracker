<?php
/**
 * Controlador de Usuario
 */
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/BaseController.php';

class UserController extends BaseController
{
    private User $userModel;

    public function __construct()
    {
        parent::__construct();
        $this->userModel = new User();
    }

    public function getProfile(): void
    {
        $auth = new AuthMiddleware();
        $payload = $auth->requireAuth();
        
        $user = $this->userModel->findById((int)$payload['user_id']);
        
        if (!$user) {
            $this->error('Usuario no encontrado', 404);
        }

        $this->success($user);
    }

    public function updateProfile(): void
    {
        $auth = new AuthMiddleware();
        $payload = $auth->requireAuth();
        
        $input = $this->getInput();
        
        $name = trim($input['name'] ?? '');
        $email = strtolower(trim($input['email'] ?? ''));
        
        $errors = [];
        if ($name && strlen($name) < 2) $errors['name'] = 'El nombre debe tener al menos 2 caracteres';
        if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors['email'] = 'Correo inválido';
        
        if ($email && $this->userModel->existsByEmail($email, (int)$payload['user_id'])) {
            $errors['email'] = 'Este correo ya está en uso';
        }

        if ($errors) {
            $this->error('Datos inválidos', 422, $errors);
        }

        $data = [];
        if ($name) $data['name'] = $name;
        if ($email) $data['email'] = $email;

        if ($data && !$this->userModel->update((int)$payload['user_id'], $data)) {
            $this->error('Error al actualizar perfil', 500);
        }

        $user = $this->userModel->findById((int)$payload['user_id']);
        $this->success($user, 'Perfil actualizado');
    }

    public function updatePassword(): void
    {
        $auth = new AuthMiddleware();
        $payload = $auth->requireAuth();
        
        $input = $this->getInput();
        
        $currentPassword = $input['current_password'] ?? '';
        $newPassword = $input['password'] ?? '';
        $confirmPassword = $input['confirm_password'] ?? '';

        $errors = [];
        if (!$currentPassword) $errors['current_password'] = 'Contraseña actual requerida';
        if (strlen($newPassword) < 8) $errors['password'] = 'Mínimo 8 caracteres';
        if ($newPassword !== $confirmPassword) $errors['confirm_password'] = 'Las contraseñas no coinciden';

        if ($errors) {
            $this->error('Datos inválidos', 422, $errors);
        }

        $fullUser = $this->userModel->findByEmail($this->userModel->findById((int)$payload['user_id'])['email'] ?? '');
        // findById no trae password_hash, buscar por email para verificar
        if (!$fullUser || !password_verify($currentPassword, $fullUser['password_hash'])) {
            $this->error('Contraseña actual incorrecta', 401);
        }

        $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
        
        if (!$this->userModel->updatePassword((int)$payload['user_id'], $newHash)) {
            $this->error('Error al cambiar contraseña', 500);
        }

        $this->success([], 'Contraseña actualizada');
    }

    public function getSettings(): void
    {
        $auth = new AuthMiddleware();
        $payload = $auth->requireAuth();
        $settings = $this->userModel->getSettings((int)$payload['user_id']);
        $this->success($settings);
    }

    public function updateSettings(): void
    {
        $auth = new AuthMiddleware();
        $payload = $auth->requireAuth();
        $input = $this->getInput();
        $allowed = ['theme','default_view','notifications_new_chapters','notifications_weekly','notifications_recommendations','language'];
        $data = [];
        foreach ($allowed as $k) if (array_key_exists($k, $input)) $data[$k] = $input[$k];
        if (!$this->userModel->upsertSettings((int)$payload['user_id'], $data)) {
            $this->error('Error al guardar preferencias', 500);
        }
        $this->success($this->userModel->getSettings((int)$payload['user_id']), 'Preferencias guardadas');
    }
}