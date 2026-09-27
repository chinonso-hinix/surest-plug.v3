<?php
header('Content-Type: application/json');

try {
    require_once __DIR__ . '/config/cartlogs.php';

    $result = cartlogs_get_categories();

    echo json_encode([
        'success' => true,
        'result' => $result
    ], JSON_PRETTY_PRINT);
} catch (Throwable $e) {
    http_response_code(500);

    echo json_encode([
        'success' => false,
        'error_type' => get_class($e),
        'error_message' => $e->getMessage(),
        'error_file' => basename($e->getFile()),
        'error_line' => $e->getLine()
    ], JSON_PRETTY_PRINT);
}
