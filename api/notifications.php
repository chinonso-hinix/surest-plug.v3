<?php
/**
 * Surest Plug - Notifications API (PHP + MySQL Backend)
 * Handles customer & admin real notifications and unread badge counters.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/functions.php';

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    handleGetNotifications($pdo);
} elseif ($method === 'POST') {
    $action = isset($_GET['action']) ? $_GET['action'] : '';
    if ($action === 'mark_all_read') {
        handleMarkAllRead($pdo);
    } else {
        handleMarkRead($pdo);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}

function handleGetNotifications($pdo) {
    try {
        $userId = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
        if ($userId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'User ID is required']);
            return;
        }

        $stmt = $pdo->prepare("
            SELECT * FROM `notifications` 
            WHERE `user_id` = ? 
            ORDER BY `id` DESC 
            LIMIT 50
        ");
        $stmt->execute([$userId]);
        $notifications = $stmt->fetchAll();

        foreach ($notifications as &$n) {
            $n['read_status'] = (bool)$n['read_status'];
        }

        $countStmt = $pdo->prepare("
            SELECT COUNT(*) AS unread_count 
            FROM `notifications` 
            WHERE `user_id` = ? AND `read_status` = 0
        ");
        $countStmt->execute([$userId]);
        $unreadCount = intval($countStmt->fetch()['unread_count'] ?? 0);

        echo json_encode([
            'success' => true,
            'notifications' => $notifications,
            'unread_count' => $unreadCount
        ]);
    } catch (Exception $e) {
        error_log("Notifications GET Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to load notifications']);
    }
}

function handleMarkRead($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $notifId = isset($input['id']) ? intval($input['id']) : 0;

        if ($notifId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Notification ID is required']);
            return;
        }

        $stmt = $pdo->prepare("UPDATE `notifications` SET `read_status` = 1 WHERE `id` = ?");
        $stmt->execute([$notifId]);

        echo json_encode(['success' => true, 'message' => 'Notification marked as read']);
    } catch (Exception $e) {
        error_log("Notification Mark Read Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to update notification']);
    }
}

function handleMarkAllRead($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $userId = isset($input['user_id']) ? intval($input['user_id']) : 0;

        if ($userId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'User ID is required']);
            return;
        }

        $stmt = $pdo->prepare("UPDATE `notifications` SET `read_status` = 1 WHERE `user_id` = ?");
        $stmt->execute([$userId]);

        echo json_encode(['success' => true, 'message' => 'All notifications marked as read']);
    } catch (Exception $e) {
        error_log("Notifications Mark All Read Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to update notifications']);
    }
}
