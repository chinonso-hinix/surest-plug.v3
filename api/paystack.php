<?php
/**
 * Surest Plug - Paystack API Endpoint (PHP Backend for InfinityFree / cPanel)
 * Secure proxy between Customer Browser and Paystack REST API.
 * Never exposes the PAYSTACK_SECRET_KEY to the client.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';
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
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'error' => 'Method not allowed'
            ]);
            break;
        }

        if (!isLoggedIn()) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'error' => 'You must be logged in to fund your wallet.'
            ]);
            break;
        }

        $currentUser = getCurrentUser();

        if (!$currentUser || empty($currentUser['id'])) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'error' => 'Your account session could not be verified.'
            ]);
            break;
        }

        $amount = $postData['amount'] ?? 0;
        $userId = (int)$currentUser['id'];
        $email = (string)($currentUser['email'] ?? '');
        $name = (string)($currentUser['full_name'] ?? '');
        $callbackUrl = $postData['callbackUrl'] ?? $postData['callback_url'] ?? '';
        $metadata = is_array($postData['metadata'] ?? null) ? $postData['metadata'] : [];

        $res = paystack_initialize($email, $amount, $userId, $name, $callbackUrl, $metadata);
        http_response_code($res['success'] ? 200 : 400);
        echo json_encode($res);
        break;

    case 'verify':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'verified' => false,
                'error' => 'Method not allowed'
            ]);
            break;
        }

        if (!isLoggedIn()) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'verified' => false,
                'error' => 'You must be logged in to fund your wallet.'
            ]);
            break;
        }

        $reference = trim((string)($postData['reference'] ?? ''));
        $amount = $postData['expectedAmount'] ?? $postData['amount'] ?? null;

        $currentUser = getCurrentUser();

        if (!$currentUser || empty($currentUser['id'])) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'verified' => false,
                'error' => 'Your account session could not be verified.'
            ]);
            break;
        }

        $sessionUserId = (int)$currentUser['id'];
        $sessionEmail = (string)($currentUser['email'] ?? '');

        $res = paystack_verify($reference, $amount, $sessionUserId, $sessionEmail);

        if (!($res['success'] ?? false) || !($res['verified'] ?? false)) {
            http_response_code(400);
            echo json_encode($res);
            break;
        }

        $pdo = getDBConnection();

        try {
            $pdo->beginTransaction();

            // Lock the user's wallet row so concurrent requests cannot
            // calculate the same balance_before/balance_after pair.
            $userStmt = $pdo->prepare("
                SELECT
                    id,
                    firebase_uid,
                    full_name,
                    email,
                    phone,
                    profile_image,
                    role,
                    balance,
                    account_status,
                    referral_code,
                    referral_unlocked,
                    referred_by,
                    referred_by_code,
                    welcome_seen,
                    admin_welcome_seen,
                    created_at,
                    updated_at
                FROM users
                WHERE id = ?
                LIMIT 1
                FOR UPDATE
            ");
            $userStmt->execute([$sessionUserId]);
            $user = $userStmt->fetch();

            if (!$user) {
                throw new RuntimeException('Your account could not be found.');
            }

            if ($user['account_status'] === 'suspended') {
                throw new RuntimeException('Your account is suspended and cannot receive wallet funding.');
            }

            $cleanReference = trim((string)($res['reference'] ?? $reference));
            $depositAmount = (float)($res['amount'] ?? 0);

            if ($cleanReference === '') {
                throw new RuntimeException('Paystack returned an invalid transaction reference.');
            }

            if ($depositAmount < 1000) {
                throw new RuntimeException('Minimum funding amount is ₦1,000.');
            }

            // The Paystack reference is the idempotency key in MySQL.
            // Lock any existing transaction with this reference before deciding
            // whether another wallet credit is necessary.
            $txFindStmt = $pdo->prepare("
                SELECT
                    id,
                    user_id,
                    type,
                    amount,
                    balance_before,
                    balance_after,
                    reference,
                    description,
                    created_at
                FROM transactions
                WHERE reference = ?
                  AND type = 'deposit'
                ORDER BY id DESC
                LIMIT 1
                FOR UPDATE
            ");
            $txFindStmt->execute([$cleanReference]);
            $existingTx = $txFindStmt->fetch();

            if ($existingTx) {
                if ((int)$existingTx['user_id'] !== $sessionUserId) {
                    throw new RuntimeException('This payment reference is already associated with another account.');
                }

                $existingDepositStmt = $pdo->prepare("
                    SELECT
                        id,
                        deposit_reference,
                        user_id,
                        amount,
                        payment_method,
                        payment_reference,
                        proof_image,
                        status,
                        admin_note,
                        reviewed_by,
                        created_at,
                        reviewed_at
                    FROM deposits
                    WHERE payment_reference = ?
                      AND user_id = ?
                    ORDER BY id DESC
                    LIMIT 1
                    FOR UPDATE
                ");
                $existingDepositStmt->execute([
                    $cleanReference,
                    $sessionUserId
                ]);
                $existingDeposit = $existingDepositStmt->fetch();

                $pdo->commit();

                $res['alreadyProcessed'] = true;
                $res['user'] = $user;
                $res['transaction'] = [
                    'id' => (int)$existingTx['id'],
                    'user_id' => (int)$existingTx['user_id'],
                    'type' => $existingTx['type'],
                    'amount' => (float)$existingTx['amount'],
                    'balance_before' => (float)$existingTx['balance_before'],
                    'balance_after' => (float)$existingTx['balance_after'],
                    'reference' => $existingTx['reference'],
                    'status' => 'successful',
                    'description' => $existingTx['description'],
                    'payment_reference' => $existingTx['reference'],
                    'payment_method' => 'Paystack',
                    'created_at' => $existingTx['created_at']
                ];

                if ($existingDeposit) {
                    $res['deposit'] = [
                        'id' => (int)$existingDeposit['id'],
                        'deposit_reference' => $existingDeposit['deposit_reference'],
                        'user_id' => (int)$existingDeposit['user_id'],
                        'amount' => (float)$existingDeposit['amount'],
                        'payment_method' => $existingDeposit['payment_method'],
                        'payment_reference' => $existingDeposit['payment_reference'],
                        'proof_image' => $existingDeposit['proof_image'],
                        'status' => $existingDeposit['status'],
                        'admin_note' => $existingDeposit['admin_note'],
                        'reviewed_by' => $existingDeposit['reviewed_by'] !== null
                            ? (int)$existingDeposit['reviewed_by']
                            : null,
                        'created_at' => $existingDeposit['created_at'],
                        'reviewed_at' => $existingDeposit['reviewed_at']
                    ];
                }

                http_response_code(200);
                echo json_encode($res);
                break;
            }

            $balanceBefore = (float)$user['balance'];
            $balanceAfter = round($balanceBefore + $depositAmount, 2);

            // Credit the authoritative MySQL wallet balance.
            $updateUserStmt = $pdo->prepare("
                UPDATE users
                SET balance = ?
                WHERE id = ?
            ");
            $updateUserStmt->execute([
                $balanceAfter,
                $sessionUserId
            ]);

            // Create the authoritative wallet transaction.
            $description = 'Wallet deposit via Paystack';

            $txInsertStmt = $pdo->prepare("
                INSERT INTO transactions
                    (user_id, type, amount, balance_before, balance_after, reference, description, created_at)
                VALUES
                    (?, 'deposit', ?, ?, ?, ?, ?, NOW())
            ");
            $txInsertStmt->execute([
                $sessionUserId,
                $depositAmount,
                $balanceBefore,
                $balanceAfter,
                $cleanReference,
                $description
            ]);

            $transactionId = (int)$pdo->lastInsertId();

            // Record the Paystack deposit itself so the wallet funding has
            // an authoritative deposit record in MySQL.
            $depositReference = 'SP-DEP-' . strtoupper(substr(
                preg_replace('/[^A-Za-z0-9]/', '', $cleanReference),
                0,
                40
            ));

            if ($depositReference === 'SP-DEP-') {
                $depositReference = 'SP-DEP-' . strtoupper(bin2hex(random_bytes(6)));
            }

            $depositRefCheckStmt = $pdo->prepare("
                SELECT id
                FROM deposits
                WHERE deposit_reference = ?
                LIMIT 1
                FOR UPDATE
            ");
            $depositRefCheckStmt->execute([$depositReference]);

            if ($depositRefCheckStmt->fetch()) {
                $depositReference = 'SP-DEP-' . strtoupper(bin2hex(random_bytes(8)));
            }

            $depositInsertStmt = $pdo->prepare("
                INSERT INTO deposits
                    (deposit_reference, user_id, amount, payment_method, payment_reference, status, created_at, reviewed_at)
                VALUES
                    (?, ?, ?, 'Paystack', ?, 'approved', NOW(), NOW())
            ");
            $depositInsertStmt->execute([
                $depositReference,
                $sessionUserId,
                $depositAmount,
                $cleanReference
            ]);

            $depositId = (int)$pdo->lastInsertId();

            // Notify the user from MySQL.
            $notificationStmt = $pdo->prepare("
                INSERT INTO notifications
                    (user_id, title, message, type, reference_id, link_route, read_status, created_at)
                VALUES
                    (?, 'Wallet Funded', ?, 'wallet', ?, 'wallet', 0, NOW())
            ");

            $notificationMessage =
                'Your Paystack payment of ₦' . number_format($depositAmount, 2) .
                ' has been verified and credited to your wallet.';

            $notificationStmt->execute([
                $sessionUserId,
                $notificationMessage,
                $cleanReference
            ]);

            // Re-read the authoritative user and transaction after all writes.
            $finalUserStmt = $pdo->prepare("
                SELECT
                    id,
                    firebase_uid,
                    full_name,
                    email,
                    phone,
                    profile_image,
                    role,
                    balance,
                    account_status,
                    referral_code,
                    referral_unlocked,
                    referred_by,
                    referred_by_code,
                    welcome_seen,
                    admin_welcome_seen,
                    created_at,
                    updated_at
                FROM users
                WHERE id = ?
                LIMIT 1
            ");
            $finalUserStmt->execute([$sessionUserId]);
            $finalUser = $finalUserStmt->fetch();

            if (!$finalUser) {
                throw new RuntimeException('Wallet was credited but the final account state could not be reloaded.');
            }

            $finalTxStmt = $pdo->prepare("
                SELECT
                    id,
                    user_id,
                    type,
                    amount,
                    balance_before,
                    balance_after,
                    reference,
                    description,
                    created_at
                FROM transactions
                WHERE id = ?
                LIMIT 1
            ");
            $finalTxStmt->execute([$transactionId]);
            $finalTx = $finalTxStmt->fetch();

            if (!$finalTx) {
                throw new RuntimeException('Wallet was credited but the transaction record could not be reloaded.');
            }

            $finalDepositStmt = $pdo->prepare("
                SELECT
                    id,
                    deposit_reference,
                    user_id,
                    amount,
                    payment_method,
                    payment_reference,
                    proof_image,
                    status,
                    admin_note,
                    reviewed_by,
                    created_at,
                    reviewed_at
                FROM deposits
                WHERE id = ?
                LIMIT 1
            ");
            $finalDepositStmt->execute([$depositId]);
            $finalDeposit = $finalDepositStmt->fetch();

            if (!$finalDeposit) {
                throw new RuntimeException('Wallet was credited but the deposit record could not be reloaded.');
            }

            $pdo->commit();

            $res['alreadyProcessed'] = false;
            $res['user'] = $finalUser;
            $res['deposit'] = [
                'id' => (int)$finalDeposit['id'],
                'deposit_reference' => $finalDeposit['deposit_reference'],
                'user_id' => (int)$finalDeposit['user_id'],
                'amount' => (float)$finalDeposit['amount'],
                'payment_method' => $finalDeposit['payment_method'],
                'payment_reference' => $finalDeposit['payment_reference'],
                'proof_image' => $finalDeposit['proof_image'],
                'status' => $finalDeposit['status'],
                'admin_note' => $finalDeposit['admin_note'],
                'reviewed_by' => $finalDeposit['reviewed_by'] !== null
                    ? (int)$finalDeposit['reviewed_by']
                    : null,
                'created_at' => $finalDeposit['created_at'],
                'reviewed_at' => $finalDeposit['reviewed_at']
            ];
            $res['transaction'] = [
                'id' => (int)$finalTx['id'],
                'user_id' => (int)$finalTx['user_id'],
                'type' => $finalTx['type'],
                'amount' => (float)$finalTx['amount'],
                'balance_before' => (float)$finalTx['balance_before'],
                'balance_after' => (float)$finalTx['balance_after'],
                'reference' => $finalTx['reference'],
                'status' => 'successful',
                'description' => $finalTx['description'],
                'payment_reference' => $finalTx['reference'],
                'payment_method' => 'Paystack',
                'created_at' => $finalTx['created_at']
            ];

            http_response_code(200);
            echo json_encode($res);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }

            error_log('Paystack Wallet Credit Error: ' . $e->getMessage());

            http_response_code(400);
            echo json_encode([
                'success' => false,
                'verified' => false,
                'reference' => $res['reference'] ?? $reference,
                'error' => $e->getMessage() !== ''
                    ? $e->getMessage()
                    : 'Payment was verified but wallet credit could not be completed.'
            ]);
        }

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
