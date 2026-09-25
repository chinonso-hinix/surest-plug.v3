<?php
/**
 * Surest Plug - Paystack API Endpoint (PHP Backend for InfinityFree / cPanel)
 * Secure proxy between Customer Browser and Paystack REST API.
 * Never exposes the PAYSTACK_SECRET_KEY to the client.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/paystack.php';

$rawInput = file_get_contents('php://input');
$postData = json_decode($rawInput, true) ?: $_POST;
$action = $_GET['action'] ?? $postData['action'] ?? '';

// Support route parsing e.g. /api/paystack/initialize
if (empty($action)) {
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    if (strpos($uri, 'initialize') !== false) {
        $action = 'initialize';
    } elseif (strpos($uri, 'verify') !== false) {
        $action = 'verify';
    } elseif (strpos($uri, 'config') !== false) {
        $action = 'config';
    }
}

switch ($action) {
    case 'initialize':
    case 'init':
        $amount = $postData['amount'] ?? 0;
        $email = $postData['email'] ?? '';
        $userId = $postData['userId'] ?? $postData['user_id'] ?? '';
        $name = $postData['name'] ?? '';
        $callbackUrl = $postData['callbackUrl'] ?? $postData['callback_url'] ?? '';
        $metadata = is_array($postData['metadata'] ?? null) ? $postData['metadata'] : [];

        $res = paystack_initialize($email, $amount, $userId, $name, $callbackUrl, $metadata);
        http_response_code($res['success'] ? 200 : 400);
        echo json_encode($res);
        break;

    case 'verify':
        $reference = $postData['reference'] ?? $_GET['reference'] ?? '';
        $amount = $postData['expectedAmount'] ?? $postData['amount'] ?? $_GET['amount'] ?? null;
        $userId = $postData['userId'] ?? $_GET['userId'] ?? '';
        $email = $postData['email'] ?? $_GET['email'] ?? '';

        $res = paystack_verify($reference, $amount, $userId, $email);
        http_response_code(($res['success'] && $res['verified']) ? 200 : 400);
        echo json_encode($res);
        break;

    case 'config':
        echo json_encode([
            'success' => true,
            'publicKey' => PAYSTACK_PUBLIC_KEY
        ]);
        break;

    default:
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid Paystack action requested.'
        ]);
        break;
}
