<?php
/**
 * Surest Plug - Orders & Purchases API (PHP + MySQL Backend)
 * Handles atomic transactions for ready-made website orders, wallet debits,
 * referral unlock check (10 qualifying orders), and ₦10,000 referrer reward payouts.
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
    handleGetOrders($pdo);
} elseif ($method === 'POST') {
    handleCreateOrder($pdo);
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}

function handleGetOrders($pdo) {
    try {
        $userId = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
        $role = isset($_GET['role']) ? $_GET['role'] : 'user';

        $query = "SELECT o.*, u.full_name, u.email FROM `orders` o JOIN `users` u ON o.user_id = u.id";
        $params = [];

        if ($role !== 'admin' && $userId > 0) {
            $query .= " WHERE o.user_id = ?";
            $params[] = $userId;
        }

        $query .= " ORDER BY o.id DESC";

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $orders = $stmt->fetchAll();

        foreach ($orders as &$o) {
            $o['amount'] = (float)$o['amount'];
            if (!empty($o['customer_details'])) {
                $o['customer_details'] = json_decode($o['customer_details'], true);
            }
        }

        echo json_encode(['success' => true, 'orders' => $orders]);
    } catch (Exception $e) {
        error_log("Orders GET Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to load orders']);
    }
}

function handleCreateOrder($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }

        $userId = isset($input['user_id']) ? intval($input['user_id']) : 0;
        $productId = isset($input['product_id']) ? intval($input['product_id']) : 0;

        if ($userId <= 0 || $productId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'User ID and Product ID are required']);
            return;
        }

        $pdo->beginTransaction();

        // 1. Fetch user and lock row for update
        $userStmt = $pdo->prepare("SELECT * FROM `users` WHERE `id` = ? FOR UPDATE");
        $userStmt->execute([$userId]);
        $user = $userStmt->fetch();

        if (!$user) {
            $pdo->rollBack();
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'User account not found']);
            return;
        }

        // 2. Fetch product
        $prodStmt = $pdo->prepare("SELECT * FROM `products` WHERE `id` = ? FOR UPDATE");
        $prodStmt->execute([$productId]);
        $product = $prodStmt->fetch();

        if (!$product || $product['availability'] !== 'available') {
            $pdo->rollBack();
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Product is not available for purchase']);
            return;
        }

        $price = (float)$product['price'];
        $currentBalance = (float)$user['balance'];

        if ($currentBalance < $price) {
            $pdo->rollBack();
            http_response_code(400);
            echo json_encode([
                'success' => false, 
                'error' => 'Insufficient wallet balance. Please fund your account with at least ₦' . number_format($price - $currentBalance, 2)
            ]);
            return;
        }

        // 3. Deduct wallet balance
        $newBalance = $currentBalance - $price;
        $updateUser = $pdo->prepare("UPDATE `users` SET `balance` = ?, `updated_at` = NOW() WHERE `id` = ?");
        $updateUser->execute([$newBalance, $userId]);

        // 4. Create Order Reference
        $orderRef = 'SP-ORD-' . strtoupper(substr(md5(uniqid((string)$userId, true)), 0, 8));
        $customerDetails = [
            'admin_login_email' => $product['admin_email'],
            'admin_login_password' => $product['admin_password'],
            'website_zip_name' => $product['website_zip_name'],
            'website_zip_size' => $product['website_zip_size'],
            'website_zip_path' => $product['website_zip_path'],
            'demo_url' => $product['demo_url'],
            'purchase_date' => date('c')
        ];

        $orderStmt = $pdo->prepare("
            INSERT INTO `orders` (
                `order_reference`, `user_id`, `product_id`, `product_name`,
                `category`, `amount`, `status`, `payment_status`,
                `customer_details`, `created_at`
            ) VALUES (?, ?, ?, ?, 'ready_made_website', ?, 'completed', 'paid', ?, NOW())
        ");
        $orderStmt->execute([
            $orderRef, $userId, $productId, $product['name'], $price, json_encode($customerDetails)
        ]);
        $orderId = $pdo->lastInsertId();

        // 5. Create Transaction Record
        $txRef = 'TX-PUR-' . strtoupper(substr(md5(uniqid((string)$orderId, true)), 0, 8));
        $txStmt = $pdo->prepare("
            INSERT INTO `transactions` (
                `user_id`, `type`, `amount`, `balance_before`,
                `balance_after`, `reference`, `description`, `created_at`
            ) VALUES (?, 'purchase', ?, ?, ?, ?, ?, NOW())
        ");
        $txStmt->execute([
            $userId, $price, $currentBalance, $newBalance, $txRef,
            'Purchased Ready-Made Website: ' . $product['name'] . ' (' . $orderRef . ')'
        ]);

        // 6. User Purchase Notification
        $notifStmt = $pdo->prepare("
            INSERT INTO `notifications` (`user_id`, `title`, `message`, `type`, `reference_id`, `link_route`, `read_status`, `created_at`)
            VALUES (?, 'Order Completed Successfully', ?, 'order', ?, 'orders', 0, NOW())
        ");
        $notifStmt->execute([
            $userId, 
            'Your purchase of ' . $product['name'] . ' was successful. Source files and admin credentials are ready in your dashboard.',
            $orderRef
        ]);

        // 7. Check 10 Qualifying Purchases for Referral Unlock
        $countStmt = $pdo->prepare("
            SELECT COUNT(*) AS total_qualifying 
            FROM `orders` 
            WHERE `user_id` = ? AND `status` = 'completed' AND `payment_status` = 'paid'
        ");
        $countStmt->execute([$userId]);
        $qualifyingCount = intval($countStmt->fetch()['total_qualifying'] ?? 0);

        $referralUnlockedNow = false;
        $unlockedReferralCode = null;

        if ($qualifyingCount >= 10 && (!$user['referral_unlocked'] || empty($user['referral_code']))) {
            $unlockedReferralCode = 'SP-' . strtoupper(substr(md5(uniqid((string)$userId, true)), 0, 6));
            $unlockStmt = $pdo->prepare("
                UPDATE `users` 
                SET `referral_unlocked` = 1, `referral_code` = ? 
                WHERE `id` = ?
            ");
            $unlockStmt->execute([$unlockedReferralCode, $userId]);
            $referralUnlockedNow = true;

            $notifUnlock = $pdo->prepare("
                INSERT INTO `notifications` (`user_id`, `title`, `message`, `type`, `link_route`, `read_status`, `created_at`)
                VALUES (?, '🎉 Referral Program Unlocked!', 'Congratulations! You have completed 10 qualifying purchases. Your unique referral code is now activated.', 'referral', 'dashboard', 0, NOW())
            ");
            $notifUnlock->execute([$userId]);
        }

        // 8. Referral Reward for Referrer (₦10,000 for qualifying ready-made website purchase)
        if (!empty($user['referred_by'])) {
            $referrerId = intval($user['referred_by']);

            // Fetch referrer
            $refUserStmt = $pdo->prepare("SELECT * FROM `users` WHERE `id` = ? FOR UPDATE");
            $refUserStmt->execute([$referrerId]);
            $referrer = $refUserStmt->fetch();

            if ($referrer) {
                $rewardAmount = 10000.00;
                $refOldBal = (float)$referrer['balance'];
                $refNewBal = $refOldBal + $rewardAmount;

                // Credit referrer balance
                $credStmt = $pdo->prepare("UPDATE `users` SET `balance` = ?, `updated_at` = NOW() WHERE `id` = ?");
                $credStmt->execute([$refNewBal, $referrerId]);

                // Insert into referral_rewards
                $rewInsert = $pdo->prepare("
                    INSERT INTO `referral_rewards` (`order_id`, `referrer_user_id`, `referred_user_id`, `amount`, `status`, `created_at`)
                    VALUES (?, ?, ?, ?, 'credited', NOW())
                ");
                $rewInsert->execute([$orderId, $referrerId, $userId, $rewardAmount]);

                // Insert transaction for referrer
                $refTxRef = 'TX-REF-' . strtoupper(substr(md5(uniqid((string)$orderId, true)), 0, 8));
                $refTxStmt = $pdo->prepare("
                    INSERT INTO `transactions` (
                        `user_id`, `type`, `amount`, `balance_before`,
                        `balance_after`, `reference`, `description`, `created_at`
                    ) VALUES (?, 'referral_reward', ?, ?, ?, ?, ?, NOW())
                ");
                $refTxStmt->execute([
                    $referrerId, $rewardAmount, $refOldBal, $refNewBal, $refTxRef,
                    'Referral Reward: ₦10,000 earned from ' . $user['full_name'] . ' ready-made website purchase'
                ]);

                // Notification to Referrer
                $notifRef = $pdo->prepare("
                    INSERT INTO `notifications` (`user_id`, `title`, `message`, `type`, `reference_id`, `link_route`, `read_status`, `created_at`)
                    VALUES (?, '💰 Referral Reward Credited (₦10,000)', ?, 'referral', ?, 'dashboard', 0, NOW())
                ");
                $notifRef->execute([
                    $referrerId,
                    'You earned ₦10,000 referral bonus! ' . $user['full_name'] . ' purchased ' . $product['name'] . '.',
                    $orderRef
                ]);
            }
        }

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Order placed successfully',
            'order_reference' => $orderRef,
            'new_balance' => $newBalance,
            'qualifying_count' => $qualifyingCount,
            'referral_unlocked' => $referralUnlockedNow,
            'referral_code' => $unlockedReferralCode
        ]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("Order Purchase Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Purchase processing failed. Please try again.']);
    }
}
