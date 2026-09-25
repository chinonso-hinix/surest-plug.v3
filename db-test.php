<?php
require_once __DIR__ . '/config/database.php';

try {
    $pdo = getDBConnection();
    echo "DATABASE CONNECTION OK";
} catch (Throwable $e) {
    echo "DATABASE CONNECTION FAILED";
}
