<?php
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/config/Database.php';
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/models/User.php';
require_once __DIR__ . '/services/JwtService.php';
require_once __DIR__ . '/controllers/BaseController.php';
require_once __DIR__ . '/controllers/AuthController.php';

try {
    $controller = new AuthController();
    // Simulate POST input
    $_POST = [
        'name' => 'Test User',
        'email' => 'test@test.com',
        'password' => 'password123',
        'confirm_password' => 'password123'
    ];
    
    // Capture output
    ob_start();
    $controller->register();
    $output = ob_get_clean();
    echo "SUCCESS:\n$output\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "Trace:\n" . $e->getTraceAsString() . "\n";
}