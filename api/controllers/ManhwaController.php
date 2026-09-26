<?php
/**
 * Controlador de Manhwas
 */
require_once __DIR__ . '/../models/Manhwa.php';
require_once __DIR__ . '/../services/AniListService.php';
require_once __DIR__ . '/../services/MangaDexService.php';
require_once __DIR__ . '/BaseController.php';

class ManhwaController extends BaseController
{
    private Manhwa $manhwaModel;
    private AniListService $anilist;
    private MangaDexService $mangadex;

    public function __construct()
    {
        parent::__construct();
        $this->manhwaModel = new Manhwa();
        $this->anilist = new AniListService();
        $this->mangadex = new MangaDexService();
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
            $this->error('Obra no encontrada o sin MangaDex ID', 404);
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