<?php
/**
 * Controlador de Capítulos
 */
require_once __DIR__ . '/../models/Chapter.php';
require_once __DIR__ . '/../models/Manhwa.php';
require_once __DIR__ . '/../services/MangaDexService.php';
require_once __DIR__ . '/BaseController.php';

class ChapterController extends BaseController
{
    private Chapter $chapterModel;
    private Manhwa $manhwaModel;
    private MangaDexService $mangadex;

    public function __construct()
    {
        parent::__construct();
        $this->chapterModel = new Chapter();
        $this->manhwaModel = new Manhwa();
        $this->mangadex = new MangaDexService();
    }

    public function getByManhwa(): void
    {
        $manhwaId = (int)($_GET['manhwa_id'] ?? 0);
        
        if (!$manhwaId) {
            $this->error('Manhwa ID requerido', 400);
        }

        $chapters = $this->chapterModel->getByManhwaId($manhwaId);
        $this->success($chapters);
    }

    public function getChapter(): void
    {
        $manhwaId = (int)($_GET['manhwa_id'] ?? 0);
        $chapterId = trim($_GET['chapter_id'] ?? '');
        
        if (!$manhwaId || !$chapterId) {
            $this->error('Manhwa ID y Chapter ID requeridos', 400);
        }

        $chapter = $this->chapterModel->getByMangaDexId($manhwaId, $chapterId);
        
        if (!$chapter) {
            $this->error('Capítulo no encontrado', 404);
        }

        $this->success($chapter);
    }

    public function getPages(): void
    {
        // Público: cualquiera puede leer, solo markAsRead requiere auth
        $manhwaId = (int)($_GET['manhwa_id'] ?? 0);
        $chapterId = trim($_GET['chapter_id'] ?? '');
        
        if (!$manhwaId || !$chapterId) {
            $this->error('Manhwa ID y Chapter ID requeridos', 400);
        }

        // Try to find chapter by MangaDex UUID first, then by local ID
        $chapter = $this->chapterModel->getByMangaDexId($manhwaId, $chapterId);
        if (!$chapter) {
            // Fallback: try to find by local ID
            $stmt = $this->chapterModel->getByManhwaId($manhwaId);
            $chapter = null;
            foreach ($stmt as $ch) {
                if ((string)$ch['id'] === $chapterId) {
                    $chapter = $ch;
                    break;
                }
            }
        }

        if (!$chapter || !$chapter['mangadex_chapter_id']) {
            $this->error('Capítulo no encontrado o sin MangaDex ID', 404);
        }

        try {
            $result = $this->mangadex->getChapterPages($chapter['mangadex_chapter_id']);
            $this->success([
                'base_url' => $result['baseUrl'] ?? null,
                'hash' => $result['chapter']['hash'] ?? null,
                'data' => $result['chapter']['data'] ?? [],
                'data_saver' => $result['chapter']['dataSaver'] ?? [],
            ]);
        } catch (Exception $e) {
            $this->error('No se pudieron cargar las páginas: ' . $e->getMessage(), 502);
        }
    }

    public function updateChapters(): void
    {
        $auth = new AuthMiddleware();
        $payload = $auth->requireAuth();
        
        $manhwaId = (int)($_GET['manhwa_id'] ?? 0);
        
        if (!$manhwaId) {
            $this->error('Manhwa ID requerido', 400);
        }

        $manhwa = $this->manhwaModel->findById($manhwaId);
        
        if (!$manhwa || !$manhwa['mangadex_id']) {
            $this->error('Obra no encontrada o sin MangaDex ID', 404);
        }

        try {
            $result = $this->mangadex->getAllChapters($manhwa['mangadex_id']);
            $chapters = $this->mangadex->formatChaptersForStorage($result['data'] ?? []);
            
            if (!empty($chapters)) {
                $this->chapterModel->replaceAll($manhwaId, $chapters);
            }

            $updatedChapters = $this->chapterModel->getByManhwaId($manhwaId);
            $this->success(['chapters' => $updatedChapters], 'Capítulos actualizados');
        } catch (Exception $e) {
            $this->error('Error actualizando capítulos: ' . $e->getMessage(), 500);
        }
    }

    public function getNew(): void
    {
        $auth = new AuthMiddleware();
        $payload = $auth->requireAuth();
        
        $chapters = $this->chapterModel->getNewChapters((int)$payload['user_id']);
        $this->success($chapters);
    }

    public function markAsRead(): void
    {
        $auth = new AuthMiddleware();
        $payload = $auth->requireAuth();
        
        $chapterId = (int)($_GET['chapter_id'] ?? 0);
        
        if (!$chapterId) {
            $this->error('Chapter ID requerido', 400);
        }

        $this->success([], 'Marcado como leído');
    }

    public function proxyImage(): void
    {
        // Get the full path after /proxy/mangadex/image/
        $requestUri = $_SERVER['REQUEST_URI'];
        $path = parse_url($requestUri, PHP_URL_PATH);
        error_log("proxyImage requestUri: $requestUri, path: $path");
        
        // The path includes /BL/api/public/proxy/mangadex/image/...
        // We need to extract everything after /proxy/mangadex/image/
        $prefix = '/proxy/mangadex/image/';
        $pos = strpos($path, $prefix);
        if ($pos !== false) {
            $imagePath = substr($path, $pos + strlen($prefix));
        } else {
            // Fallback: try simple replace
            $imagePath = str_replace('/proxy/mangadex/image/', '', $path);
        }
        error_log("proxyImage imagePath: $imagePath");
        
        if (!$imagePath) {
            $this->error('Ruta de imagen requerida', 400);
        }

        $url = "https://uploads.mangadex.org/$imagePath";
        
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_USERAGENT => 'BL Tracker/1.0',
            CURLOPT_HTTPHEADER => [
                'Accept: image/webp,image/apng,image/*,*/*;q=0.8',
                'Referer: https://mangadex.org/',
            ],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error || $httpCode !== 200) {
            $this->error('No se pudo cargar la imagen', 502);
        }

        header("Content-Type: $contentType");
        header('Cache-Control: public, max-age=31536000, immutable');
        header('Access-Control-Allow-Origin: *');
        echo $response;
        exit;
    }
}