<?php
/**
 * Surest Plug - Admin Wallet API
 * Server-side MySQL operations for admin deposit approval.
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

    $action = isset($input['action']) ? trim((string)$input['action']) : '';

    if ($action !== 'approve_deposit') {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid wallet action'
        ]);
        exit;
    }

    $depositId = isset($input['deposit_id']) ? (int)$input['deposit_id'] : 0;
    $note = isset($input['note']) ? trim((string)$input['note']) : '';

    if ($depositId <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Deposit ID is required'
        ]);
        exit;
    }

    $adminId = (int)$_SESSION['user_id'];

    $pdo->beginTransaction();

    // Lock the deposit so it cannot be approved twice concurrently.
    $depositStmt = $pdo->prepare("
        SELECT
            id,
            deposit_reference,
            user_id,
            amount,
            payment_method,
            payment_reference,
            status,
            admin_note
        FROM deposits
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
    ");
    $depositStmt->execute([$depositId]);
    $deposit = $depositStmt->fetch();

    if (!$deposit) {
        throw new RuntimeException('Deposit not found.');
    }

    if ($deposit['status'] !== 'pending') {
        throw new RuntimeException('Deposit is already processed.');
    }

    $amount = (float)$deposit['amount'];

    if ($amount < 1000) {
        throw new RuntimeException('Deposit amount is below the minimum required ₦1,000.');
    }

    // Lock the user's wallet row before calculating the new balance.
    $userStmt = $pdo->prepare("
        SELECT
            id,
            full_name,
            email,
            firebase_uid,
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
    $userStmt->execute([(int)$deposit['user_id']]);
    $user = $userStmt->fetch();

    if (!$user) {
        throw new RuntimeException('Deposit owner was not found.');
    }

    if ($user['account_status'] === 'suspended') {
        throw new RuntimeException('The deposit owner account is suspended.');
    }

    $balanceBefore = (float)$user['balance'];
    $balanceAfter = round($balanceBefore + $amount, 2);

    // Credit the authoritative MySQL wallet balance.
    $updateUserStmt = $pdo->prepare("
        UPDATE users
        SET balance = ?
        WHERE id = ?
    ");
    $updateUserStmt->execute([
        $balanceAfter,
        (int)$user['id']
    ]);

    // Mark the deposit as approved.
    $updateDepositStmt = $pdo->prepare("
        UPDATE deposits
        SET
            status = 'approved',
            admin_note = ?,
            reviewed_by = ?,
            reviewed_at = NOW()
        WHERE id = ?
    ");
    $updateDepositStmt->execute([
        $note !== '' ? $note : null,
        $adminId,
        $depositId
    ]);

    // Re-read the authoritative deposit state after approval.
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
        throw new RuntimeException('Approved deposit could not be reloaded.');
    }

    // Preserve/update the existing transaction if one already exists;
    // otherwise create the wallet deposit transaction.
    $txFindStmt = $pdo->prepare("
        SELECT id
        FROM transactions
        WHERE reference = ?
        ORDER BY id DESC
        LIMIT 1
        FOR UPDATE
    ");
    $txFindStmt->execute([$deposit['deposit_reference']]);
    $existingTx = $txFindStmt->fetch();

    $description = 'Wallet deposit approved (' . $deposit['payment_method'] . ')';

    if ($existingTx) {
        $txUpdateStmt = $pdo->prepare("
            UPDATE transactions
            SET
                type = 'deposit',
                amount = ?,
                balance_before = ?,
                balance_after = ?,
                description = ?
            WHERE id = ?
        ");
        $txUpdateStmt->execute([
            $amount,
            $balanceBefore,
            $balanceAfter,
            $description,
            (int)$existingTx['id']
        ]);
    } else {
        $txInsertStmt = $pdo->prepare("
            INSERT INTO transactions
                (user_id, type, amount, balance_before, balance_after, reference, description, created_at)
            VALUES
                (?, 'deposit', ?, ?, ?, ?, ?, NOW())
        ");
        $txInsertStmt->execute([
            (int)$user['id'],
            $amount,
            $balanceBefore,
            $balanceAfter,
            $deposit['deposit_reference'],
            $description
        ]);
    }

    // Notify the user from MySQL.
    $notificationStmt = $pdo->prepare("
        INSERT INTO notifications
            (user_id, title, message, type, reference_id, link_route, read_status, created_at)
        VALUES
            (?, 'Deposit Approved', ?, 'deposit', ?, 'wallet', 0, NOW())
    ");

    $notificationMessage =
        'Your deposit of ₦' . number_format($amount, 2) .
        ' has been verified and credited to your wallet!';

    $notificationStmt->execute([
        (int)$user['id'],
        $notificationMessage,
        $deposit['deposit_reference']
    ]);

    // Re-read the authoritative user row after the update.
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
    $finalUserStmt->execute([(int)$user['id']]);
    $finalUser = $finalUserStmt->fetch();

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Deposit approved and wallet credited successfully.',
        'deposit' => [
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
        ],
        'user' => $finalUser
    ]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('Admin Wallet API Error: ' . $e->getMessage());

    $message = $e->getMessage();

    http_response_code(400);

    echo json_encode([
        'success' => false,
        'error' => $message !== '' ? $message : 'Unable to process wallet operation.'
    ]);
}
