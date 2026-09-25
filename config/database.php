<?php
/**
 * Surest Plug - Database Connection Configuration
 * InfinityFree Shared Hosting / MySQL PDO Connection
 */

$serverConfig = [];
$serverConfigPath = __DIR__ . '/server_config.php';

if (is_file($serverConfigPath)) {
    $loadedServerConfig = require $serverConfigPath;
    if (is_array($loadedServerConfig)) {
        $serverConfig = $loadedServerConfig;
    }
}

defined('DB_HOST') || define('DB_HOST', $serverConfig['DB_HOST'] ?? (getenv('DB_HOST') ?: 'localhost'));
defined('DB_NAME') || define('DB_NAME', $serverConfig['DB_NAME'] ?? (getenv('DB_NAME') ?: 'surestplug_db'));
defined('DB_USER') || define('DB_USER', $serverConfig['DB_USER'] ?? (getenv('DB_USER') ?: 'root'));
defined('DB_PASS') || define('DB_PASS', $serverConfig['DB_PASS'] ?? (getenv('DB_PASS') ?: ''));
defined('DB_CHARSET') || define('DB_CHARSET', 'utf8mb4');

function getDBConnection() {
    static $pdo = null;

    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;

        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            error_log("Database Connection Error: " . $e->getMessage());
            die("Database connection failed. If you haven't run the installer yet, please visit <a href='/install.php'>install.php</a>.");
        }
    }

    return $pdo;
}
