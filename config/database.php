<?php
/**
 * Surest Plug - Database Connection Configuration
 * InfinityFree Shared Hosting / MySQL PDO Connection
 */

// Hostname (On InfinityFree, typically sqlXXX.infinityfree.com or sqlXXX.epizy.com)
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
// Database Name (e.g. if0_XXXXXXX_surestplug)
define('DB_NAME', getenv('DB_NAME') ?: 'surestplug_db');
// Database Username (e.g. if0_XXXXXXX)
define('DB_USER', getenv('DB_USER') ?: 'root');
// Database Password
define('DB_PASS', getenv('DB_PASS') ?: '');
// Character Set
define('DB_CHARSET', 'utf8mb4');

/**
 * Get PDO Database Connection
 * @return PDO
 */
function getDBConnection() {
    static $pdo = null;
    
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // Log error safely server-side without exposing DB credentials in output
            error_log("Database Connection Error: " . $e->getMessage());
            die("Database connection failed. If you haven't run the installer yet, please visit <a href='/install.php'>install.php</a>.");
        }
    }
    
    return $pdo;
}
