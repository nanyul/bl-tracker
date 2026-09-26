<?php
/**
 * Modelo de Usuario
 */
class User
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function create(string $name, string $email, string $passwordHash): ?int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, NOW())"
        );
        $stmt->execute([$name, $email, $passwordHash]);
        return (int)$this->db->lastInsertId();
    }

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        return $stmt->fetch() ?: null;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare("SELECT id, name, email, created_at FROM users WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function update(int $id, array $data): bool
    {
        $fields = [];
        $values = [];
        
        foreach (['name', 'email'] as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = ?";
                $values[] = $data[$field];
            }
        }
        
        if (empty($fields)) return false;
        
        $values[] = $id;
        $stmt = $this->db->prepare("UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?");
        return $stmt->execute($values);
    }

    public function updatePassword(int $id, string $passwordHash): bool
    {
        $stmt = $this->db->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
        return $stmt->execute([$passwordHash, $id]);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM users WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function existsByEmail(string $email, ?int $excludeId = null): bool
    {
        $sql = "SELECT 1 FROM users WHERE email = ?";
        $params = [$email];
        
        if ($excludeId) {
            $sql .= " AND id != ?";
            $params[] = $excludeId;
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return (bool)$stmt->fetchColumn();
    }

    public function getSettings(int $userId): array
    {
        $stmt = $this->db->prepare("SELECT * FROM user_settings WHERE user_id = ?");
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        if (!$row) {
            $this->db->prepare("INSERT INTO user_settings (user_id) VALUES (?)")->execute([$userId]);
            $stmt->execute([$userId]);
            $row = $stmt->fetch();
        }
        return $row ?: [];
    }

    public function upsertSettings(int $userId, array $data): bool
    {
        $allowed = ['theme','default_view','notifications_new_chapters','notifications_weekly','notifications_recommendations','language'];
        $fields = [];
        $values = [];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $data)) {
                $fields[] = "$f = ?";
                $values[] = $data[$f];
            }
        }
        if (empty($fields)) return true;
        // ensure row exists
        $this->getSettings($userId);
        $values[] = $userId;
        $stmt = $this->db->prepare("UPDATE user_settings SET " . implode(', ', $fields) . " WHERE user_id = ?");
        return $stmt->execute($values);
    }
}