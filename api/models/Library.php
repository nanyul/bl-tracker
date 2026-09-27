<?php
/**
 * Modelo de Biblioteca del usuario
 */
class Library
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function add(int $userId, int $manhwaId, array $data = []): ?int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO library (user_id, manhwa_id, status, current_chapter, favorite, score, notes, started_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE 
                status = VALUES(status),
                current_chapter = VALUES(current_chapter),
                favorite = VALUES(favorite),
                score = VALUES(score),
                notes = VALUES(notes),
                updated_at = NOW()"
        );
        
        $stmt->execute([
            $userId,
            $manhwaId,
            $data['status'] ?? 'PENDIENTE',
            $data['current_chapter'] ?? 0,
            (int)($data['favorite'] ?? false),
            $data['score'] ?? null,
            $data['notes'] ?? null,
            $data['started_at'] ?? null,
        ]);
        
        return (int)$this->db->lastInsertId();
    }

    public function getUserLibrary(int $userId, array $filters = [], int $page = 1, int $perPage = 20): array
    {
        $offset = ($page - 1) * $perPage;
        $where = ["l.user_id = ?"];
        $params = [$userId];

        // Status filter - support multiple statuses
        if (!empty($filters['status'])) {
            $statuses = is_array($filters['status']) ? $filters['status'] : [$filters['status']];
            $placeholders = implode(',', array_fill(0, count($statuses), '?'));
            $where[] = "l.status IN ($placeholders)";
            $params = array_merge($params, $statuses);
        }
        if (!empty($filters['favorite'])) {
            $where[] = "l.favorite = 1";
        }
        if (!empty($filters['search'])) {
            $where[] = "(m.title LIKE ? OR m.title_english LIKE ? OR m.title_romaji LIKE ?)";
            $search = "%{$filters['search']}%";
            $params[] = $search;
            $params[] = $search;
            $params[] = $search;
        }
        // Tags filter
        if (!empty($filters['tags'])) {
            $tags = is_array($filters['tags']) ? $filters['tags'] : [$filters['tags']];
            $tagConditions = [];
            foreach ($tags as $tag) {
                $tagConditions[] = "JSON_CONTAINS(m.tags, ?)";
                $params[] = json_encode($tag);
            }
            $where[] = "(" . implode(' OR ', $tagConditions) . ")";
        }
        // Year filter (start year from manhwa)
        if (!empty($filters['year_min'])) {
            $where[] = "YEAR(m.start_date) >= ?";
            $params[] = (int)$filters['year_min'];
        }
        if (!empty($filters['year_max'])) {
            $where[] = "YEAR(m.start_date) <= ?";
            $params[] = (int)$filters['year_max'];
        }
        // Score filter
        if (!empty($filters['score_min'])) {
            $where[] = "m.average_score >= ?";
            $params[] = (int)$filters['score_min'];
        }
        if (!empty($filters['score_max'])) {
            $where[] = "m.average_score <= ?";
            $params[] = (int)$filters['score_max'];
        }
        // Format filter
        if (!empty($filters['format'])) {
            $where[] = "m.format = ?";
            $params[] = $filters['format'];
        }
        // User score filter
        if (!empty($filters['user_score_min'])) {
            $where[] = "l.score >= ?";
            $params[] = (float)$filters['user_score_min'];
        }

        $orderBy = 'l.updated_at DESC';
        if (!empty($filters['sort'])) {
            $sortMap = [
                'updated_desc' => 'l.updated_at DESC',
                'updated_asc' => 'l.updated_at ASC',
                'title_asc' => 'm.title ASC',
                'title_desc' => 'm.title DESC',
                'progress_desc' => 'l.current_chapter DESC',
                'score_desc' => 'l.score DESC',
                'score_asc' => 'l.score ASC',
                'started_desc' => 'l.started_at DESC',
            ];
            $orderBy = $sortMap[$filters['sort']] ?? $orderBy;
        }

        $whereClause = implode(' AND ', $where);
        
        $sql = "SELECT l.*, m.id as id, m.title, m.title_english, m.title_romaji, m.title_native, m.description, m.cover_image, m.banner_image, m.genres, m.tags, m.status as manhwa_status, m.format, m.chapters, m.volumes, m.start_date, m.end_date, m.average_score, m.popularity, m.favourites, m.is_adult, m.anilist_id, m.mangadex_id FROM library l
                JOIN manhwas m ON l.manhwa_id = m.id
                WHERE $whereClause
                ORDER BY $orderBy
                LIMIT ? OFFSET ?";
        $params[] = $perPage;
        $params[] = $offset;

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll();

        $countSql = "SELECT COUNT(*) FROM library l JOIN manhwas m ON l.manhwa_id = m.id WHERE $whereClause";
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute(array_slice($params, 0, -2));
        $total = (int)$countStmt->fetchColumn();

        return ['data' => $items, 'total' => $total, 'hasMore' => $page * $perPage < $total];
    }

    public function getEntry(int $userId, int $manhwaId): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT l.*, m.id as id, m.title, m.title_english, m.title_romaji, m.title_native, m.description, m.cover_image, m.banner_image, m.genres, m.tags, m.status as manhwa_status, m.format, m.chapters, m.volumes, m.start_date, m.end_date, m.average_score, m.popularity, m.favourites, m.is_adult, m.anilist_id, m.mangadex_id FROM library l JOIN manhwas m ON l.manhwa_id = m.id WHERE l.user_id = ? AND l.manhwa_id = ?"
        );
        $stmt->execute([$userId, $manhwaId]);
        return $stmt->fetch() ?: null;
    }

    public function update(int $userId, int $manhwaId, array $data): bool
    {
        $allowed = ['status', 'current_chapter', 'favorite', 'score', 'notes', 'started_at', 'finished_at'];
        $fields = [];
        $values = [];

        foreach ($allowed as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = ?";
                // BOOLEAN en TiDB estricto: castear (false llega como '' y da 1366)
                $values[] = $field === 'favorite' ? (int)$data[$field] : $data[$field];
            }
        }
        if (empty($fields)) return false;

        $fields[] = "updated_at = NOW()";
        $values[] = $userId;
        $values[] = $manhwaId;
        
        $stmt = $this->db->prepare(
            "UPDATE library SET " . implode(', ', $fields) . " WHERE user_id = ? AND manhwa_id = ?"
        );
        return $stmt->execute($values);
    }

    public function updateProgress(int $userId, int $manhwaId, int $chapter): bool
    {
        $stmt = $this->db->prepare(
            "UPDATE library SET current_chapter = ?, updated_at = NOW() WHERE user_id = ? AND manhwa_id = ?"
        );
        return $stmt->execute([$chapter, $userId, $manhwaId]);
    }

    public function toggleFavorite(int $userId, int $manhwaId): bool
    {
        $stmt = $this->db->prepare(
            "UPDATE library SET favorite = NOT favorite, updated_at = NOW() WHERE user_id = ? AND manhwa_id = ?"
        );
        return $stmt->execute([$userId, $manhwaId]);
    }

    public function remove(int $userId, int $manhwaId): bool
    {
        $stmt = $this->db->prepare("DELETE FROM library WHERE user_id = ? AND manhwa_id = ?");
        return $stmt->execute([$userId, $manhwaId]);
    }

    public function getStats(int $userId): array
    {
        $stmt = $this->db->prepare(
            "SELECT 
                COUNT(*) as total,
                SUM(status = 'LEYENDO') as reading,
                SUM(status = 'PENDIENTE') as pending,
                SUM(status = 'COMPLETADO') as completed,
                SUM(status = 'PAUSADO') as paused,
                SUM(status = 'ABANDONADO') as dropped,
                SUM(status = 'RELECTURA') as rereading,
                SUM(favorite = 1) as favorites
             FROM library WHERE user_id = ?"
        );
        $stmt->execute([$userId]);
        return $stmt->fetch() ?: [];
    }

    public function getContinueReading(int $userId, int $limit = 4): array
    {
        $stmt = $this->db->prepare(
            "SELECT l.*, m.id as id, m.title, m.title_english, m.title_romaji, m.cover_image, m.status as manhwa_status, m.chapters FROM library l
             JOIN manhwas m ON l.manhwa_id = m.id
             WHERE l.user_id = ? AND l.status = 'LEYENDO'
             ORDER BY l.updated_at DESC LIMIT ?"
        );
        $stmt->execute([$userId, $limit]);
        return $stmt->fetchAll();
    }

    public function getFavorites(int $userId, int $limit = 4): array
    {
        $stmt = $this->db->prepare(
            "SELECT l.*, m.id as id, m.title, m.title_english, m.title_romaji, m.cover_image, m.status as manhwa_status FROM library l
             JOIN manhwas m ON l.manhwa_id = m.id
             WHERE l.user_id = ? AND l.favorite = 1
             ORDER BY l.updated_at DESC LIMIT ?"
        );
        $stmt->execute([$userId, $limit]);
        return $stmt->fetchAll();
    }
}