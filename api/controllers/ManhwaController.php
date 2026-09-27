<?php
/**
 * Controlador de Manhwas
 */
require_once __DIR__ . '/../models/Manhwa.php';
require_once __DIR__ . '/../services/AniListService.php';
require_once __DIR__ . '/../services/MangaDexService.php';
require_once __DIR__ . '/../services/NewCatharsisService.php';
require_once __DIR__ . '/BaseController.php';

class ManhwaController extends BaseController
{
    private Manhwa $manhwaModel;
    private AniListService $anilist;
    private MangaDexService $mangadex;
    private NewCatharsisService $newcatharsis;

    public function __construct()
    {
        parent::__construct();
        $this->manhwaModel = new Manhwa();
        $this->anilist = new AniListService();
        $this->mangadex = new MangaDexService();
        $this->newcatharsis = new NewCatharsisService();
    }

    public function search(): void
    {
        $query = trim($_GET['q'] ?? '');
        $page = max(1, (int)($_GET['page'] ?? 1));
        $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));

        try {
            $normalizeList = static function ($value): array {
                if (is_array($value)) return $value;
                return $value ? [$value] : [];
            };

            $filters = [
                'genres' => $normalizeList($_GET['genres'] ?? []),
                'tags' => $normalizeList($_GET['tags'] ?? []),
                'status' => $_GET['status'] ?? '',
                'sort' => $_GET['sort'] ?? 'POPULARITY_DESC',
            ];

            $result = $this->anilist->searchManga($query, $page, $perPage, $filters);
            $media = $result['media'] ?? [];
            $pageInfo = $result['pageInfo'] ?? [];

            $formatted = array_map([$this->anilist, 'formatForStorage'], $media);
            
            $this->success([
                'data' => $formatted,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $perPage,
                    'total' => $pageInfo['total'] ?? 0,
                    'has_next_page' => $pageInfo['hasNextPage'] ?? false,
                ],
            ]);
        } catch (Exception $e) {
            // Keep local search available when AniList is temporarily unreachable.
            try {
                $localResult = $this->manhwaModel->search($query, $page, $perPage, $filters);
                $this->success([
                    'data' => $localResult['items'],
                    'pagination' => [
                        'current_page' => $page,
                        'per_page' => $perPage,
                        'total' => $localResult['total'],
                        'has_next_page' => $page * $perPage < $localResult['total'],
                    ],
                ]);
            } catch (Exception $fallbackError) {
                $this->error('Error en búsqueda: ' . $e->getMessage(), 500);
            }
        }
    }

    public function getById(): void
    {
        $id = (int)($_GET['id'] ?? 0);
        
        if (!$id) {
            $this->error('ID requerido', 400);
        }

        $manhwa = $this->manhwaModel->findById($id);
        
        if (!$manhwa) {
            $this->error('Obra no encontrada', 404);
        }

        $this->success($manhwa);
    }

    public function getByAniListId(): void
    {
        $anilistId = (int)($_GET['anilist_id'] ?? 0);
        
        if (!$anilistId) {
            $this->error('AniList ID requerido', 400);
        }

        $manhwa = $this->manhwaModel->findByAniListId($anilistId);
        
        if (!$manhwa) {
            // Intentar obtener de AniList
            try {
                $media = $this->anilist->getMangaById($anilistId);
                if ($media) {
                    $data = $this->anilist->formatForStorage($media);
                    $newId = $this->manhwaModel->create($data);
                    $manhwa = $this->manhwaModel->findById($newId);
                }
            } catch (Exception $e) {
                $this->error('Error al obtener de AniList: ' . $e->getMessage(), 500);
            }
        }

        if (!$manhwa) {
            $this->error('Obra no encontrada', 404);
        }

        $this->success($manhwa);
    }

    public function getOrCreateFromAniList(): void
    {
        $input = $this->getInput();
        $anilistId = (int)($input['anilist_id'] ?? 0);
        
        if (!$anilistId) {
            $this->error('AniList ID requerido', 400);
        }

        // Buscar en BD
        $manhwa = $this->manhwaModel->findByAniListId($anilistId);
        
        if ($manhwa) {
            // Buscar/relacionar MangaDex si no tiene
            if (!$manhwa['mangadex_id']) {
                $this->linkMangaDex($manhwa);
                $manhwa = $this->manhwaModel->findById($manhwa['id']);
            }
            $this->success($manhwa);
            return;
        }

        // Obtener de AniList
        try {
            $media = $this->anilist->getMangaById($anilistId);
            
            if (!$media) {
                $this->error('Obra no encontrada en AniList', 404);
            }

            $data = $this->anilist->formatForStorage($media);
            $newId = $this->manhwaModel->create($data);
            $manhwa = $this->manhwaModel->findById($newId);

            // Intentar vincular MangaDex
            $this->linkMangaDex($manhwa);
            $manhwa = $this->manhwaModel->findById($newId);

            $this->success($manhwa);
        } catch (Exception $e) {
            $this->error('Error al crear obra: ' . $e->getMessage(), 500);
        }
    }

    public function getOrCreateFromMangaDex(): void
    {
        $input = $this->getInput();
        $mangadexId = trim($input['mangadex_id'] ?? '');
        
        if (!$mangadexId) {
            $this->error('MangaDex ID requerido', 400);
        }

        // Buscar en BD por MangaDex ID
        $manhwa = $this->manhwaModel->findByMangaDexId($mangadexId);
        
        if ($manhwa) {
            $this->success($manhwa);
            return;
        }

        // Obtener de MangaDex API
        try {
            $media = $this->mangadex->getMangaById($mangadexId);
            
            if (!$media) {
                $this->error('Obra no encontrada en MangaDex', 404);
            }

            $data = $this->mangadex->formatForStorage($media);
            $newId = $this->manhwaModel->create($data);
            $manhwa = $this->manhwaModel->findById($newId);

            // Sincronizar capítulos
            $this->syncChapters($newId, $mangadexId);
            $manhwa = $this->manhwaModel->findById($newId);

            $this->success($manhwa);
        } catch (Exception $e) {
            $this->error('Error al crear obra desde MangaDex: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Preview antes de guardar: valida el slug contra la fuente y devuelve
     * título + portada para confirmar que es la obra correcta.
     * GET /manhwa/preview-newcatharsis?slug=...
     */
    public function previewFromNewCatharsis(): void
    {
        $slug = trim($_GET['slug'] ?? '');
        if ($slug === '') {
            $this->error('Slug requerido', 400);
        }
        if (!NewCatharsisService::isValidSlug($slug)) {
            $this->error('Slug inválido. Usa solo minúsculas, números y guiones.', 400);
        }

        $existing = $this->manhwaModel->findBySource('newcatharsis', $slug);
        if ($existing) {
            $this->success(['preview' => $this->previewPayload($slug, []), 'existing' => $existing], 'Esta obra ya está en tu base de datos');
            return;
        }

        try {
            $manga = $this->newcatharsis->getManga($slug);
            $this->success(['preview' => $this->previewPayload($slug, $manga), 'existing' => null]);
        } catch (Exception $e) {
            $code = (int)($e->getCode() ?: 0);
            $this->error($e->getMessage(), $code === 404 ? 404 : 502);
        }
    }

    private function previewPayload(string $slug, array $manga): array
    {
        return [
            'slug' => $slug,
            'titulo' => $manga['titulo'] ?? null,
            'descripcion' => $manga['descripcion'] ?? null,
            'portada_url' => $manga['portada_url'] ?? null,
            'n_capitulos' => $manga['n_capitulos'] ?? null,
            'estado' => $manga['estado'] ?? null,
            'scan' => $manga['scan'] ?? null,
            'nsfw' => $manga['nsfw'] ?? false,
        ];
    }

    /**
     * Alta LAZY: solo trae metadata (título, portada, n_capitulos).
     * NO sincroniza capítulos — cada uno se trae en su primera apertura.
     * POST /manhwa/from-newcatharsis {slug}
     */
    public function getOrCreateFromNewCatharsis(): void
    {
        $input = $this->getInput();
        $slug = trim($input['slug'] ?? '');
        if ($slug === '') {
            $this->error('Slug requerido', 400);
        }
        if (!NewCatharsisService::isValidSlug($slug)) {
            $this->error('Slug inválido. Usa solo minúsculas, números y guiones.', 400);
        }

        $existing = $this->manhwaModel->findBySource('newcatharsis', $slug);
        if ($existing) {
            $this->success($existing);
            return;
        }

        try {
            $manga = $this->newcatharsis->getManga($slug);
            if (empty($manga['titulo'])) {
                $this->error('La fuente no devolvió título para ese slug', 502);
            }
            $data = $this->newcatharsis->formatForStorage($manga, $slug);
            $newId = $this->manhwaModel->create($data);
            $manhwa = $this->manhwaModel->findById($newId);
            // Intencionalmente SIN sync de capítulos (lazy por apertura).
            $this->success($manhwa, 'Obra dada de alta. Los capítulos se sincronizan al abrirlos.');
        } catch (Exception $e) {
            $code = (int)($e->getCode() ?: 0);
            $this->error('Error al crear obra desde NewCatharsis: ' . $e->getMessage(), $code === 404 ? 404 : 500);
        }
    }

    private function linkMangaDex(array &$manhwa): void
    {
        if ($manhwa['mangadex_id']) return;

        try {
            $mangadexId = $this->mangadex->findMangaByAniListTitle(
                $manhwa['title_romaji'] ?? $manhwa['title'],
                [$manhwa['title_english'] ?? '', $manhwa['title_native'] ?? '']
            );

            if ($mangadexId) {
                $this->manhwaModel->update($manhwa['id'], ['mangadex_id' => $mangadexId]);
                $manhwa['mangadex_id'] = $mangadexId;
                
                // Obtener y guardar capítulos
                $this->syncChapters($manhwa['id'], $mangadexId);
            }
        } catch (Exception $e) {
            error_log("MangaDex link failed: " . $e->getMessage());
        }
    }

    private function syncChapters(int $manhwaId, string $mangadexId): void
    {
        try {
            $result = $this->mangadex->getAllChapters($mangadexId, ['language' => ['es-la', 'es', 'en']]);
            $chapters = $this->mangadex->formatChaptersForStorage($result['data'] ?? []);
            
            if (!empty($chapters)) {
                require_once __DIR__ . '/../models/Chapter.php';
                $chapterModel = new Chapter();
                $chapterModel->replaceAll($manhwaId, $chapters);
            }
        } catch (Exception $e) {
            error_log("Chapter sync failed: " . $e->getMessage());
        }
    }

    public function updateChapters(): void
    {
        $auth = new AuthMiddleware();
        $payload = $auth->requireAuth();
        
        $id = (int)($_GET['id'] ?? 0);
        
        if (!$id) {
            $this->error('ID requerido', 400);
        }

        $manhwa = $this->manhwaModel->findById($id);
        
        if (!$manhwa) {
            $this->error('Obra no encontrada', 404);
        }

        // NewCatharsis: sincronización bajo demanda (lazy por apertura).
        // No hay bulk: disparar N peticiones en ráfaga es patrón bot.
        if (($manhwa['source_provider'] ?? '') === 'newcatharsis') {
            $this->error('Sincronización bajo demanda: abre el capítulo para sincronizarlo', 400);
        }

        if (!$manhwa['mangadex_id']) {
            $this->linkMangaDex($manhwa);
            $manhwa = $this->manhwaModel->findById($id);
        }

        if (!$manhwa || !$manhwa['mangadex_id']) {
            $this->error('No se encontró una versión disponible en MangaDex', 404);
        }

        $this->syncChapters($id, $manhwa['mangadex_id']);
        
        $chapters = $this->getChaptersModel()->getByManhwaId($id);
        $this->success(['chapters' => $chapters], 'Capítulos actualizados');
    }

    private function getChaptersModel()
    {
        require_once __DIR__ . '/../models/Chapter.php';
        return new Chapter();
    }

    public function getGenres(): void
    {
        $genres = $this->manhwaModel->getGenres();
        $this->success($genres);
    }

    public function getTags(): void
    {
        $tags = $this->manhwaModel->getTags();
        $this->success($tags);
    }
}