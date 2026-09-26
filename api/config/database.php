<?php
/**
 * Clase de conexión a base de datos (Singleton)
 */
class Database
{
    private static ?PDO $instance = null;
    private array $config;

    private function __construct()
    {
        $this->config = require __DIR__ . '/db_config.php';
    }

    public static function getInstance(): PDO
    {
        if (self::$instance === null) {
            $db = new self();
            $dsn = "mysql:host={$db->config['host']};port={$db->config['port']};dbname={$db->config['database']};charset={$db->config['charset']}";
            
            try {
                self::$instance = new PDO($dsn, $db->config['username'], $db->config['password'], $db->config['options']);
            } catch (PDOException $e) {
                error_log("Database connection failed: " . $e->getMessage());
                throw new Exception("Error de conexión a la base de datos");
            }
        }
        return self::$instance;
    }

    public static function close(): void
    {
        self::$instance = null;
    }
}