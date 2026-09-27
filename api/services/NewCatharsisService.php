<?php
/**
 * Servicio para la fuente "NewCatharsis" (newcatharsis.dig-it.info)
 * Backend detectado: Directus (CMS headless) — API pública, CORS abierto.
 *
 * Flujo:
 *   1. GET /api/mangas/{slug}          -> info de la obra + n_capitulos
 *   2. GET /api/mangas/{slug}/{numero} -> info del capítulo + array "paginas" (tokens)
 *   3. Cada token en "paginas" es base64url de {"f":"<uuid>","e":<expira_unix>}.
 *      /assets/{uuid} sirve la imagen directo, con CORS abierto (*).
 *
 * Diseño lazy (anti-bot): el alta solo trae metadata. Cada capítulo se
 * sincroniza la primera vez que alguien lo abre (1 request = 1 lectura real).
 * No hay caché en disco: chapters.image_urls en TiDB ES el caché.
 */
class NewCatharsisService
{
    private string $baseUrl;
    private int $timeout;

    public function __construct()
    {
        $config = require __DIR__ . '/../config/config.php';
        $this->baseUrl = rtrim($config['newcatharsis']['url'] ?? 'https://newcatharsis.dig-it.info', '/');
        $this->timeout = (int)($config['newcatharsis']['timeout'] ?? 15);
    }

