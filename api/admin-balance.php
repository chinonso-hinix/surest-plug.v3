<?php
/**
 * Surest Plug - Admin Balance API
 * Server-side MySQL operations for admin wallet credit/debit adjustments.
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Method not allowed'
    ]);
    exit;
}

requireAdmin();

$pdo = getDBConnection();

try {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!is_array($input)) {
        $input = $_POST;
    }

    $userId = isset($input['user_id']) ? (int)$input['user_id'] : 0;
    $amount = isset($input['amount']) ? (float)$input['amount'] : 0;
    $type = isset($input['type']) ? trim((string)$input['type']) : '';
    $reason = isset($input['reason']) ? trim((string)$input['reason']) : '';

    if ($userId <= 0) {
        throw new RuntimeException('User ID is required.');
    }

    if ($amount <= 0) {
        throw new RuntimeException('Adjustment amount must be greater than zero.');
    }

    if (!in_array($type, ['credit', 'debit'], true)) {
        throw new RuntimeException('Invalid balance adjustment type.');
    }

    if ($reason === '') {
        throw new RuntimeException('A reason is required for the balance adjustment.');
    }

    if (strlen($reason) > 255) {
        throw new RuntimeException('The adjustment reason is too long.');
    }

    $amount = round($amount, 2);

    if ($amount <= 0) {
        throw new RuntimeException('Adjustment amount must be at least ₦0.01.');
    }

    $adminId = (int)$_SESSION['user_id'];

    $pdo->beginTransaction();

    // Lock the user's wallet row so concurrent adjustments cannot use a stale balance.
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
    $userStmt->execute([$userId]);
    $user = $userStmt->fetch();

    if (!$user) {
        throw new RuntimeException('User not found.');
    }

    if ($user['account_status'] === 'suspended') {
        throw new RuntimeException('The user account is suspended.');
    }

    $balanceBefore = (float)$user['balance'];

    if ($type === 'credit') {
        $balanceAfter = round($balanceBefore + $amount, 2);
        $transactionType = 'admin_credit';
        $notificationTitle = 'Wallet Credited';
        $notificationMessage =
            'Your wallet was credited with ₦' . number_format($amount, 2) .
            '. Reason: ' . $reason;
    } else {
        if ($balanceBefore < $amount) {
            throw new RuntimeException('Cannot debit more than the user current balance.');
        }

        $balanceAfter = round($balanceBefore - $amount, 2);
        $transactionType = 'admin_debit';
        $notificationTitle = 'Wallet Debited';
        $notificationMessage =
            'Your wallet was debited by ₦' . number_format($amount, 2) .
            '. Reason: ' . $reason;
    }

    // Update the authoritative MySQL wallet balance.
    $updateUserStmt = $pdo->prepare("
        UPDATE users
        SET balance = ?
        WHERE id = ?
    ");
    $updateUserStmt->execute([
        $balanceAfter,
        $userId
    ]);

    // Generate the financial reference on the server.
    $reference = 'SP-ADM-' . strtoupper(bin2hex(random_bytes(6)));

    $description = 'Admin balance ' . $type . ': ' . $reason;

    // Record the authoritative wallet transaction.
    $txStmt = $pdo->prepare("
        INSERT INTO transactions
            (user_id, type, amount, balance_before, balance_after, reference, description, created_at)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    $txStmt->execute([
        $userId,
        $transactionType,
        $amount,
        $balanceBefore,
        $balanceAfter,
        $reference,
        $description
    ]);

    $transactionId = (int)$pdo->lastInsertId();

    // Re-read the authoritative transaction row created by MySQL.
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
    $finalTransaction = $finalTxStmt->fetch();

    if (!$finalTransaction) {
        throw new RuntimeException('Wallet transaction could not be reloaded.');
    }

    // Notify the user from MySQL.
    $notificationStmt = $pdo->prepare("
        INSERT INTO notifications
            (user_id, title, message, type, reference_id, link_route, read_status, created_at)
        VALUES
            (?, ?, ?, 'wallet', ?, 'wallet', 0, NOW())
    ");
    $notificationStmt->execute([
        $userId,
        $notificationTitle,
        $notificationMessage,
        $reference
    ]);

    // Re-read the authoritative user row after the balance update.
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
    $finalUserStmt->execute([$userId]);
    $finalUser = $finalUserStmt->fetch();

    if (!$finalUser) {
        throw new RuntimeException('Updated user could not be reloaded.');
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'User wallet balance adjusted successfully.',
        'user' => $finalUser,
        'transaction' => [
            'id' => (int)$finalTransaction['id'],
            'user_id' => (int)$finalTransaction['user_id'],
            'type' => $finalTransaction['type'],
            'amount' => (float)$finalTransaction['amount'],
            'currency' => 'NGN',
            'balance_before' => (float)$finalTransaction['balance_before'],
            'balance_after' => (float)$finalTransaction['balance_after'],
            'reference' => $finalTransaction['reference'],
            'payment_reference' => $finalTransaction['reference'],
            'status' => 'successful',
            'description' => $finalTransaction['description'],
            'payment_method' => 'admin_adjustment',
            'created_at' => $finalTransaction['created_at']
        ]
    ]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('Admin Balance API Error: ' . $e->getMessage());

    http_response_code(400);

    echo json_encode([
        'success' => false,
        'error' => $e->getMessage() !== ''
            ? $e->getMessage()
            : 'Unable to adjust user wallet balance.'
    ]);
}
