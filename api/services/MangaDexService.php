<?php
/**
 * Servicio para interactuar con la API de MangaDex
 */
class MangaDexService
{
    private string $url;
    private int $timeout;
    private array $headers;
    private string $token = '';
    private int $tokenExpires = 0;
    private bool $authAttempted = false;

    public function __construct()
    {
        $config = require __DIR__ . '/../config/config.php';
        $this->url = $config['mangadex']['url'];
        $this->timeout = $config['mangadex']['timeout'];
        $this->headers = [
            'Content-Type: application/json',
            'Accept: application/json',
            'User-Agent: BL Tracker/1.0',
        ];
    }

    private function request(string $method, string $endpoint, array $data = []): array
    {
        $this->ensureAuth();
        
        $url = $this->url . $endpoint;
        $ch = curl_init($url);
        
        $headers = $this->headers;
        if ($this->token) {
            $headers[] = "Authorization: Bearer {$this->token}";
        }

        $options = [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_SSL_VERIFYPEER => true,
        ];

        if (in_array($method, ['POST', 'PUT', 'PATCH']) && !empty($data)) {
            $options[CURLOPT_POSTFIELDS] = json_encode($data);
        }

        curl_setopt_array($ch, $options);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception("MangaDex API error: $error");
        }

        $result = json_decode($response, true);

        if ($httpCode === 401) {
            $this->token = '';
            $this->tokenExpires = 0;
            return $this->request($method, $endpoint, $data);
        }

        if ($httpCode >= 400) {
            $message = $result['errors'][0]['detail'] ?? "HTTP $httpCode";
            throw new Exception("MangaDex API error ($httpCode): $message");
        }

