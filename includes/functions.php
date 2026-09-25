<?php
/**
 * Surest Plug - Core Marketplace & Wallet Functions
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/security.php';

/**
 * Purchase a Ready-Made Website
 */
function purchaseProduct($userId, $productId) {
    $pdo = getDBConnection();
    
    try {
        $pdo->beginTransaction();
        
        // Lock user row for update to prevent race conditions
        $userStmt = $pdo->prepare("SELECT id, full_name, email, balance, account_status FROM users WHERE id = ? FOR UPDATE");
        $userStmt->execute([$userId]);
        $user = $userStmt->fetch();
        
        if (!$user || $user['account_status'] !== 'active') {
            $pdo->rollBack();
            return ['success' => false, 'error' => 'User account is invalid or suspended.'];
        }
        
        // Lock product row
        $prodStmt = $pdo->prepare("SELECT id, name, category, price, availability, demo_url FROM products WHERE id = ? FOR UPDATE");
        $prodStmt->execute([$productId]);
        $product = $prodStmt->fetch();
        
        if (!$product) {
            $pdo->rollBack();
            return ['success' => false, 'error' => 'Product not found.'];
        }
        
        if ($product['availability'] !== 'available') {
            $pdo->rollBack();
            return ['success' => false, 'error' => 'This product is currently out of stock.'];
        }
        
        $price = (float)$product['price'];
        $userBalance = (float)$user['balance'];
        
        if ($userBalance < $price) {
            $pdo->rollBack();
            return ['success' => false, 'error' => 'Insufficient balance. Please fund your account before purchasing.'];
        }
        
        $newBalance = $userBalance - $price;
        $orderRef = generateReference('SP-ORD');
        $txRef = generateReference('SP-TX');
        
        // Deduct user balance
        $updateBalStmt = $pdo->prepare("UPDATE users SET balance = ? WHERE id = ?");
        $updateBalStmt->execute([$newBalance, $userId]);
        
        // Record order
        $orderStmt = $pdo->prepare("INSERT INTO orders (order_reference, user_id, product_id, product_name, category, amount, status, payment_status, customer_details) VALUES (?, ?, ?, ?, ?, ?, 'completed', 'paid', ?)");
        $customerDetails = json_encode(['demo_url' => $product['demo_url'], 'purchase_type' => 'digital_instant_delivery']);
        $orderStmt->execute([$orderRef, $userId, $product['id'], $product['name'], $product['category'], $price, $customerDetails]);
        $orderId = $pdo->lastInsertId();
        
        // Record transaction
        $txStmt = $pdo->prepare("INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference, description) VALUES (?, 'purchase', ?, ?, ?, ?, ?)");
        $txStmt->execute([$userId, $price, $userBalance, $newBalance, $txRef, 'Purchased digital product: ' . $product['name']]);
        
        // Send notification
        $notifStmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'order')");
        $notifStmt->execute([$userId, 'Order Completed #' . $orderRef, 'You have successfully purchased ' . $product['name'] . ' for ' . formatCurrency($price) . '.', 'order']);
        
        $pdo->commit();
        
        return [
            'success' => true,
            'order_reference' => $orderRef,
            'order_id' => $orderId,
            'amount' => $price,
            'new_balance' => $newBalance
        ];
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("Purchase Error: " . $e->getMessage());
        return ['success' => false, 'error' => 'Transaction failed. Please try again.'];
    }
}

/**
 * Submit SMM Boosting Order
 */
function processSmmOrder($userId, $serviceData, $targetLink, $quantity, $calculatedPrice) {
    $pdo = getDBConnection();
    
    try {
        $pdo->beginTransaction();
        
        // Lock user balance
        $userStmt = $pdo->prepare("SELECT id, balance, account_status FROM users WHERE id = ? FOR UPDATE");
        $userStmt->execute([$userId]);
        $user = $userStmt->fetch();
        
        if (!$user || $user['account_status'] !== 'active') {
            $pdo->rollBack();
            return ['success' => false, 'error' => 'Account is suspended or inactive.'];
        }
        
        $userBalance = (float)$user['balance'];
        if ($userBalance < $calculatedPrice) {
            $pdo->rollBack();
            return ['success' => false, 'error' => 'Insufficient balance. Please fund your account to complete this boosting order.'];
        }
        
        $orderRef = generateReference('SP-SMM');
        $txRef = generateReference('SP-TX');
        $newBalance = $userBalance - $calculatedPrice;
        
        // Update user balance
        $updateBalStmt = $pdo->prepare("UPDATE users SET balance = ? WHERE id = ?");
        $updateBalStmt->execute([$newBalance, $userId]);
        
        // Customer details payload
        $customerDetails = json_encode([
            'platform' => $serviceData['platform'] ?? 'Social Media',
            'service_name' => $serviceData['name'] ?? 'Account Boosting',
            'target_link' => $targetLink,
            'quantity' => $quantity,
            'rate_per_k' => $serviceData['rate'] ?? 0
        ]);
        
        // Insert order
        $orderStmt = $pdo->prepare("INSERT INTO orders (order_reference, user_id, product_name, category, amount, status, payment_status, customer_details) VALUES (?, ?, ?, 'boosting', ?, 'processing', 'paid', ?)");
        $orderStmt->execute([$orderRef, $userId, ($serviceData['platform'] ?? '') . ' - ' . ($serviceData['name'] ?? 'Boosting'), $calculatedPrice, $customerDetails]);
        $orderId = $pdo->lastInsertId();
        
        // Insert transaction
        $txStmt = $pdo->prepare("INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference, description) VALUES (?, 'purchase', ?, ?, ?, ?, ?)");
        $txStmt->execute([$userId, $calculatedPrice, $userBalance, $newBalance, $txRef, 'Social Media Boosting: ' . ($serviceData['name'] ?? '') . ' (Qty: ' . $quantity . ')']);
        
        // Insert notification
        $notifStmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'order')");
        $notifStmt->execute([$userId, 'Boosting Order Placed #' . $orderRef, 'Your boosting order for ' . $quantity . ' units has been submitted and is processing.', 'order']);
        
        $pdo->commit();
        
        return [
            'success' => true,
            'order_reference' => $orderRef,
            'order_id' => $orderId,
            'new_balance' => $newBalance
        ];
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("SMM Order Error: " . $e->getMessage());
        return ['success' => false, 'error' => 'Boosting order could not be processed. Please try again.'];
    }
}
