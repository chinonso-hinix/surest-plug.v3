<?php
/**
 * Surest Plug - Cartlogs API Configuration & Server-Side Connector
 * Production Connector for InfinityFree / cPanel / Shared Hosting
 *
 * CRITICAL SECURITY DIRECTIVES:
 * 1. This file resides strictly on the server-side.
 * 2. CARTLOGS_API_KEY is NEVER exposed to browser, JS, HTML, or client storage.
 * 3. SMM / Boosting services are strictly EXCLUDED (FollowSPanel remains the ONLY boosting provider).
 * 4. Supplier wholesale costs and supplier order IDs are strictly hidden from customers.
 */

// Suppress raw errors to prevent path disclosures
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

if (!defined('CARTLOGS_API_BASE_URL')) {
    define('CARTLOGS_API_BASE_URL', 'https://api.cartlogs.com/api/v1');
}

// Cartlogs API Key
if (!defined('CARTLOGS_API_KEY')) {
    $key = trim($serverConfig['CARTLOGS_API_KEY'] ?? (getenv('CARTLOGS_API_KEY') ?: ''));
    define('CARTLOGS_API_KEY', $key);
}

/**
 * Calculate selling price using Surest Plug markup engine
 *
 * - < ₦10,000: supplier price × 2
 * - ₦10,000 - ₦100,000 (inclusive): supplier price + ₦5,000
 * - > ₦100,000 - ₦500,000 (inclusive): supplier price + ₦15,000
 * - > ₦500,000: supplier price + ₦25,000
 */
function cartlogs_calculate_selling_price(float $supplierPrice): float {
    if ($supplierPrice <= 0) return 0.0;
    if ($supplierPrice < 10000) {
        return round($supplierPrice * 2);
    } elseif ($supplierPrice <= 100000) {
        return round($supplierPrice + 5000);
    } elseif ($supplierPrice <= 500000) {
        return round($supplierPrice + 15000);
    } else {
        return round($supplierPrice + 25000);
    }
}

/**
 * Check if category/product is an SMM boosting service (which MUST be excluded from Cartlogs)
 */
function cartlogs_is_boosting_service(string $title, string $categoryName = '', string $type = ''): boolean {
    $combined = strtolower($title . ' ' . $categoryName . ' ' . $type);
    $boostingKeywords = [
        'boost', 'boosting', 'smm', 'follower boost', 'likes boost', 'views boost',
        'custom comments', 'retweets', 'upvotes', 'reactions', 'drip feed', 'dripfeed',
        'subscribers boost', 'members boost', 'watch hours', 'live stream viewers'
    ];
    foreach ($boostingKeywords as $kw) {
        if (strpos($combined, $kw) !== false) {
            return true;
        }
    }
    return false;
}

/**
 * Perform a server-side request to Cartlogs API
 */
function cartlogs_request(string $endpoint, string $method = 'GET', array $payload = []): array {
    $apiKey = CARTLOGS_API_KEY;
    if (empty($apiKey)) {
        return [
            'success' => false,
            'error' => 'Cartlogs service is temporarily unavailable. API key not configured on server.'
        ];
    }

    $url = CARTLOGS_API_BASE_URL . '/' . ltrim($endpoint, '/');
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 25);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    $headers = [
        'Authorization: Bearer ' . $apiKey,
        'Accept: application/json',
        'User-Agent: SurestPlug-Server/1.0'
    ];

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        $headers[] = 'Content-Type: application/json';
    }

    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $response = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false || $curlError !== '') {
        return [
            'success' => false,
            'error' => 'Cartlogs connection error: ' . $curlError,
            'http_code' => $httpCode
        ];
    }

    $decoded = json_decode($response, true);
    if ($decoded === null) {
        return [
            'success' => false,
            'error' => 'Invalid response from Cartlogs service.'
        ];
    }

    if ($httpCode >= 400) {
        $msg = $decoded['message'] ?? $decoded['error'] ?? 'Cartlogs error (' . $httpCode . ')';
        return [
            'success' => false,
            'error' => (string)$msg
        ];
    }

    return [
        'success' => true,
        'data' => $decoded
    ];
}

