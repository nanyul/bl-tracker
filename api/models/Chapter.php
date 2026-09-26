<?php
/**
 * Modelo de Capítulos
 */
class Chapter
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function create(array $data): ?int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO chapters (manhwa_id, mangadex_chapter_id, chapter_number, title, volume, language, pages, publish_date, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
                title = VALUES(title),
                volume = VALUES(volume),
                language = VALUES(language),
                pages = VALUES(pages),
                publish_date = VALUES(publish_date)"
        );
        
        $stmt->execute([
            $data['manhwa_id'],
            $data['mangadex_chapter_id'],
            $data['chapter_number'],
            $data['title'] ?? null,
            $data['volume'] ?? null,
            $data['language'] ?? 'es',
            $data['pages'] ?? null,
            $data['publish_date'] ?? null,
        ]);
        
        return (int)$this->db->lastInsertId();
    }

    public function bulkCreate(int $manhwaId, array $chapters): int
    {
        $count = 0;
        $this->db->beginTransaction();
        try {
            foreach ($chapters as $chapter) {
                $chapter['manhwa_id'] = $manhwaId;
                if ($this->create($chapter)) {
                    $count++;
                }
            }
            $this->db->commit();
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
        return $count;
    }

    public function replaceAll(int $manhwaId, array $chapters): int
    {
        $this->db->beginTransaction();
        try {
            $this->deleteByManhwaId($manhwaId);
            $count = 0;
            foreach ($chapters as $chapter) {
                $chapter['manhwa_id'] = $manhwaId;
                if ($this->create($chapter)) $count++;
            }
            $this->db->commit();
            return $count;
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function getByManhwaId(int $manhwaId): array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM chapters WHERE manhwa_id = ? ORDER BY chapter_number ASC"
        );
        $stmt->execute([$manhwaId]);
        return $stmt->fetchAll();
    }

    public function getNewChapters(int $userId): array
    {
        $sql = "SELECT c.*, m.title, m.title_english, m.title_romaji, m.cover_image, l.current_chapter
                FROM chapters c
                JOIN manhwas m ON c.manhwa_id = m.id
                JOIN library l ON l.manhwa_id = m.id
                WHERE l.user_id = ? AND c.chapter_number > l.current_chapter
                ORDER BY m.title, c.chapter_number";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    public function getNewChaptersCount(int $userId): int
    {
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) FROM chapters c
             JOIN library l ON l.manhwa_id = c.manhwa_id
             WHERE l.user_id = ? AND c.chapter_number > l.current_chapter"
        );
        $stmt->execute([$userId]);
        return (int)$stmt->fetchColumn();
    }

    public function getLatestChapter(int $manhwaId): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM chapters WHERE manhwa_id = ? ORDER BY chapter_number DESC LIMIT 1"
        );
        $stmt->execute([$manhwaId]);
        return $stmt->fetch() ?: null;
    }

    public function deleteByManhwaId(int $manhwaId): bool
    {
        $stmt = $this->db->prepare("DELETE FROM chapters WHERE manhwa_id = ?");
        return $stmt->execute([$manhwaId]);
    }

    public function getByMangaDexId(int $manhwaId, string $mangadexChapterId): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM chapters WHERE manhwa_id = ? AND mangadex_chapter_id = ?"
        );
        $stmt->execute([$manhwaId, $mangadexChapterId]);
        return $stmt->fetch() ?: null;
    }
}