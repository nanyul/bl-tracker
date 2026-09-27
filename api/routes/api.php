<?php
/**
 * Enrutador principal de la API
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../controllers/AuthController.php';
require_once __DIR__ . '/../controllers/ManhwaController.php';
require_once __DIR__ . '/../controllers/LibraryController.php';
require_once __DIR__ . '/../controllers/ChapterController.php';
require_once __DIR__ . '/../controllers/UserController.php';

// CORS
$config = require __DIR__ . '/../config/config.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $config['cors']['allowed_origins'])) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: ' . implode(', ', $config['cors']['allowed_methods']));
header('Access-Control-Allow-Headers: ' . implode(', ', $config['cors']['allowed_headers']));

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Parse path
$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);
$path = str_replace('/BL/api/public', '', $path);
$path = rtrim($path, '/') ?: '/';

// Debug proxy path
if (strpos($path, '/proxy/mangadex/') === 0) {
    error_log("Proxy path detected: $path");
}

$method = $_SERVER['REQUEST_METHOD'];

// Route matching
$routes = [
    // Auth
    'POST /auth/register' => [AuthController::class, 'register'],
    'POST /auth/login' => [AuthController::class, 'login'],
    'GET /auth/me' => [AuthController::class, 'me'],
    'PUT /auth/profile' => [AuthController::class, 'updateProfile'],
    'PUT /auth/password' => [AuthController::class, 'updatePassword'],
    'DELETE /auth/account' => [AuthController::class, 'deleteAccount'],
    
    // Manhwas
    'GET /manhwa/search' => [ManhwaController::class, 'search'],
    'GET /manhwa/{id}' => [ManhwaController::class, 'getById'],
    'GET /manhwa/anilist/{anilist_id}' => [ManhwaController::class, 'getByAniListId'],
    'POST /manhwa/from-anilist' => [ManhwaController::class, 'getOrCreateFromAniList'],
    'POST /manhwa/from-mangadex' => [ManhwaController::class, 'getOrCreateFromMangaDex'],
    'POST /manhwa/{id}/update-chapters' => [ManhwaController::class, 'updateChapters'],
    'GET /manhwa/genres' => [ManhwaController::class, 'getGenres'],
    'GET /manhwa/tags' => [ManhwaController::class, 'getTags'],
    
    // Library
    'GET /library' => [LibraryController::class, 'getMyLibrary'],
    'GET /library/{manhwa_id}' => [LibraryController::class, 'getEntry'],
    'POST /library' => [LibraryController::class, 'addToLibrary'],
    'PUT /library/{manhwa_id}' => [LibraryController::class, 'updateEntry'],
    'PATCH /library/{manhwa_id}/progress' => [LibraryController::class, 'updateProgress'],
    'PATCH /library/{manhwa_id}/favorite' => [LibraryController::class, 'toggleFavorite'],
    'DELETE /library/{manhwa_id}' => [LibraryController::class, 'removeFromLibrary'],
    'GET /library/stats' => [LibraryController::class, 'getStats'],
    'GET /library/new-chapters' => [LibraryController::class, 'getNewChapters'],
    
    // Chapters
    'GET /chapters/{manhwa_id}' => [ChapterController::class, 'getByManhwa'],
    'GET /chapters/{manhwa_id}/{chapter_id}' => [ChapterController::class, 'getChapter'],
    'GET /chapters/{manhwa_id}/{chapter_id}/pages' => [ChapterController::class, 'getPages'],
    'POST /chapters/{manhwa_id}/update' => [ChapterController::class, 'updateChapters'],
    'GET /chapters/new' => [ChapterController::class, 'getNew'],
    'PATCH /chapters/{chapter_id}/read' => [ChapterController::class, 'markAsRead'],
    
    // MangaDex Image Proxy
    'GET /proxy/mangadex/image/{path:.+}' => [ChapterController::class, 'proxyImage'],
    
    // User
    'GET /user/profile' => [UserController::class, 'getProfile'],
    'PUT /user/profile' => [UserController::class, 'updateProfile'],
    'PUT /user/password' => [UserController::class, 'updatePassword'],
    'GET /user/settings' => [UserController::class, 'getSettings'],
    'PUT /user/settings' => [UserController::class, 'updateSettings'],
];

// Match route
$matched = false;
foreach ($routes as $route => $handler) {
    $pattern = preg_replace_callback('/\{(\w+)(?::([^}]+))?\}/', function ($match) {
        $name = $match[1];
        $customPattern = $match[2] ?? null;
        if ($name === 'chapter_id') {
            $valuePattern = '[A-Za-z0-9-]+';
        } elseif ($customPattern) {
            $valuePattern = $customPattern;
        } else {
            $valuePattern = '\\d+';
        }
        return '(?P<' . $name . '>' . $valuePattern . ')';
    }, $route);
    $pattern = '@^' . $pattern . '$@';
    
    if (preg_match($pattern, "$method $path", $matches)) {
        // Remove numeric keys
        $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
        $_GET = array_merge($_GET, $params);
        
        $controller = new $handler[0]();
        $controller->{$handler[1]}();
        $matched = true;
        break;
    }
}

if (!$matched) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Endpoint no encontrado',
        'path' => $path,
        'method' => $method,
    ]);
}