/**
 * Get sanitized list of Cartlogs categories (excluding SMM/boosting)
 */
function cartlogs_get_categories(): array {
    $res = cartlogs_request('/categories/');
    if (!$res['success']) {
        return $res;
    }

    $rawCategories = $res['data']['results'] ?? $res['data']['data'] ?? $res['data'] ?? [];
    if (!is_array($rawCategories)) {
        $rawCategories = [];
    }

    $sanitized = [];
    foreach ($rawCategories as $cat) {
        $id = (string)($cat['id'] ?? $cat['pk'] ?? '');
        $name = (string)($cat['name'] ?? $cat['title'] ?? '');
        $slug = (string)($cat['slug'] ?? '');
        $count = (int)($cat['products_count'] ?? $cat['count'] ?? 0);

        if (!empty($name) && !cartlogs_is_boosting_service($name)) {
            $sanitized[] = [
                'id' => $id,
                'name' => $name,
                'slug' => $slug,
                'product_count' => $count
            ];
        }
    }

    return [
        'success' => true,
        'categories' => $sanitized
    ];
}

/**
 * Get sanitized list of Cartlogs products with markup prices
 */
function cartlogs_get_products($categoryId = null): array {
    $endpoint = '/products/';
    if (!empty($categoryId)) {
        $endpoint .= '?category=' . urlencode((string)$categoryId);
    }

    $res = cartlogs_request($endpoint);
    if (!$res['success']) {
        return $res;
    }

    $rawProducts = $res['data']['results'] ?? $res['data']['data'] ?? $res['data'] ?? [];
    if (!is_array($rawProducts)) {
        $rawProducts = [];
    }

    $sanitized = [];
    foreach ($rawProducts as $p) {
        $id = (string)($p['id'] ?? $p['pk'] ?? $p['product_id'] ?? '');
        $title = (string)($p['name'] ?? $p['title'] ?? '');
        $catName = is_array($p['category'] ?? null) ? ($p['category']['name'] ?? '') : (string)($p['category'] ?? '');

        // Exclude boosting
        if (cartlogs_is_boosting_service($title, $catName)) {
            continue;
        }

        $supplierPrice = (float)($p['price'] ?? $p['cost'] ?? 0);
        $sellingPrice = cartlogs_calculate_selling_price($supplierPrice);
        $stock = (int)($p['stock'] ?? $p['quantity'] ?? 0);

        $sanitized[] = [
            'id' => $id,
            'title' => $title,
            'category' => $catName,
            'description' => (string)($p['description'] ?? $p['details'] ?? ''),
            'supplier_price' => $supplierPrice,
            'price' => $sellingPrice,
            'stock' => $stock,
            'in_stock' => $stock > 0,
            'followers_count' => $p['followers'] ?? $p['followers_count'] ?? null,
            'following_count' => $p['following'] ?? $p['following_count'] ?? null,
            'account_age' => $p['age'] ?? $p['account_age'] ?? null,
            'verification_status' => !empty($p['verified']) ? 'verified' : 'unverified',
            'country' => $p['country'] ?? null,
            'gender' => $p['gender'] ?? null,
            'features' => is_array($p['features'] ?? null) ? $p['features'] : []
        ];
    }

    return [
        'success' => true,
        'products' => $sanitized
    ];
}

/**
 * Submit an order to Cartlogs
 */
function cartlogs_create_order($productId, int $quantity = 1, string $customerEmail = ''): array {
    if (empty($productId) || $quantity <= 0) {
        return [
            'success' => false,
            'error' => 'Product ID and valid quantity are required.'
        ];
    }

    $res = cartlogs_request('/orders/', 'POST', [
        'product_id' => $productId,
        'quantity' => $quantity,
        'email' => $customerEmail
    ]);

    return $res;
}

/**
 * Check Cartlogs order status
 */
function cartlogs_get_order_status($orderId): array {
    if (empty($orderId)) {
        return [
            'success' => false,
            'error' => 'Order ID is required.'
        ];
    }

    return cartlogs_request('/orders/' . urlencode((string)$orderId) . '/');
}
