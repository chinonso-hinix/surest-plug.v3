<?php
/**
 * Surest Plug - Cartlogs API Endpoint (PHP Backend for InfinityFree / cPanel)
 * Secure proxy between Customer Browser and Cartlogs REST API.
 * Never exposes the CARTLOGS_API_KEY to the client.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/cartlogs.php';

$rawInput = file_get_contents('php://input');
$postData = json_decode($rawInput, true) ?: $_POST;
$action = $_GET['action'] ?? $postData['action'] ?? '';

// Support path-based action matching
if (empty($action)) {
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    if (strpos($uri, 'categories') !== false) {
        $action = 'categories';
    } elseif (strpos($uri, 'products') !== false) {
        $action = 'products';
    } elseif (strpos($uri, 'order') !== false) {
        $action = 'order';
    } elseif (strpos($uri, 'status') !== false) {
        $action = 'status';
    } elseif (strpos($uri, 'capabilities') !== false) {
        $action = 'capabilities';
    }
}

switch ($action) {
    case 'categories':
        $res = cartlogs_get_categories();
        http_response_code($res['success'] ? 200 : 503);
        echo json_encode($res);
        break;

    case 'products':
        $categoryId = $_GET['category'] ?? $postData['category'] ?? null;
        $res = cartlogs_get_products($categoryId);
        http_response_code($res['success'] ? 200 : 503);
        echo json_encode($res);
        break;

    case 'order':
        $productId = $postData['product_id'] ?? $postData['productId'] ?? '';
        $quantity = (int)($postData['quantity'] ?? 1);
        $email = $postData['email'] ?? '';

        $res = cartlogs_create_order($productId, $quantity, $email);
        http_response_code($res['success'] ? 200 : 400);
        echo json_encode($res);
        break;

    case 'status':
        $orderId = $_GET['order_id'] ?? $_GET['order'] ?? $postData['order_id'] ?? '';
        $res = cartlogs_get_order_status($orderId);
        http_response_code($res['success'] ? 200 : 400);
        echo json_encode($res);
        break;


    case 'test':
        $res = cartlogs_get_categories();

        if ($res['success']) {
            echo json_encode([
                'success' => true,
                'data' => [
                    'connected' => true,
                    'provider' => 'Cartlogs',
                    'categories_count' => is_array($res['data'] ?? null)
                        ? count($res['data'])
                        : 0
                ]
            ]);
        } else {
            http_response_code(503);
            echo json_encode([
                'success' => false,
                'data' => [
                    'connected' => false,
                    'provider' => 'Cartlogs'
                ],
                'error' => $res['error'] ?? 'Cartlogs API connection test failed.'
            ]);
        }
        break;

    case 'capabilities':
        echo json_encode([
            'success' => true,
            'configured' => !empty(CARTLOGS_API_KEY),
            'has_api_key' => !empty(CARTLOGS_API_KEY),
            'provider' => 'Cartlogs v1'
        ]);
        break;

    default:
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid Cartlogs action requested.'
        ]);
        break;
}

