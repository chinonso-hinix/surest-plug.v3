<?php
/**
 * Surest Plug - FollowSPanel SMM API Endpoint (PHP Backend for InfinityFree / cPanel)
 * 
 * Secure proxy between Customer Browser and FollowSPanel API.
 * Never exposes the FOLLOWSPANEL_API_KEY to the client.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/followspanel.php';

$action = $_GET['action'] ?? '';
if (empty($action) && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $postData = json_decode($rawInput, true) ?: $_POST;
    $action = $postData['action'] ?? '';
}

switch ($action) {
    case 'services':
        $res = followspanel_get_services();
        http_response_code($res['success'] ? 200 : 503);
        echo json_encode($res);
        break;

    case 'order':
    case 'add':
        $rawInput = file_get_contents('php://input');
        $postData = json_decode($rawInput, true) ?: $_POST;
        $serviceId = $postData['serviceId'] ?? $postData['service'] ?? '';
        $link = $postData['link'] ?? '';
        $quantity = (int)($postData['quantity'] ?? 0);

        if (empty($link) || $quantity <= 0 || empty($serviceId)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Please provide valid service ID, target link, and quantity.'
            ]);
            break;
        }

        $res = followspanel_create_order($serviceId, $link, $quantity);
        http_response_code($res['success'] ? 200 : 400);
        echo json_encode($res);
        break;

    case 'status':
        $orderId = $_GET['order'] ?? '';
        if (empty($orderId) && $_SERVER['REQUEST_METHOD'] === 'POST') {
            $rawInput = file_get_contents('php://input');
            $postData = json_decode($rawInput, true) ?: $_POST;
            $orderId = $postData['orderId'] ?? $postData['order'] ?? '';
        }

        if (empty($orderId)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Order ID is required.'
            ]);
            break;
        }

        $res = followspanel_get_order_status($orderId);
        http_response_code($res['success'] ? 200 : 400);
        echo json_encode($res);
        break;

    case 'balance':
        $res = followspanel_get_balance();
        http_response_code($res['success'] ? 200 : 503);
        echo json_encode($res);
        break;

    case 'test':
        $res = followspanel_get_balance();
        if ($res['success']) {
            echo json_encode([
                'success' => true,
                'message' => 'Connected successfully to FollowSPanel API v2.',
                'balance' => $res['data']['balance'] ?? '0.00',
                'currency' => $res['data']['currency'] ?? 'USD'
            ]);
        } else {
            http_response_code(503);
            echo json_encode([
                'success' => false,
                'error' => $res['error'] ?? 'FollowSPanel API connection test failed.'
            ]);
        }
        break;

    case 'config':
        echo json_encode([
            'success' => true,
            'configured' => !empty(FOLLOWSPANEL_API_KEY),
            'has_api_key' => !empty(FOLLOWSPANEL_API_KEY),
            'provider' => 'FollowSPanel API v2'
        ]);
        break;

    default:
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid SMM action requested.'
        ]);
        break;
}
