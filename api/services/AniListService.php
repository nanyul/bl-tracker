<?php
/**
 * Servicio para interactuar con la API de AniList (GraphQL)
 */
class AniListService
{
    private string $url;
    private int $timeout;
    private array $headers;

    public function __construct()
    {
        $config = require __DIR__ . '/../config/config.php';
        $this->url = $config['anilist']['url'];
        $this->timeout = $config['anilist']['timeout'];
        $this->headers = [
            'Content-Type: application/json',
            'Accept: application/json',
            'User-Agent: BL Tracker/1.0',
        ];
    }

    private function executeQuery(string $query, array $variables = []): array
    {
        $payload = json_encode(['query' => $query, 'variables' => $variables]);
        
        $ch = curl_init($this->url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => $this->headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception("AniList API error: $error");
        }

        $data = json_decode($response, true);
        
        if ($httpCode !== 200) {
            $message = $data['errors'][0]['message'] ?? 'Unknown AniList error';
            throw new Exception("AniList API error ($httpCode): $message");
        }

        if (isset($data['errors'])) {
            throw new Exception("AniList GraphQL errors: " . json_encode($data['errors']));
        }

        return $data['data'] ?? [];
    }

    public function searchManga(string $query, int $page = 1, int $perPage = 20, array $filters = []): array
    {
        $graphql = '
            query ($search: String, $page: Int, $perPage: Int) {
                Page(page: $page, perPage: $perPage) {
                    pageInfo { total, hasNextPage }
                    media(search: $search, type: MANGA, sort: POPULARITY_DESC) {
                        id
                        title { romaji, english, native }
                        description
                        coverImage { large, medium }
                        bannerImage
                        genres
                        tags { name, category, isAdult }
                        status
                        format
                        source
                        chapters
                        volumes
                        startDate { year, month, day }
                        endDate { year, month, day }
                        season
                        seasonYear
                        countryOfOrigin
                        isLicensed
                        isAdult
                        averageScore
                        popularity
                        favourites
                        updatedAt
                    }
                }
            }
        ';

        $data = $this->executeQuery($graphql, [
            'search' => $query ?: null,
            'page' => $page,
            'perPage' => $perPage,
        ]);

        return $data['Page'] ?? ['media' => [], 'pageInfo' => []];
    }

    public function getMangaById(int $anilistId): ?array
    {
        $graphql = '
            query ($id: Int) {
                Media(id: $id, type: MANGA) {
                    id
                    title { romaji, english, native }
                    description
                    coverImage { large, medium }
                    bannerImage
                    genres
                    tags { name, category, isAdult }
                    status
                    format
                    source
                    chapters
                    volumes
                    startDate { year, month, day }
                    endDate { year, month, day }
                    season
                    seasonYear
                    countryOfOrigin
                    isLicensed
                    isAdult
                    averageScore
                    popularity
                    favourites
                    updatedAt
                }
            }
        ';

        $data = $this->executeQuery($graphql, ['id' => $anilistId]);
        return $data['Media'] ?? null;
    }

    public function getMangaByIds(array $ids): array
    {
        if (empty($ids)) return [];
        
        $graphql = '
            query ($ids: [Int]) {
                Page(perPage: ' . count($ids) . ') {
                    media(id_in: $ids, type: MANGA) {
                        id
                        title { romaji, english, native }
                        coverImage { large, medium }
                        genres
                        status
                        averageScore
                        chapters
                    }
                }
            }
        ';

        $data = $this->executeQuery($graphql, ['ids' => $ids]);
        return $data['Page']['media'] ?? [];
    }

    public function formatForStorage(array $media): array
    {
        $startDate = null;
        if (!empty($media['startDate']['year'])) {
            $startDate = sprintf(
                '%04d-%02d-%02d',
                $media['startDate']['year'] ?? 0,
                $media['startDate']['month'] ?? 1,
                $media['startDate']['day'] ?? 1
            );
        }

        $endDate = null;
        if (!empty($media['endDate']['year'])) {
            $endDate = sprintf(
                '%04d-%02d-%02d',
                $media['endDate']['year'] ?? 0,
                $media['endDate']['month'] ?? 1,
                $media['endDate']['day'] ?? 1
            );
        }

        $tags = array_filter($media['tags'] ?? [], fn($t) => !$t['isAdult']);
        $tagNames = array_map(fn($t) => $t['name'], $tags);

        return [
            'anilist_id' => $media['id'],
            'title' => $media['title']['romaji'] ?? '',
            'title_english' => $media['title']['english'],
            'title_romaji' => $media['title']['romaji'],
            'title_native' => $media['title']['native'],
            'description' => $media['description'] ?? '',
            'cover_image' => $media['coverImage']['large'] ?? $media['coverImage']['medium'] ?? null,
            'banner_image' => $media['bannerImage'],
            'genres' => json_encode($media['genres'] ?? []),
            'tags' => json_encode($tagNames),
            'status' => $media['status'] ?? 'UNKNOWN',
            'format' => $media['format'] ?? null,
            'source' => $media['source'] ?? null,
            'chapters' => $media['chapters'],
            'volumes' => $media['volumes'],
            'start_date' => $startDate,
            'end_date' => $endDate,
            'season' => $media['season'],
            'season_year' => $media['seasonYear'],
            'country_of_origin' => $media['countryOfOrigin'],
            'is_licensed' => $media['isLicensed'] ?? false,
            'is_adult' => $media['isAdult'] ?? false,
            'average_score' => $media['averageScore'],
            'popularity' => $media['popularity'],
            'favourites' => $media['favourites'],
        ];
    }
}