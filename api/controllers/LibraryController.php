<?php
/**
 * Controlador de Biblioteca
 */
require_once __DIR__ . '/../models/Library.php';
require_once __DIR__ . '/../models/Chapter.php';
require_once __DIR__ . '/BaseController.php';

class LibraryController extends BaseController
{
    private Library $libraryModel;
    private Chapter $chapterModel;

    public function __construct()
    {
        parent::__construct();
        $this->libraryModel = new Library();
        $this->chapterModel = new Chapter();
    }

    public function getMyLibrary(): void
    {
        $auth = new AuthMiddleware();
        $payload = $auth->requireAuth();
        
        // Parse status as array if multiple
        $status = $_GET['status'] ?? '';
        if (strpos($status, ',') !== false) {
            $status = explode(',', $status);
        }
        
        // Parse tags as array if multiple
        $tags = $_GET['tags'] ?? '';
        if (strpos($tags, ',') !== false) {
            $tags = explode(',', $tags);
        }
        
        $filters = [
            'status' => $status,
            'favorite' => isset($_GET['favorite']) ? filter_var($_GET['favorite'], FILTER_VALIDATE_BOOLEAN) : false,
            'search' => $_GET['search'] ?? '',
            'sort' => $_GET['sort'] ?? 'updated_desc',
            'tags' => $tags,
            'year_min' => isset($_GET['year_min']) ? (int)$_GET['year_min'] : null,
            'year_max' => isset($_GET['year_max']) ? (int)$_GET['year_max'] : null,
            'score_min' => isset($_GET['score_min']) ? (int)$_GET['score_min'] : null,
            'score_max' => isset($_GET['score_max']) ? (int)$_GET['score_max'] : null,
            'format' => $_GET['format'] ?? null,
            'user_score_min' => isset($_GET['user_score_min']) ? (float)$_GET['user_score_min'] : null,
        ];
        
        $page = max(1, (int)($_GET['page'] ?? 1));
        $perPage = min(100, max(1, (int)($_GET['limit'] ?? 20)));

        $result = $this->libraryModel->getUserLibrary((int)$payload['user_id'], $filters, $page, $perPage);
        
        $this->paginatedResponse($result['data'], $result['total'], $page, $perPage);
    }

    public function getEntry(): void
    {
        $auth = new AuthMiddleware();
        $payload = $auth->requireAuth();
        
        $manhwaId = (int)($_GET['manhwa_id'] ?? 0);
        
        if (!$manhwaId) {
            $this->error('Manhwa ID requerido', 400);
        }

        $entry = $this->libraryModel->getEntry((int)$payload['user_id'], $manhwaId);
        
        if (!$entry) {
            $this->error('No está en tu biblioteca', 404);
        }

        $this->success($entry);
    }

    public function addToLibrary(): void
    {
        $auth = new AuthMiddleware();
        $payload = $auth->requireAuth();
        
        $input = $this->getInput();
        
        $manhwaId = (int)($input['manhwa_id'] ?? 0);
        $status = $input['status'] ?? 'PENDIENTE';
        $currentChapter = (int)($input['current_chapter'] ?? 0);
        $favorite = (bool)($input['favorite'] ?? false);
        $score = $input['score'] ?? null;
        $notes = $input['notes'] ?? null;
        $startedAt = $input['started_at'] ?? null;

        if (!$manhwaId) {
            $this->error('Manhwa ID requerido', 400);
        }

        $validStatuses = ['LEYENDO', 'PENDIENTE', 'COMPLETADO', 'PAUSADO', 'ABANDONADO', 'RELECTURA'];
        if (!in_array($status, $validStatuses)) {
            $this->error('Estado inválido', 400);
        }

        if ($currentChapter < 0) {
            $this->error('Capítulo inválido', 400);
        }

        $this->libraryModel->add((int)$payload['user_id'], $manhwaId, [
            'status' => $status,
            'current_chapter' => $currentChapter,
            'favorite' => $favorite,
            'score' => $score,
            'notes' => $notes,
            'started_at' => $startedAt,
        ]);

        $entry = $this->libraryModel->getEntry((int)$payload['user_id'], $manhwaId);
        $this->success($entry, 'Añadido a tu biblioteca', 201);
    }

