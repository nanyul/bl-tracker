<?php
/**
 * Controlador de Capítulos
 */
require_once __DIR__ . '/../models/Chapter.php';
require_once __DIR__ . '/../models/Manhwa.php';
require_once __DIR__ . '/../services/MangaDexService.php';
require_once __DIR__ . '/../services/NewCatharsisService.php';
require_once __DIR__ . '/BaseController.php';

class ChapterController extends BaseController
{
    private Chapter $chapterModel;
    private Manhwa $manhwaModel;
    private MangaDexService $mangadex;
    private NewCatharsisService $newcatharsis;

    public function __construct()
    {
        parent::__construct();
        $this->chapterModel = new Chapter();
        $this->manhwaModel = new Manhwa();
        $this->mangadex = new MangaDexService();
        $this->newcatharsis = new NewCatharsisService();
    }

    private function providerOf(?array $manhwa): string
    {
        return (string)($manhwa['source_provider'] ?? 'mangadex') ?: 'mangadex';
    }

    public function getByManhwa(): void
    {
        $manhwaId = (int)($_GET['manhwa_id'] ?? 0);

        if (!$manhwaId) {
            $this->error('Manhwa ID requerido', 400);
        }

        $manhwa = $this->manhwaModel->findById($manhwaId);
        if ($manhwa && $this->providerOf($manhwa) === 'newcatharsis') {
            $this->success($this->virtualChapterList($manhwa));
            return;
        }

        $chapters = $this->chapterModel->getByManhwaId($manhwaId);
        $this->success($chapters);
    }

    /**
     * Listado virtual 1..n_capitulos con flag sincronizado.
     * El frontend DEBE mostrar badge "no descargado" cuando sea false.
     */
    private function virtualChapterList(array $manhwa): array
    {
        $manhwaId = (int)$manhwa['id'];
        $total = (int)($manhwa['chapters'] ?? 0);

        $synced = [];
        foreach ($this->chapterModel->getByManhwaId($manhwaId) as $row) {
            if (($row['provider'] ?? '') === 'newcatharsis') {
                $synced[(string)(float)$row['chapter_number']] = $row;
            }
        }

        if ($total < 1) {
            // Sin total conocido: devolver solo lo sincronizado.
            return array_values(array_map(fn($r) => $this->virtualEntry($manhwaId, (float)$r['chapter_number'], $r), $synced));
        }

        $list = [];
        for ($n = 1; $n <= $total; $n++) {
            $key = (string)(float)$n;
            $list[] = $this->virtualEntry($manhwaId, (float)$n, $synced[$key] ?? null);
        }
        return $list;
    }

    private function virtualEntry(int $manhwaId, float $numero, ?array $row): array
    {
        if ($row) {
            return [
                'id' => $row['id'],
                'manhwa_id' => $manhwaId,
                'mangadex_chapter_id' => null,
                'provider' => 'newcatharsis',
                'external_ref' => $row['external_ref'] ?? null,
                'chapter_number' => $row['chapter_number'],
                'title' => $row['title'] ?? null,
                'volume' => $row['volume'] ?? null,
                'language' => $row['language'] ?? 'es',
                'pages' => $row['pages'] ?? null,
                'publish_date' => $row['publish_date'] ?? null,
                'sincronizado' => !empty($row['image_urls']),
            ];
        }
        return [
            'id' => null,
            'manhwa_id' => $manhwaId,
            'mangadex_chapter_id' => null,
            'provider' => 'newcatharsis',
            'external_ref' => null,
            'chapter_number' => $numero,
            'title' => null,
            'volume' => null,
            'language' => 'es',
            'pages' => null,
            'publish_date' => null,
            'sincronizado' => false,
        ];
    }

    public function getChapter(): void
    {
        $manhwaId = (int)($_GET['manhwa_id'] ?? 0);
        $chapterId = trim($_GET['chapter_id'] ?? '');

        if (!$manhwaId || !$chapterId) {
            $this->error('Manhwa ID y Chapter ID requeridos', 400);
        }

        $manhwa = $this->manhwaModel->findById($manhwaId);
        if ($manhwa && $this->providerOf($manhwa) === 'newcatharsis') {
            $chapter = $this->resolveNcChapter($manhwaId, $chapterId);
            if (!$chapter) {
                $this->error('Capítulo no encontrado', 404);
            }
            $this->success($chapter);
            return;
        }

        $chapter = $this->chapterModel->getByMangaDexId($manhwaId, $chapterId);

        if (!$chapter) {
            $this->error('Capítulo no encontrado', 404);
        }

        $this->success($chapter);
    }

