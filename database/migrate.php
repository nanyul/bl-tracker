<?php
/**
 * Migración de base de datos para BL Tracker
 */
require_once __DIR__ . '/../api/config/database.php';
require_once __DIR__ . '/../api/config/db_config.php';

// Cargar .env
$dotenvPath = __DIR__ . '/../.env';
if (file_exists($dotenvPath)) {
    $lines = file($dotenvPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        [$name, $value] = explode('=', $line, 2);
        $_ENV[trim($name)] = trim($value);
        putenv(trim($name) . '=' . trim($value));
    }
}

try {
    // Primero crear la base de datos si no existe
    $config = require __DIR__ . '/../api/config/db_config.php';
    $dsn = "mysql:host={$config['host']};port={$config['port']};charset={$config['charset']}";
    $pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$config['database']}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "✓ Base de datos creada/verificada\n";
    
    $db = Database::getInstance();
    
    echo "Creando tablas...\n";
    
    // Tabla users
    $db->exec("
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(191) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            avatar VARCHAR(500) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "✓ users\n";
    
    // Tabla manhwas
    $db->exec("
        CREATE TABLE IF NOT EXISTS manhwas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            anilist_id INT UNIQUE,
            mangadex_id VARCHAR(36) UNIQUE,
            title VARCHAR(255) NOT NULL,
            title_english VARCHAR(255),
            title_romaji VARCHAR(255),
            title_native VARCHAR(255),
            description TEXT,
            cover_image VARCHAR(500),
            banner_image VARCHAR(500),
            genres JSON,
            tags JSON,
            status ENUM('RELEASING', 'FINISHED', 'HIATUS', 'CANCELLED', 'NOT_YET_RELEASED') DEFAULT 'RELEASING',
            format VARCHAR(50),
            source VARCHAR(50),
            chapters INT,
            volumes INT,
            start_date DATE,
            end_date DATE,
            season VARCHAR(20),
            season_year INT,
            country_of_origin VARCHAR(2),
            is_licensed BOOLEAN DEFAULT FALSE,
            is_adult BOOLEAN DEFAULT FALSE,
            average_score INT,
            popularity BIGINT DEFAULT 0,
            favourites BIGINT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_anilist (anilist_id),
            INDEX idx_mangadex (mangadex_id),
            INDEX idx_title (title),
            INDEX idx_status (status),
            INDEX idx_popularity (popularity),
            FULLTEXT idx_search (title, title_english, title_romaji, description)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "✓ manhwas\n";
    
    // Tabla library
    $db->exec("
        CREATE TABLE IF NOT EXISTS library (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            manhwa_id INT NOT NULL,
            status ENUM('LEYENDO', 'PENDIENTE', 'COMPLETADO', 'PAUSADO', 'ABANDONADO', 'RELECTURA') DEFAULT 'PENDIENTE',
            current_chapter INT DEFAULT 0,
            favorite BOOLEAN DEFAULT FALSE,
            score DECIMAL(3,1),
            notes TEXT,
            started_at DATE,
            finished_at DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_manhwa (user_id, manhwa_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (manhwa_id) REFERENCES manhwas(id) ON DELETE CASCADE,
            INDEX idx_user_status (user_id, status),
            INDEX idx_user_favorite (user_id, favorite),
            INDEX idx_updated (updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "✓ library\n";
    
    // Tabla chapters
    $db->exec("
        CREATE TABLE IF NOT EXISTS chapters (
            id INT AUTO_INCREMENT PRIMARY KEY,
            manhwa_id INT NOT NULL,
            mangadex_chapter_id VARCHAR(36) NOT NULL UNIQUE,
            chapter_number DECIMAL(6,2) NOT NULL,
            title VARCHAR(255),
            volume DECIMAL(4,1),
            language VARCHAR(5) DEFAULT 'es',
            pages INT,
            publish_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (manhwa_id) REFERENCES manhwas(id) ON DELETE CASCADE,
            INDEX idx_manhwa_number (manhwa_id, chapter_number),
            INDEX idx_mangadex (mangadex_chapter_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "✓ chapters\n";
    
    // Tabla user_settings
    $db->exec("
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id INT PRIMARY KEY,
            theme ENUM('light', 'dark', 'system') DEFAULT 'system',
            default_view ENUM('grid', 'list') DEFAULT 'grid',
            notifications_new_chapters BOOLEAN DEFAULT TRUE,
            notifications_weekly BOOLEAN DEFAULT FALSE,
            notifications_recommendations BOOLEAN DEFAULT TRUE,
            language VARCHAR(5) DEFAULT 'es',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "✓ user_settings\n";
    
    echo "\n✅ Migración completada exitosamente\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}