    public function updateEntry(): void
    {
        $auth = new AuthMiddleware();
        $payload = $auth->requireAuth();
        
        $manhwaId = (int)($_GET['manhwa_id'] ?? 0);
        
        if (!$manhwaId) {
            $this->error('Manhwa ID requerido', 400);
        }

        $input = $this->getInput();
        
        $allowed = ['status', 'current_chapter', 'favorite', 'score', 'notes', 'started_at', 'finished_at'];
        $data = [];
        
        foreach ($allowed as $field) {
            if (isset($input[$field])) {
                $data[$field] = $input[$field];
            }
        }

        if (isset($data['status'])) {
            $validStatuses = ['LEYENDO', 'PENDIENTE', 'COMPLETADO', 'PAUSADO', 'ABANDONADO', 'RELECTURA'];
            if (!in_array($data['status'], $validStatuses)) {
                $this->error('Estado inválido', 400);
            }
        }

        if (isset($data['current_chapter']) && $data['current_chapter'] < 0) {
            $this->error('Capítulo inválido', 400);
        }

        if (!$this->libraryModel->update((int)$payload['user_id'], $manhwaId, $data)) {
            $this->error('Error al actualizar', 500);
        }

        $entry = $this->libraryModel->getEntry((int)$payload['user_id'], $manhwaId);
        $this->success($entry, 'Actualizado');
    }

    public function updateProgress(): void
    {
        $auth = new AuthMiddleware();
        $payload = $auth->requireAuth();
        
        $manhwaId = (int)($_GET['manhwa_id'] ?? 0);
        
        if (!$manhwaId) {
            $this->error('Manhwa ID requerido', 400);
        }

        $input = $this->getInput();
        $chapter = (int)($input['chapter'] ?? 0);

        if ($chapter < 0) {
            $this->error('Capítulo inválido', 400);
        }

        if (!$this->libraryModel->updateProgress((int)$payload['user_id'], $manhwaId, $chapter)) {
            $this->error('Error al actualizar progreso', 500);
        }

        $entry = $this->libraryModel->getEntry((int)$payload['user_id'], $manhwaId);
        
        // Verificar si completó
        $manhwaChapters = $this->chapterModel->getByManhwaId($manhwaId);
        $totalChapters = $manhwaChapters ? max(array_column($manhwaChapters, 'chapter_number')) : 0;
        
        $response = ['entry' => $entry];
        if ($totalChapters > 0 && $chapter >= $totalChapters && $entry['status'] !== 'COMPLETADO') {
            $response['completed'] = true;
            $response['message'] = '¡Has completado esta obra!';
        }

        $this->success($response);
    }

    public function toggleFavorite(): void
    {
        $auth = new AuthMiddleware();
        $payload = $auth->requireAuth();
        
        $manhwaId = (int)($_GET['manhwa_id'] ?? 0);
        
        if (!$manhwaId) {
            $this->error('Manhwa ID requerido', 400);
        }

        if (!$this->libraryModel->toggleFavorite((int)$payload['user_id'], $manhwaId)) {
            $this->error('Error al cambiar favorito', 500);
        }

        $entry = $this->libraryModel->getEntry((int)$payload['user_id'], $manhwaId);
        $this->success($entry);
    }

    public function removeFromLibrary(): void
    {
        $auth = new AuthMiddleware();
        $payload = $auth->requireAuth();
        
        $manhwaId = (int)($_GET['manhwa_id'] ?? 0);
        
        if (!$manhwaId) {
            $this->error('Manhwa ID requerido', 400);
        }

        if (!$this->libraryModel->remove((int)$payload['user_id'], $manhwaId)) {
            $this->error('Error al eliminar', 500);
        }

        $this->success([], 'Eliminado de tu biblioteca');
    }

    public function getStats(): void
    {
        $auth = new AuthMiddleware();
        $payload = $auth->requireAuth();
        
        $stats = $this->libraryModel->getStats((int)$payload['user_id']);
        $this->success($stats);
    }

    public function getNewChapters(): void
    {
        $auth = new AuthMiddleware();
        $payload = $auth->requireAuth();
        
        $chapters = $this->chapterModel->getNewChapters((int)$payload['user_id']);
        
        // Agrupar por manhwa
        $grouped = [];
        foreach ($chapters as $chapter) {
            $key = $chapter['manhwa_id'];
            if (!isset($grouped[$key])) {
                $grouped[$key] = [
                    'manhwa_id' => $key,
                    'title' => $chapter['title_english'] ?? $chapter['title_romaji'] ?? $chapter['title'],
                    'cover_image' => $chapter['cover_image'],
                    'current_chapter' => $chapter['current_chapter'],
                    'new_chapters' => [],
                ];
            }
            $grouped[$key]['new_chapters'][] = [
                'id' => $chapter['id'],
                'chapter_number' => $chapter['chapter_number'],
                'title' => $chapter['title'],
                'publish_date' => $chapter['publish_date'],
            ];
        }

        $this->success(array_values($grouped));
    }
}