<?php
header('Content-Type: application/json');
echo json_encode([
    'success' => true,
    'method' => $_SERVER['REQUEST_METHOD'] ?? '',
    'post' => $_POST,
    'raw' => file_get_contents('php://input')
]);