    /**
     * Resuelve un capítulo NewCatharsis sin pegarle a la fuente
     * (solo DB; el sync ocurre en getPages). Devuelve entrada virtual
     * con sincronizado:false si aún no se abrió nunca.
     */
    private function resolveNcChapter(int $manhwaId, string $ref): ?array
    {
        if (is_numeric($ref)) {
            $row = $this->chapterModel->getByProviderNumber($manhwaId, 'newcatharsis', (float)$ref);
            return $row ?? $this->virtualEntry($manhwaId, (float)$ref, null);
        }
        $row = $this->chapterModel->getByRef($manhwaId, 'newcatharsis', $ref);
        if ($row) return $row;
        // Fallback: id local numérico de la fila.
        if (ctype_digit($ref)) {
            foreach ($this->chapterModel->getByManhwaId($manhwaId) as $ch) {
                if ((string)$ch['id'] === $ref) return $ch;
            }
        }
        return null;
    }

    public function getPages(): void
    {
        // Público: cualquiera puede leer, solo markAsRead requiere auth
        $manhwaId = (int)($_GET['manhwa_id'] ?? 0);
        $chapterId = trim($_GET['chapter_id'] ?? '');

        if (!$manhwaId || !$chapterId) {
            $this->error('Manhwa ID y Chapter ID requeridos', 400);
        }

        $manhwa = $this->manhwaModel->findById($manhwaId);
        if ($manhwa && $this->providerOf($manhwa) === 'newcatharsis') {
            $this->getNcPages($manhwa, $chapterId);
            return;
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

    /**
     * Sirve páginas NewCatharsis con sync LAZY:
     * 1. Si la fila existe con image_urls → 0 peticiones a la fuente.
     * 2. Si no → UNA sola llamada getChapter (primera apertura) + upsert
     *    race-safe sobre UNIQUE (manhwa_id, provider, chapter_number).
     * 3. ?refresh=1 fuerza re-sync de ese capítulo puntual (nunca bulk).
     */
    private function getNcPages(array $manhwa, string $chapterId): void
    {
        $manhwaId = (int)$manhwa['id'];
        $slug = (string)($manhwa['source_slug'] ?? '');
        if ($slug === '') {
            $this->error('Obra sin slug de NewCatharsis', 500);
        }

        $numero = is_numeric($chapterId) ? (int)$chapterId : null;
        if ($numero === null) {
            $row = $this->chapterModel->getByRef($manhwaId, 'newcatharsis', $chapterId);
            $numero = $row ? (int)$row['chapter_number'] : null;
        }
        if ($numero === null || $numero < 1) {
            $this->error('Número de capítulo inválido para NewCatharsis', 400);
        }

        $force = ($_GET['refresh'] ?? '') === '1';
        $row = $this->chapterModel->getByProviderNumber($manhwaId, 'newcatharsis', (float)$numero);
        $images = $row['image_urls'] ?? null;
        if (is_string($images)) $images = json_decode($images, true) ?: null;

        if ($force || empty($images)) {
            try {
                $chapter = $this->newcatharsis->getChapter($slug, $numero);
                if (empty($chapter['imagenes'])) {
                    $this->error('La fuente no devolvió imágenes para este capítulo', 502);
                }
                $formatted = $this->newcatharsis->formatChapterForStorage($manhwaId, $chapter);
                // Upsert race-safe: dos pestañas a la vez no truenan.
                $row = $this->chapterModel->upsertByProviderNumber($formatted);
                $images = $row['image_urls'] ?? null;
                if (is_string($images)) $images = json_decode($images, true) ?: null;
                if (empty($images)) {
                    $images = array_values($chapter['imagenes']);
                }
            } catch (Exception $e) {
                $code = (int)($e->getCode() ?: 0);
                // Si había caché y la fuente falla, servir lo guardado.
                if (!empty($row['image_urls'])) {
                    $cached = $row['image_urls'];
                    if (is_string($cached)) $cached = json_decode($cached, true) ?: [];
                    $this->success([
                        'provider' => 'newcatharsis',
                        'numero' => $numero,
                        'title' => $row['title'] ?? null,
                        'images' => array_values($cached),
                        'stale' => true,
                    ]);
                    return;
                }
                $this->error('No se pudieron cargar las páginas: ' . $e->getMessage(), $code === 404 ? 404 : 502);
            }
        }

        $this->success([
            'provider' => 'newcatharsis',
            'numero' => $numero,
            'title' => $row['title'] ?? null,
            'images' => array_values($images ?? []),
        ]);
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

        if (!$manhwa) {
            $this->error('Obra no encontrada', 404);
        }

        if ($this->providerOf($manhwa) === 'newcatharsis') {
            $this->error('Sincronización bajo demanda: abre el capítulo para sincronizarlo', 400);
        }

        if (!$manhwa['mangadex_id']) {
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