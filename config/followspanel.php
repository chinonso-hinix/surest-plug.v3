<?php
/**
 * Surest Plug - FollowSPanel API Production Connector
 * Provider: https://followspanel.com/
 * 
 * IMPORTANT: This file resides strictly on the server-side.
 * The API key is NEVER exposed to JavaScript, HTML, CSS, browser requests, or client storage.
 */

// SMM Provider Base API URL
$serverConfig = [];
$serverConfigPath = __DIR__ . '/server_config.php';
if (is_file($serverConfigPath)) {
    $loadedServerConfig = require $serverConfigPath;
    if (is_array($loadedServerConfig)) {
        $serverConfig = $loadedServerConfig;
    }
}

if (!defined('FOLLOWSPANEL_API_URL')) {
    define('FOLLOWSPANEL_API_URL', 'https://followspanel.com/api/v2');
}

// FollowSPanel API Key
// Set your API key in server environment variables or replace below securely on your production server.
if (!defined('FOLLOWSPANEL_API_KEY')) {
    define('FOLLOWSPANEL_API_KEY', trim($serverConfig['FOLLOWSPANEL_API_KEY'] ?? (getenv('FOLLOWSPANEL_API_KEY') ?: ''))); 
}

/**
 * Execute a secure server-side POST request to FollowSPanel API
 *
 * @param array $params Request parameters (action, etc.)
 * @return array Decoded response or error
 */
function followspanel_request(array $params): array {
    $apiKey = FOLLOWSPANEL_API_KEY;

    if (empty($apiKey)) {
        return [
            'success' => false,
            'error' => 'Social media services are temporarily unavailable. Please try again later.'
        ];
    }

    $params['key'] = $apiKey;

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, FOLLOWSPANEL_API_URL);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 25);
    curl_setopt($ch, CURLOPT_USERAGENT, 'SurestPlug-SMM-Connector/1.0');

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError || $httpCode !== 200) {
        return [
            'success' => false,
            'error' => 'Social media services are temporarily unavailable. Please try again later.'
        ];
    }

    $decoded = json_decode($response, true);
    if ($decoded === null) {
        return [
            'success' => false,
            'error' => 'Invalid response from social media provider. Please try again later.'
        ];
    }

    if (isset($decoded['error'])) {
        return [
            'success' => false,
            'error' => (string)$decoded['error']
        ];
    }

    return [
        'success' => true,
        'data' => $decoded
    ];
}

/**
 * Retrieve real live service list from FollowSPanel
 *
 * @return array
 */
function followspanel_get_services(): array {
    $result = followspanel_request(['action' => 'services']);
    if (!$result['success']) {
        return $result;
    }
    return [
        'success' => true,
        'services' => $result['data']
    ];
}

/**
 * Submit an order to FollowSPanel
 *
 * @param int|string $serviceId FollowSPanel service ID
 * @param string $link Target profile or post link
 * @param int $quantity Quantity to deliver
 * @return array
 */
function followspanel_create_order($serviceId, string $link, int $quantity): array {
    $result = followspanel_request([
        'action' => 'add',
        'service' => $serviceId,
        'link' => trim($link),
        'quantity' => (int)$quantity
    ]);

    if (!$result['success']) {
        return $result;
    }

    if (isset($result['data']['order'])) {
        return [
            'success' => true,
            'order_id' => $result['data']['order']
        ];
    }

    return [
        'success' => false,
        'error' => $result['data']['error'] ?? 'Social media services are temporarily unavailable. Please try again later.'
    ];
}

/**
 * Check status of an existing order on FollowSPanel
 *
 * @param int|string $orderId FollowSPanel order ID
 * @return array
 */
function followspanel_get_order_status($orderId): array {
    $result = followspanel_request([
        'action' => 'status',
        'order' => $orderId
    ]);

    if (!$result['success']) {
        return $result;
    }

    return [
        'success' => true,
        'status' => $result['data']
    ];
}

/**
 * Check provider account balance (Admin use only)
 *
 * @return array
 */
function followspanel_get_balance(): array {
    $result = followspanel_request(['action' => 'balance']);
    if (!$result['success']) {
        return $result;
    }

    return [
        'success' => true,
        'balance' => $result['data']['balance'] ?? null,
        'currency' => $result['data']['currency'] ?? 'USD'
    ];
}
