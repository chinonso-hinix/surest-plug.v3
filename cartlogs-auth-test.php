<?php
header('Content-Type: application/json');

$config = require __DIR__ . '/config/server_config.php';
$apiKey = trim($config['CARTLOGS_API_KEY'] ?? '');

if ($apiKey === '') {
    echo json_encode([
        'configured' => false,
        'error' => 'CARTLOGS_API_KEY is empty'
    ], JSON_PRETTY_PRINT);
    exit;
}

$url = 'https://api.cartlogs.com/api/v1/categories/';

$ch = curl_init($url);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $apiKey,
        'Accept: application/json',
        'User-Agent: SurestPlug-Server/1.0'
    ]
]);

$response = curl_exec($ch);
$httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

echo json_encode([
    'configured' => true,
    'http_code' => $httpCode,
    'curl_error' => $curlError,
    'response' => $response
], JSON_PRETTY_PRINT);
