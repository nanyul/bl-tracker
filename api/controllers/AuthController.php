<?php
/**
 * Controlador de Autenticación
 */
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../services/JwtService.php';
require_once __DIR__ . '/BaseController.php';

class AuthController extends BaseController
{
    private User $userModel;
    private JwtService $jwt;

    public function __construct()
    {
        parent::__construct();
        $this->userModel = new User();
        $this->jwt = new JwtService();
    }

    public function register(): void
    {
        $input = $this->getInput();
        
        $name = trim($input['name'] ?? '');
        $email = strtolower(trim($input['email'] ?? ''));
        $password = $input['password'] ?? '';
        $confirmPassword = $input['confirm_password'] ?? '';

        $errors = [];
        if (strlen($name) < 2) $errors['name'] = 'El nombre debe tener al menos 2 caracteres';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors['email'] = 'Correo inválido';
        if (strlen($password) < 8) $errors['password'] = 'La contraseña debe tener al menos 8 caracteres';
        if ($password !== $confirmPassword) $errors['confirm_password'] = 'Las contraseñas no coinciden';

        if ($this->userModel->existsByEmail($email)) {
            $errors['email'] = 'Este correo ya está registrado';
        }

        if ($errors) {
            $this->error('Datos de registro inválidos', 422, $errors);
        }

        $passwordHash = password_hash($password, PASSWORD_BCRYPT);
        $userId = $this->userModel->create($name, $email, $passwordHash);

        $token = $this->jwt->generate(['user_id' => $userId, 'email' => $email]);
        $user = $this->userModel->findById($userId);

        $this->success([
            'token' => $token,
            'user' => $user,
        ], 'Registro exitoso', 201);
    }

    public function login(): void
    {
        $input = $this->getInput();
        
        $email = strtolower(trim($input['email'] ?? ''));
        $password = $input['password'] ?? '';

        if (!$email || !$password) {
            $this->error('Correo y contraseña son obligatorios', 400);
        }

        $user = $this->userModel->findByEmail($email);
        
        if (!$user || !password_verify($password, $user['password_hash'])) {
            $this->error('Credenciales inválidas', 401);
        }

        $token = $this->jwt->generate(['user_id' => $user['id'], 'email' => $user['email']]);
        unset($user['password_hash']);

        $this->success([
            'token' => $token,
            'user' => $user,
        ], 'Inicio de sesión exitoso');
    }

    public function me(): void
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

        $user = $this->userModel->findById((int)$payload['user_id']);
        
        if (!$user || !password_verify($currentPassword, $user['password_hash'])) {
            $this->error('Contraseña actual incorrecta', 401);
        }

        $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
        
        if (!$this->userModel->updatePassword((int)$payload['user_id'], $newHash)) {
            $this->error('Error al cambiar contraseña', 500);
        }

        $this->success([], 'Contraseña actualizada');
    }

    public function deleteAccount(): void
    {
        $auth = new AuthMiddleware();
        $payload = $auth->requireAuth();
        $userId = (int)$payload['user_id'];
        $db = Database::getInstance();
        try {
            $db->beginTransaction();
            $db->prepare("DELETE FROM library WHERE user_id = ?")->execute([$userId]);
            $db->prepare("DELETE FROM user_settings WHERE user_id = ?")->execute([$userId]);
            if (!$this->userModel->delete($userId)) throw new Exception('delete failed');
            $db->commit();
        } catch (Exception $e) {
            $db->rollBack();
            $this->error('Error al eliminar cuenta: ' . $e->getMessage(), 500);
        }
        $this->success([], 'Cuenta eliminada permanentemente');
    }
}