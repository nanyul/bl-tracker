<?php
/**
 * Modelo de Manhwa/Manga
 */
class Manhwa
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function create(array $data): ?int
    {
        $fields = [
            'anilist_id', 'mangadex_id', 'title', 'title_english', 'title_romaji', 
            'title_native', 'description', 'cover_image', 'banner_image',
            'status', 'format', 'source', 'chapters', 'volumes',
            'start_date', 'end_date', 'season', 'season_year',
            'country_of_origin', 'is_licensed', 'is_adult',
            'average_score', 'popularity', 'favourites',
            'genres', 'tags'
        ];

        $placeholders = array_map(fn() => '?', $fields);
        $sql = "INSERT INTO manhwas (" . implode(', ', $fields) . ", created_at, updated_at) 
                VALUES (" . implode(', ', $placeholders) . ", NOW(), NOW())";

        $values = array_map(fn($f) => $data[$f] ?? null, $fields);
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($values);
        return (int)$this->db->lastInsertId();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM manhwas WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ? $this->formatRow($row) : null;
    }

    public function findByAniListId(int $anilistId): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM manhwas WHERE anilist_id = ?");
        $stmt->execute([$anilistId]);
        $row = $stmt->fetch();
        return $row ? $this->formatRow($row) : null;
    }

    public function findByMangaDexId(string $mangadexId): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM manhwas WHERE mangadex_id = ?");
        $stmt->execute([$mangadexId]);
        $row = $stmt->fetch();
        return $row ? $this->formatRow($row) : null;
    }

    public function search(string $query, int $page = 1, int $perPage = 20, array $filters = []): array
    {
        $offset = ($page - 1) * $perPage;
        $where = ["(title LIKE ? OR title_english LIKE ? OR title_romaji LIKE ? OR description LIKE ?)"];
        $params = ["%$query%", "%$query%", "%$query%", "%$query%"];

        if (!empty($filters['genres'])) {
            $placeholders = implode(',', array_fill(0, count($filters['genres']), '?'));
            $where[] = "JSON_CONTAINS(genres, ?)"; // Simplified for demo
        }
        if (!empty($filters['status'])) {
            $where[] = "status = ?";
            $params[] = $filters['status'];
        }

        $whereClause = implode(' AND ', $where);

        // TiDB no acepta placeholders en LIMIT/OFFSET (error 1210): interpolar ints.
        $perPage = (int)$perPage;
        $offset = (int)$offset;
        $sql = "SELECT * FROM manhwas WHERE $whereClause ORDER BY popularity DESC LIMIT $perPage OFFSET $offset";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $items = array_map([$this, 'formatRow'], $stmt->fetchAll());

        // Count total
        $countSql = "SELECT COUNT(*) FROM manhwas WHERE $whereClause";
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        return ['items' => $items, 'total' => $total];
    }

    public function getAll(int $page = 1, int $perPage = 20, array $filters = []): array
    {
        $offset = ($page - 1) * $perPage;
        $where = [];
        $params = [];

        if (!empty($filters['status'])) {
            $where[] = "status = ?";
            $params[] = $filters['status'];
        }

        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $perPage = (int)$perPage;
        $offset = (int)$offset;
        $sql = "SELECT * FROM manhwas $whereClause ORDER BY popularity DESC LIMIT $perPage OFFSET $offset";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $items = array_map([$this, 'formatRow'], $stmt->fetchAll());

        $countSql = "SELECT COUNT(*) FROM manhwas $whereClause";
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        return ['items' => $items, 'total' => $total];
    }

    public function update(int $id, array $data): bool
    {
        $allowed = [
            'mangadex_id', 'title', 'title_english', 'title_romaji', 'title_native',
            'description', 'cover_image', 'banner_image', 'status', 'format', 'source',
            'chapters', 'volumes', 'start_date', 'end_date', 'season', 'season_year',
            'country_of_origin', 'is_licensed', 'is_adult',
            'average_score', 'popularity', 'favourites', 'genres', 'tags'
        ];

        $fields = [];
        $values = [];
        foreach ($allowed as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = ?";
                $values[] = $data[$field];
            }
        }
        if (empty($fields)) return false;

        $fields[] = "updated_at = NOW()";
        $values[] = $id;

        $stmt = $this->db->prepare("UPDATE manhwas SET " . implode(', ', $fields) . " WHERE id = ?");
        return $stmt->execute($values);
    }

    public function getGenres(): array
    {
        $stmt = $this->db->query("SELECT DISTINCT JSON_UNQUOTE(JSON_EXTRACT(genres, '\$[*]')) as genre FROM manhwas WHERE genres IS NOT NULL");
        $genres = [];
        foreach ($stmt->fetchAll() as $row) {
            $decoded = json_decode($row['genre'], true);
            if (is_array($decoded)) {
                $genres = array_merge($genres, $decoded);
            }
        }
        return array_values(array_unique(array_filter($genres)));
    }

    public function getTags(): array
    {
        $stmt = $this->db->query("SELECT DISTINCT JSON_UNQUOTE(JSON_EXTRACT(tags, '\$[*]')) as tag FROM manhwas WHERE tags IS NOT NULL");
        $tags = [];
        foreach ($stmt->fetchAll() as $row) {
            $decoded = json_decode($row['tag'], true);
            if (is_array($decoded)) {
                $tags = array_merge($tags, $decoded);
            }
        }
        return array_values(array_unique(array_filter($tags)));
    }

    private function formatRow(array $row): array
    {
        $jsonFields = ['genres', 'tags'];
        foreach ($jsonFields as $field) {
            if (isset($row[$field]) && is_string($row[$field])) {
                $row[$field] = json_decode($row[$field], true) ?? [];
            }
        }
        return $row;
    }
}