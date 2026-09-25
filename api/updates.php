<?php
/**
 * Surest Plug - Site Updates API (PHP + MySQL Backend)
 * Handles announcements, changelog updates, and broadcast notifications.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/functions.php';

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGetUpdates($pdo);
        break;
    case 'POST':
        handleCreateUpdate($pdo);
        break;
    case 'PUT':
        handleUpdateUpdate($pdo);
        break;
    case 'DELETE':
        handleDeleteUpdate($pdo);
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        break;
}

function handleGetUpdates($pdo) {
    try {
        $all = isset($_GET['all']) && $_GET['all'] === 'true';

        $query = "SELECT * FROM `site_updates`";
        if (!$all) {
            $query .= " WHERE `status` = 'published'";
        }
        $query .= " ORDER BY `created_at` DESC";

        $stmt = $pdo->query($query);
        $updates = $stmt->fetchAll();

        echo json_encode(['success' => true, 'updates' => $updates]);
    } catch (Exception $e) {
        error_log("Site Updates GET Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to load updates from database']);
    }
}

function handleCreateUpdate($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }

        $title = isset($input['title']) ? trim($input['title']) : '';
        $message = isset($input['message']) ? trim($input['message']) : '';
        $image = isset($input['image']) ? $input['image'] : null;
        $link = isset($input['link']) ? trim($input['link']) : null;
        $status = isset($input['status']) && in_array($input['status'], ['published', 'draft']) ? $input['status'] : 'published';

        if (empty($title)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Title is required']);
            return;
        }
        if (empty($message)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Message is required']);
            return;
        }

        $pdo->beginTransaction();

        $sql = "INSERT INTO `site_updates` (`title`, `message`, `image`, `link`, `status`, `created_at`) VALUES (?, ?, ?, ?, ?, NOW())";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$title, $message, $image, $link, $status]);
        $newUpdateId = $pdo->lastInsertId();

        // If published, broadcast notification to all users
        if ($status === 'published') {
            $notifStmt = $pdo->prepare("
                INSERT INTO `notifications` (`user_id`, `title`, `message`, `type`, `reference_id`, `link_route`, `read_status`, `created_at`)
                SELECT `id`, 'New Surest Plug Update', CONCAT('Update: \"', ?, '\" — We have added new improvements to Surest Plug. Tap to read.'), 'update', ?, 'updates', 0, NOW()
                FROM `users` WHERE `role` != 'admin'
            ");
            $notifStmt->execute([$title, $newUpdateId]);
        }

        $pdo->commit();

        $stmtFetch = $pdo->prepare("SELECT * FROM `site_updates` WHERE `id` = ?");
        $stmtFetch->execute([$newUpdateId]);
        $createdUpdate = $stmtFetch->fetch();

        echo json_encode([
            'success' => true,
            'message' => 'Site update published successfully',
            'update' => $createdUpdate
        ]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("Site Update Create Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to save site update']);
    }
}

function handleUpdateUpdate($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = isset($input['id']) ? intval($input['id']) : 0;

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Update ID is required']);
            return;
        }

        $title = isset($input['title']) ? trim($input['title']) : '';
        $message = isset($input['message']) ? trim($input['message']) : '';
        $image = isset($input['image']) ? $input['image'] : null;
        $link = isset($input['link']) ? trim($input['link']) : null;
        $status = isset($input['status']) ? $input['status'] : 'published';

        $sql = "UPDATE `site_updates` SET `title` = ?, `message` = ?, `image` = ?, `link` = ?, `status` = ?, `updated_at` = NOW() WHERE `id` = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$title, $message, $image, $link, $status, $id]);

        echo json_encode(['success' => true, 'message' => 'Site update updated successfully']);
    } catch (Exception $e) {
        error_log("Site Update Update Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to update site update']);
    }
}

function handleDeleteUpdate($pdo) {
    try {
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        if ($id <= 0) {
            $input = json_decode(file_get_contents('php://input'), true);
            $id = isset($input['id']) ? intval($input['id']) : 0;
        }

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Update ID is required']);
            return;
        }

        $stmt = $pdo->prepare("DELETE FROM `site_updates` WHERE `id` = ?");
        $stmt->execute([$id]);

        echo json_encode(['success' => true, 'message' => 'Site update deleted successfully']);
    } catch (Exception $e) {
        error_log("Site Update Delete Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to delete update']);
    }
}
