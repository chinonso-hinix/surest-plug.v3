<?php
/**
 * Surest Plug - Referrals API (PHP + MySQL Backend)
 * Handles referral unlock validation (10 qualifying successful purchases requirement),
 * referral code verification, relationships, and stats.
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
    handleGetReferralStats($pdo);
} elseif ($method === 'POST') {
    $action = isset($_GET['action']) ? $_GET['action'] : '';
    if ($action === 'validate') {
        handleValidateReferralCode($pdo);
    } else {
        handleCheckUnlock($pdo);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}

/**
 * Get user referral details, unlock status, qualifying purchases count, and earnings
 */
function handleGetReferralStats($pdo) {
    try {
        $userId = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
        if ($userId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'User ID is required']);
            return;
        }

        // Count completed qualifying purchases
        $orderStmt = $pdo->prepare("
            SELECT COUNT(*) AS qualifying_count 
            FROM `orders` 
            WHERE `user_id` = ? AND `status` = 'completed' AND `payment_status` = 'paid'
        ");
        $orderStmt->execute([$userId]);
        $orderRow = $orderStmt->fetch();
        $qualifyingPurchasesCount = intval($orderRow['qualifying_count'] ?? 0);

        // Fetch user referral fields
        $userStmt = $pdo->prepare("SELECT `id`, `full_name`, `referral_code`, `referral_unlocked` FROM `users` WHERE `id` = ?");
        $userStmt->execute([$userId]);
        $user = $userStmt->fetch();

        if (!$user) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'User not found']);
            return;
        }

        $isUnlocked = (bool)$user['referral_unlocked'];
        $referralCode = $user['referral_code'];

        // Automatically unlock if user has reached 10 qualifying purchases and not yet unlocked
        if ($qualifyingPurchasesCount >= 10 && (!$isUnlocked || empty($referralCode))) {
            if (empty($referralCode)) {
                $referralCode = 'SP-' . strtoupper(substr(md5(uniqid((string)$userId, true)), 0, 6));
            }
            $isUnlocked = true;

            $updateStmt = $pdo->prepare("
                UPDATE `users` 
                SET `referral_unlocked` = 1, `referral_code` = ? 
                WHERE `id` = ?
            ");
            $updateStmt->execute([$referralCode, $userId]);
        }

        // Count referrals and earnings
        $refCountStmt = $pdo->prepare("SELECT COUNT(*) AS total_referrals FROM `referrals` WHERE `referrer_user_id` = ?");
        $refCountStmt->execute([$userId]);
        $refCount = intval($refCountStmt->fetch()['total_referrals'] ?? 0);

        $rewStmt = $pdo->prepare("
            SELECT COUNT(*) AS total_rewards_count, COALESCE(SUM(`amount`), 0) AS total_earnings 
            FROM `referral_rewards` 
            WHERE `referrer_user_id` = ? AND `status` = 'credited'
        ");
        $rewStmt->execute([$userId]);
        $rewRow = $rewStmt->fetch();
        $totalEarnings = (float)($rewRow['total_earnings'] ?? 0);
        $successfulReferralPurchases = intval($rewRow['total_rewards_count'] ?? 0);

        echo json_encode([
            'success' => true,
            'qualifying_purchases_count' => $qualifyingPurchasesCount,
            'is_unlocked' => $isUnlocked,
            'referral_code' => $isUnlocked ? $referralCode : null,
            'total_referrals' => $refCount,
            'successful_referral_purchases' => $successfulReferralPurchases,
            'total_earnings' => $totalEarnings
        ]);
    } catch (Exception $e) {
        error_log("Referral Stats Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to calculate referral status']);
    }
}

/**
 * Validate a referral code upon registration
 */
function handleValidateReferralCode($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }

        $code = isset($input['code']) ? trim(strtoupper($input['code'])) : '';
        $currentUserId = isset($input['user_id']) ? intval($input['user_id']) : 0;

        if (empty($code)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Referral code is required']);
            return;
        }

        // Must belong to a qualified referral user whose referral is unlocked
        $stmt = $pdo->prepare("
            SELECT `id`, `full_name`, `email`, `referral_unlocked` 
            FROM `users` 
            WHERE `referral_code` = ? AND `account_status` = 'active'
        ");
        $stmt->execute([$code]);
        $referrer = $stmt->fetch();

        if (!$referrer || !$referrer['referral_unlocked']) {
            http_response_code(400);
            echo json_encode([
                'success' => false, 
                'error' => 'The referral code is invalid.'
            ]);
            return;
        }

        if ($currentUserId > 0 && $referrer['id'] == $currentUserId) {
            http_response_code(400);
            echo json_encode([
                'success' => false, 
                'error' => 'Self-referral is not permitted.'
            ]);
            return;
        }

        echo json_encode([
            'success' => true,
            'valid' => true,
            'referrer_id' => (int)$referrer['id'],
            'referrer_name' => $referrer['full_name']
        ]);
    } catch (Exception $e) {
        error_log("Referral Validation Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to validate referral code']);
    }
}

/**
 * Trigger unlock check for user after a purchase
 */
function handleCheckUnlock($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $userId = isset($input['user_id']) ? intval($input['user_id']) : 0;

        if ($userId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'User ID is required']);
            return;
        }

        $orderStmt = $pdo->prepare("
            SELECT COUNT(*) AS qualifying_count 
            FROM `orders` 
            WHERE `user_id` = ? AND `status` = 'completed' AND `payment_status` = 'paid'
        ");
        $orderStmt->execute([$userId]);
        $qualifyingPurchasesCount = intval($orderStmt->fetch()['qualifying_count'] ?? 0);

        if ($qualifyingPurchasesCount >= 10) {
            $userStmt = $pdo->prepare("SELECT `referral_code`, `referral_unlocked` FROM `users` WHERE `id` = ?");
            $userStmt->execute([$userId]);
            $user = $userStmt->fetch();

            if (!$user['referral_unlocked'] || empty($user['referral_code'])) {
                $newCode = 'SP-' . strtoupper(substr(md5(uniqid((string)$userId, true)), 0, 6));
                $updateStmt = $pdo->prepare("
                    UPDATE `users` 
                    SET `referral_unlocked` = 1, `referral_code` = ? 
                    WHERE `id` = ?
                ");
                $updateStmt->execute([$newCode, $userId]);

                // Create unlock notification
                $notifStmt = $pdo->prepare("
                    INSERT INTO `notifications` (`user_id`, `title`, `message`, `type`, `link_route`, `read_status`, `created_at`)
                    VALUES (?, 'Referral Program Unlocked!', 'Congratulations! You have completed 10 qualifying purchases. Your unique referral code is ready to share.', 'referral', 'dashboard', 0, NOW())
                ");
                $notifStmt->execute([$userId]);

                echo json_encode([
                    'success' => true,
                    'unlocked' => true,
                    'referral_code' => $newCode
                ]);
                return;
            }
        }

        echo json_encode([
            'success' => true,
            'unlocked' => false,
            'qualifying_count' => $qualifyingPurchasesCount
        ]);
    } catch (Exception $e) {
        error_log("Referral Unlock Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to check unlock']);
    }
}
