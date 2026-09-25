<?php
/**
 * Surest Plug - InstantNums Server-Side Configuration
 *
 * IMPORTANT:
 * - Never expose the InstantNums API key to JavaScript or the browser.
 * - Never commit the production API key to GitHub.
 * - On InfinityFree, configure INSTANTNUM_API_KEY through the server environment
 *   if available, or add the key manually to this server-only file after upload.
 */

ini_set('display_errors', '0');
error_reporting(0);

$serverConfig = [];
$serverConfigPath = __DIR__ . '/server_config.php';
if (is_file($serverConfigPath)) {
    $loadedServerConfig = require $serverConfigPath;
    if (is_array($loadedServerConfig)) {
        $serverConfig = $loadedServerConfig;
    }
}

if (!defined('INSTANTNUMS_API_BASE_URL')) {
    define(
        'INSTANTNUMS_API_BASE_URL',
        trim($serverConfig['INSTANTNUM_BASE_URL'] ?? ($serverConfig['INSTANTNUMS_BASE_URL'] ?? (getenv('INSTANTNUM_BASE_URL') ?: (getenv('INSTANTNUMS_BASE_URL') ?: 'https://instantnums.com/v1'))))
    );
}

if (!defined('INSTANTNUMS_API_KEY')) {
    $key = trim($serverConfig['INSTANTNUM_API_KEY'] ?? ($serverConfig['INSTANTNUMS_API_KEY'] ?? (getenv('INSTANTNUM_API_KEY') ?: (getenv('INSTANTNUMS_API_KEY') ?: ''))));
    define('INSTANTNUMS_API_KEY', $key);
}

if (!defined('INSTANTNUMS_USD_TO_NGN_RATE')) {
    define(
        'INSTANTNUMS_USD_TO_NGN_RATE',
        (float) ($serverConfig['INSTANTNUM_USD_TO_NGN_RATE'] ?? (getenv('INSTANTNUMS_USD_TO_NGN_RATE') ?: 1600.00))
    );
}

if (!defined('INSTANTNUMS_MARKUP_BELOW_1000_NGN')) {
    define(
        'INSTANTNUMS_MARKUP_BELOW_1000_NGN',
        (float) ($serverConfig['INSTANTNUM_MARKUP_BELOW_1000_NGN'] ?? (getenv('INSTANTNUMS_MARKUP_BELOW_1000_NGN') ?: 1000))
    );
}

if (!defined('INSTANTNUMS_MARKUP_1000_AND_ABOVE_NGN')) {
    define(
        'INSTANTNUMS_MARKUP_1000_AND_ABOVE_NGN',
        (float) ($serverConfig['INSTANTNUM_MARKUP_1000_AND_ABOVE_NGN'] ?? (getenv('INSTANTNUMS_MARKUP_1000_AND_ABOVE_NGN') ?: 2000))
    );
}

function instantnums_calculate_retail_price(float $costUsd): float
{
    if ($costUsd <= 0) {
        return 0.0;
    }

    $rate = INSTANTNUMS_USD_TO_NGN_RATE > 0
        ? INSTANTNUMS_USD_TO_NGN_RATE
        : 1600.00;

    $supplierNgn = $costUsd * $rate;

    $markup = $supplierNgn < 1000
        ? INSTANTNUMS_MARKUP_BELOW_1000_NGN
        : INSTANTNUMS_MARKUP_1000_AND_ABOVE_NGN;

    return round($supplierNgn + $markup, 2);
}

function instantnums_request(
    string $endpoint,
    string $method = 'GET',
    array $payload = []
): array {
    if (empty(INSTANTNUMS_API_KEY)) {
        return [
            'success' => false,
            'error' => 'International number service is temporarily unavailable.'
        ];
    }

    $url = rtrim(INSTANTNUMS_API_BASE_URL, '/') . '/' . ltrim($endpoint, '/');

    if ($method === 'GET' && !empty($payload)) {
        $query = http_build_query($payload);
        if ($query !== '') {
            $url .= '?' . $query;
        }
    }

    $ch = curl_init();

    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . INSTANTNUMS_API_KEY,
            'Accept: application/json',
            'Content-Type: application/json',
            'User-Agent: SurestPlug-Server/1.0'
        ]
    ]);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    }

    $response = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false || $curlError !== '') {
        return [
            'success' => false,
            'error' => 'Unable to reach international number service.',
            'http_code' => $httpCode
        ];
    }

    $decoded = json_decode($response, true);

    if (!is_array($decoded)) {
        return [
            'success' => false,
            'error' => 'Invalid response from international number service.',
            'http_code' => $httpCode
        ];
    }

    $decoded['_http_code'] = $httpCode;

    if ($httpCode < 200 || $httpCode >= 300) {
        $decoded['success'] = false;
    } elseif (!array_key_exists('success', $decoded)) {
        $decoded['success'] = true;
    }

    return $decoded;
}