    /**
     * Valida formato de slug antes de pegarle a la fuente.
     */
    public static function isValidSlug(string $slug): bool
    {
        return (bool)preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug);
    }

    /**
     * Trae la info de la obra (metadata, sin capítulos).
     */
    public function getManga(string $slug): array
    {
        $slug = trim($slug);
        if (!self::isValidSlug($slug)) {
            throw new Exception('Slug inválido. Usa solo minúsculas, números y guiones.');
        }

        $data = $this->request("/api/mangas/{$slug}");

        return [
            'slug'         => $slug,
            'titulo'       => $data['nombre'] ?? null,
            'descripcion'  => $data['descripcion'] ?? null,
            'portada_uuid' => $data['portada_url'] ?? null,
            'portada_url'  => !empty($data['portada_url'])
                ? $this->baseUrl . '/assets/' . $data['portada_url']
                : null,
            'n_capitulos'  => $data['n_capitulos'] ?? null,
            'estado'       => $data['estado'] ?? null,
            'scan'         => $data['fk_scans']['nombre'] ?? null,
            'nsfw'         => $data['nsfw'] ?? false,
        ];
    }

    /**
     * Trae un capítulo específico con las URLs de imagen ya resueltas.
     * Se llama UNA vez por capítulo (lazy, en la primera apertura).
     */
    public function getChapter(string $slug, int $numero): array
    {
        $slug = trim($slug);
        if (!self::isValidSlug($slug)) {
            throw new Exception('Slug inválido.');
        }
        if ($numero < 1) {
            throw new Exception('Número de capítulo inválido.');
        }

        $data = $this->request("/api/mangas/{$slug}/{$numero}");

        $imagenes = [];
        foreach (($data['paginas'] ?? []) as $token) {
            $uuid = $this->extraerUuidDelToken((string)$token);
            if ($uuid !== null) {
                $imagenes[] = $this->baseUrl . '/assets/' . $uuid;
            }
        }

        return [
            'slug'      => $slug,
            'numero'    => $data['numero'] ?? $numero,
            'titulo'    => $data['titulo'] ?? null,
            'n_paginas' => $data['n_paginas'] ?? count($imagenes),
            'imagenes'  => $imagenes,
        ];
    }

    /**
     * Convierte metadata de NewCatharsis a fila de `manhwas`.
     * El alta es solo-metadata: no crea filas de capítulos.
     */
    public function formatForStorage(array $manga, string $slug): array
    {
        $estado = strtoupper((string)($manga['estado'] ?? ''));
        $status = match ($estado) {
            'FINALIZADO', 'COMPLETO', 'COMPLETADO', 'FINISHED' => 'FINISHED',
            'PAUSADO', 'HIATUS' => 'HIATUS',
            'CANCELADO', 'CANCELLED' => 'CANCELLED',
            default => 'RELEASING',
        };

        return [
            'anilist_id' => null,
            'mangadex_id' => null,
            'title' => $manga['titulo'] ?? $slug,
            'title_english' => null,
            'title_romaji' => null,
            'title_native' => null,
            'description' => $manga['descripcion'] ?? '',
            'cover_image' => $manga['portada_url'] ?? null,
            'banner_image' => null,
            'genres' => json_encode([]),
            'tags' => json_encode([]),
            'status' => $status,
            'format' => 'MANGA',
            'source' => 'NewCatharsis',
            'source_provider' => 'newcatharsis',
            'source_slug' => $slug,
            'chapters' => $manga['n_capitulos'] ?? null,
            'volumes' => null,
            'start_date' => null,
            'end_date' => null,
            'season' => null,
            'season_year' => null,
            'country_of_origin' => 'KR',
            'is_licensed' => 0,
            'is_adult' => !empty($manga['nsfw']) ? 1 : 0,
            'average_score' => null,
            'popularity' => 0,
            'favourites' => 0,
        ];
    }

    /**
     * Convierte un capítulo de NewCatharsis a fila de `chapters`.
     * image_urls JSON es el caché: una vez guardado no se vuelve a la fuente.
     */
    public function formatChapterForStorage(int $manhwaId, array $chapter): array
    {
        $numero = (float)($chapter['numero'] ?? 0);
        $slug = $chapter['slug'] ?? '';

        return [
            'manhwa_id' => $manhwaId,
            'mangadex_chapter_id' => null,
            'provider' => 'newcatharsis',
            'external_ref' => "{$slug}:{$chapter['numero']}",
            'chapter_number' => $numero,
            'title' => $chapter['titulo'] ?? null,
            'volume' => null,
            'language' => 'es',
            'pages' => $chapter['n_paginas'] ?? count($chapter['imagenes'] ?? []),
            'publish_date' => null,
            'image_urls' => json_encode(array_values($chapter['imagenes'] ?? [])),
        ];
    }

    /**
     * Decodifica el token "payloadB64.firma" y extrae "f" (uuid).
     * No se valida la firma porque /assets no la exige.
     */
    private function extraerUuidDelToken(string $token): ?string
    {
        $payloadB64 = explode('.', $token)[0] ?? '';
        if ($payloadB64 === '') {
            return null;
        }

        $b64 = strtr($payloadB64, '-_', '+/');
        $padding = strlen($b64) % 4;
        if ($padding > 0) {
            $b64 .= str_repeat('=', 4 - $padding);
        }

        $json = base64_decode($b64, true);
        if ($json === false) {
            return null;
        }

        $payload = json_decode($json, true);
        return is_array($payload) ? ($payload['f'] ?? null) : null;
    }

    private function request(string $path): array
    {
        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_HTTPHEADER => [
                'Accept: application/json',
                'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                    . 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
                'Referer: ' . $this->baseUrl . '/',
            ],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            throw new Exception("Error de conexión con NewCatharsis: {$error}");
        }
        if ($httpCode === 404) {
            throw new Exception('Obra o capítulo no encontrado en NewCatharsis (404). Revisa el slug.', 404);
        }
        if ($httpCode !== 200) {
            throw new Exception("NewCatharsis respondió HTTP {$httpCode} para {$path}");
        }

        $data = json_decode($response, true);
        if (!is_array($data)) {
            throw new Exception("Respuesta JSON inválida de NewCatharsis para {$path}");
        }

        // Directus a veces envuelve en {"data": {...}}
        $unwrapped = $data['data'] ?? $data;
        if (!is_array($unwrapped)) {
            throw new Exception("Respuesta JSON inválida de NewCatharsis para {$path}");
        }
        return $unwrapped;
    }
}
