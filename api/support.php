<?php
/**
 * Surest Plug - Support Desk API (PHP + MySQL Backend)
 * Handles customer support tickets, replies, text messages, and real voice note storage.
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
    handleGetTickets($pdo);
} elseif ($method === 'POST') {
    $action = isset($_GET['action']) ? $_GET['action'] : '';
    if ($action === 'reply') {
        handleReplyTicket($pdo);
    } else {
        handleCreateTicket($pdo);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}

function handleGetTickets($pdo) {
    try {
        $userId = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
        $role = isset($_GET['role']) ? $_GET['role'] : 'user';

        $query = "SELECT t.*, u.full_name, u.email FROM `support_tickets` t JOIN `users` u ON t.user_id = u.id";
        $params = [];

        if ($role !== 'admin' && $userId > 0) {
            $query .= " WHERE t.user_id = ?";
            $params[] = $userId;
        }

        $query .= " ORDER BY t.id DESC";

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $tickets = $stmt->fetchAll();

        // Fetch messages for each ticket
        foreach ($tickets as &$ticket) {
            $msgStmt = $pdo->prepare("
                SELECT m.*, u.full_name AS sender_name 
                FROM `support_messages` m 
                LEFT JOIN `users` u ON m.sender_id = u.id 
                WHERE m.ticket_id = ? 
                ORDER BY m.id ASC
            ");
            $msgStmt->execute([$ticket['id']]);
            $ticket['messages'] = $msgStmt->fetchAll();
        }

        echo json_encode(['success' => true, 'tickets' => $tickets]);
    } catch (Exception $e) {
        error_log("Support Tickets GET Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to load support tickets']);
    }
}

function handleCreateTicket($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }

        $userId = isset($input['user_id']) ? intval($input['user_id']) : 0;
        $subject = isset($input['subject']) ? trim($input['subject']) : '';
        $message = isset($input['message']) ? trim($input['message']) : '';
        $messageType = isset($input['message_type']) ? $input['message_type'] : 'text';
        $audioData = isset($input['audio_data']) ? $input['audio_data'] : null;
        $audioDuration = isset($input['audio_duration']) ? intval($input['audio_duration']) : 0;

        if ($userId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'User ID is required']);
            return;
        }
        if (empty($subject)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Ticket subject is required']);
            return;
        }
        if (empty($message) && empty($audioData)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Please provide a message or voice note']);
            return;
        }

        $ticketCode = 'TKT-' . strtoupper(substr(md5(uniqid((string)$userId, true)), 0, 6));

        $pdo->beginTransaction();

        // 1. Insert ticket
        $ticketStmt = $pdo->prepare("
            INSERT INTO `support_tickets` (`ticket_code`, `user_id`, `subject`, `priority`, `status`, `created_at`)
            VALUES (?, ?, ?, 'medium', 'open', NOW())
        ");
        $ticketStmt->execute([$ticketCode, $userId, $subject]);
        $ticketId = $pdo->lastInsertId();

        // 2. Insert first message
        $msgStmt = $pdo->prepare("
            INSERT INTO `support_messages` (`ticket_id`, `sender_id`, `sender_role`, `message_type`, `message`, `audio_data`, `audio_duration`, `created_at`)
            VALUES (?, ?, 'user', ?, ?, ?, ?, NOW())
        ");
        $msgText = !empty($message) ? $message : 'Voice Note Attachment';
        $msgStmt->execute([$ticketId, $userId, $messageType, $msgText, $audioData, $audioDuration]);

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Ticket created successfully',
            'ticket_id' => $ticketId,
            'ticket_code' => $ticketCode
        ]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("Support Ticket Create Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to create support ticket']);
    }
}

function handleReplyTicket($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }

        $ticketId = isset($input['ticket_id']) ? intval($input['ticket_id']) : 0;
        $senderId = isset($input['sender_id']) ? intval($input['sender_id']) : 0;
        $senderRole = isset($input['sender_role']) && $input['sender_role'] === 'admin' ? 'admin' : 'user';
        $message = isset($input['message']) ? trim($input['message']) : '';
        $messageType = isset($input['message_type']) ? $input['message_type'] : 'text';
        $audioData = isset($input['audio_data']) ? $input['audio_data'] : null;
        $audioDuration = isset($input['audio_duration']) ? intval($input['audio_duration']) : 0;

        if ($ticketId <= 0 || $senderId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Ticket ID and Sender ID are required']);
            return;
        }
        if (empty($message) && empty($audioData)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Message or voice note cannot be empty']);
            return;
        }

        $pdo->beginTransaction();

        $msgText = !empty($message) ? $message : 'Voice Note Attachment';
        $msgStmt = $pdo->prepare("
            INSERT INTO `support_messages` (`ticket_id`, `sender_id`, `sender_role`, `message_type`, `message`, `audio_data`, `audio_duration`, `created_at`)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $msgStmt->execute([$ticketId, $senderId, $senderRole, $messageType, $msgText, $audioData, $audioDuration]);

        // Update ticket status
        $newStatus = ($senderRole === 'admin') ? 'answered' : 'open';
        $updateTicket = $pdo->prepare("UPDATE `support_tickets` SET `status` = ?, `updated_at` = NOW() WHERE `id` = ?");
        $updateTicket->execute([$newStatus, $ticketId]);

        // If admin replied, send notification to ticket owner
        if ($senderRole === 'admin') {
            $ticketOwnerStmt = $pdo->prepare("SELECT `user_id`, `ticket_code` FROM `support_tickets` WHERE `id` = ?");
            $ticketOwnerStmt->execute([$ticketId]);
            $ticketOwner = $ticketOwnerStmt->fetch();
            if ($ticketOwner) {
                $notifStmt = $pdo->prepare("
                    INSERT INTO `notifications` (`user_id`, `title`, `message`, `type`, `reference_id`, `link_route`, `read_status`, `created_at`)
                    VALUES (?, 'Support Ticket Reply', CONCAT('Support has replied to ticket ', ?), 'support', ?, 'support', 0, NOW())
                ");
                $notifStmt->execute([$ticketOwner['user_id'], $ticketOwner['ticket_code'], $ticketId]);
            }
        }

        $pdo->commit();

        echo json_encode(['success' => true, 'message' => 'Reply sent successfully']);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("Support Ticket Reply Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to send reply']);
    }
}
