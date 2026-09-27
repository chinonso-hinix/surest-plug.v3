<?php
header('Content-Type: application/json');

$url = 'https://api.cartlogs.com/api/v1/categories/';

$ch = curl_init($url);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_HTTPHEADER => [
        'Accept: application/json',
        'User-Agent: SurestPlug-Server/1.0'
    ]
]);

$response = curl_exec($ch);
$httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

echo json_encode([
    'http_code' => $httpCode,
    'curl_error' => $curlError,
    'response' => $response
], JSON_PRETTY_PRINT);