        return $result;
    }

    private function ensureAuth(): void
    {
        if ($this->token && time() < $this->tokenExpires - 60) {
            return;
        }

        $username = $_ENV['MANGADEX_USERNAME'] ?? '';
        $password = $_ENV['MANGADEX_PASSWORD'] ?? '';
        
        if (!$username || !$password) {
            return; // Sin credenciales, solo acceso público
        }

        // Prevent infinite retry loop
        if ($this->authAttempted && !$this->token) {
            return;
        }
        $this->authAttempted = true;

        try {
            $result = $this->request('POST', '/auth/login', [
                'grant_type' => 'password',
                'username' => $username,
                'password' => $password,
            ]);
            
            $this->token = $result['token']['session'] ?? '';
            $this->tokenExpires = time() + ($result['token']['expires_in'] ?? 3600);
        } catch (Exception $e) {
            error_log("MangaDex auth failed: " . $e->getMessage());
            $this->token = '';
            $this->tokenExpires = 0;
        }
    }

    private function buildQuery(array $scalars, array $lists = []): string
    {
        $parts = [];
        if ($scalars) $parts[] = http_build_query($scalars, '', '&', PHP_QUERY_RFC3986);
        foreach ($lists as $key => $values) {
            foreach ((array)$values as $value) {
                $parts[] = rawurlencode($key . '[]') . '=' . rawurlencode((string)$value);
            }
        }
        return implode('&', $parts);
    }

    public function searchManga(string $query, array $options = []): array
    {
        $params = [
            'title' => $query,
            'limit' => $options['limit'] ?? 20,
            'offset' => $options['offset'] ?? 0,
        ];

        $lists = [
            'includes' => ['cover_art', 'author', 'artist'],
            'contentRating' => ['safe', 'suggestive', 'erotica', 'pornographic'],
        ];
        if (!empty($options['tags'])) $lists['tags'] = $options['tags'];
        if (!empty($options['status'])) $lists['status'] = $options['status'];

        $queryString = $this->buildQuery($params, $lists);
        return $this->request('GET', "/manga?$queryString");
    }

    public function getMangaById(string $id): ?array
    {
        $result = $this->request('GET', "/manga/$id", [
            'includes[]' => ['cover_art', 'author', 'artist', 'scanlation_group'],
        ]);
        return $result['data'] ?? null;
    }

    public function getChapters(string $mangaId, array $options = []): array
    {
        $languages = $options['language'] ?? ['es-la', 'es', 'en'];
        $scalars = ['manga' => $mangaId, 'limit' => min($options['limit'] ?? 100, 100), 'offset' => $options['offset'] ?? 0, 'order[chapter]' => 'asc'];
        if (!empty($options['chapter'])) $scalars['chapter'] = $options['chapter'];
        $queryString = $this->buildQuery($scalars, ['translatedLanguage' => $languages, 'includes' => ['scanlation_group', 'user']]);
        $result = $this->request('GET', "/chapter?$queryString");
        // Fallback: si no hay resultados en es-la/es/en, probar solo en inglés u otros idiomas
        if (empty($result['data']) && $languages !== ['en']) {
            $fallbackQuery = $this->buildQuery($scalars, ['translatedLanguage' => ['en'], 'includes' => ['scanlation_group', 'user']]);
            $fallback = $this->request('GET', "/chapter?$fallbackQuery");
            if (!empty($fallback['data'])) return $fallback;
        }
        return $result;
    }

    public function getAllChapters(string $mangaId, array $options = []): array
    {
        $all = [];
        $offset = 0;
        $limit = 100;
        do {
            $page = $this->getChapters($mangaId, array_merge($options, ['limit' => $limit, 'offset' => $offset]));
            $data = $page['data'] ?? [];
            $all = array_merge($all, $data);
            $total = $page['total'] ?? count($data);
            $offset += $limit;
            if (count($data) < $limit) break;
            if ($offset >= $total) break;
            // Seguridad: máximo 500 capítulos por obra
            if (count($all) >= 500) break;
        } while (true);
        return ['data' => $all, 'total' => count($all)];
    }

    public function getChapterPages(string $chapterId): array
    {
        return $this->request('GET', "/at-home/server/$chapterId");
    }

    public function getCoverUrl(string $mangaId, array $coverArt): ?string
    {
        if (empty($coverArt)) return null;
        
        $fileName = $coverArt['attributes']['fileName'] ?? null;
        if (!$fileName) return null;
        
        return "https://uploads.mangadex.org/covers/$mangaId/$fileName";
    }

    public function formatForStorage(array $media): array
    {
        $attrs = $media['attributes'] ?? [];
        $coverArt = null;
        foreach ($media['relationships'] ?? [] as $rel) {
            if ($rel['type'] === 'cover_art') {
                $coverArt = $rel;
                break;
            }
        }
        
        $coverUrl = $this->getCoverUrl($media['id'], $coverArt);
        
        $tags = [];
        foreach ($attrs['tags'] ?? [] as $tag) {
            if (!$tag['attributes']['isAdult'] ?? false) {
                $tags[] = $tag['attributes']['name']['en'] ?? '';
            }
        }

        return [
            'mangadex_id' => $media['id'],
            'title' => $attrs['title']['en'] ?? $attrs['title']['ja-ro'] ?? '',
            'title_english' => $attrs['title']['en'] ?? null,
            'title_romaji' => $attrs['title']['ja-ro'] ?? null,
            'title_native' => $attrs['title']['ja'] ?? null,
            'description' => $attrs['description']['en'] ?? '',
            'cover_image' => $coverUrl,
            'banner_image' => null,
            'genres' => json_encode(array_values(array_filter(array_unique($attrs['genres'] ?? [])))),
            'tags' => json_encode(array_values(array_filter(array_unique($tags)))),
            'status' => $attrs['status'] ?? 'UNKNOWN',
            'format' => 'MANGA',
            'source' => 'MangaDex',
            'chapters' => null,
            'volumes' => null,
            'start_date' => null,
            'end_date' => null,
            'season' => null,
            'season_year' => null,
            'country_of_origin' => 'JP',
            'is_licensed' => 0,
            'is_adult' => (int)($attrs['contentRating'] === 'erotica' || $attrs['contentRating'] === 'pornographic'),
            'average_score' => null,
            'popularity' => $attrs['followedCount'] ?? 0,
            'favourites' => 0,
        ];
    }

    public function formatChaptersForStorage(array $chaptersData): array
    {
        $chapters = [];
        
        foreach ($chaptersData as $chapter) {
            $attrs = $chapter['attributes'] ?? [];
            
            $chapterNum = $attrs['chapter'] ?? '0';
            $volume = $attrs['volume'] ?? null;
            $title = $attrs['title'] ?? '';
            $language = $attrs['translatedLanguage'] ?? 'en';
            $pages = $attrs['pages'] ?? null;
            $publishAt = $attrs['publishAt'] ?? $attrs['createdAt'] ?? null;
            
            // Convertir a número para ordenar
            $num = (float)$chapterNum;
            
            $chapters[] = [
                'mangadex_chapter_id' => $chapter['id'],
                'chapter_number' => $num,
                'title' => $title,
                'volume' => $volume ? (float)$volume : null,
                'language' => $language,
                'pages' => $pages,
                'publish_date' => $publishAt ? date('Y-m-d', strtotime($publishAt)) : null,
            ];
        }
        
        return $chapters;
    }

    public function findMangaByAniListTitle(string $title, array $alternativeTitles = []): ?string
    {
        $results = $this->searchManga($title, ['limit' => 10]);
        
        foreach ($results['data'] ?? [] as $manga) {
            $attrs = $manga['attributes'] ?? [];
            $mangaTitle = $attrs['title']['en'] ?? $attrs['title']['ja-ro'] ?? '';
            $altTitles = [];
            foreach ($attrs['altTitles'] ?? [] as $altTitle) {
                foreach ($altTitle as $value) {
                    if (is_string($value)) $altTitles[] = $value;
                }
            }

            $allTitles = array_merge([$mangaTitle], $altTitles, $alternativeTitles);
            foreach ($allTitles as $candidateTitle) {
                if (!is_string($candidateTitle) || !$candidateTitle) continue;
                similar_text(strtolower($candidateTitle), strtolower($title), $similarity);
                if ($similarity >= 80) {
                    return $manga['id'];
                }
            }
        }
        
        return null;
    }
}