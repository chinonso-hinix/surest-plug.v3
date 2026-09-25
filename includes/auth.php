<?php
/**
 * Surest Plug - Authentication and Session Management
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/app_config.php';
require_once __DIR__ . '/security.php';

/**
 * Get currently authenticated user record from DB
 * @return array|null
 */
function getCurrentUser() {
    if (empty($_SESSION['user_id'])) {
        return null;
    }
    
    $pdo = getDBConnection();
    $stmt = $pdo->prepare("SELECT id, full_name, email, phone, profile_image, role, balance, account_status,
                   referral_code, referral_unlocked, referred_by, referred_by_code,
                   welcome_seen, admin_welcome_seen, created_at, updated_at
            FROM users WHERE id = ? LIMIT 1");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    
    if (!$user || $user['account_status'] === 'suspended') {
        // Clear session if suspended or deleted
        unset($_SESSION['user_id'], $_SESSION['user_role'], $_SESSION['user_name'], $_SESSION['user_email']);
        return null;
    }
    
    return $user;
}

/**
 * Check if a user is logged in
 */
function isLoggedIn() {
    return !empty($_SESSION['user_id']);
}

/**
 * Check if the logged-in user is an administrator
 */
function isAdmin() {
    return isLoggedIn() && !empty($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin';
}

/**
 * Require authentication or redirect to login
 */
function requireAuth() {
    if (!isLoggedIn()) {
        $_SESSION['auth_redirect'] = $_SERVER['REQUEST_URI'];
        header('Location: /login.php');
        exit;
    }
}

/**
 * Require admin role or terminate with 403 Forbidden
 */
function requireAdmin() {
    requireAuth();
    if (!isAdmin()) {
        http_response_code(403);
        include __DIR__ . '/../403.php';
        exit;
    }
}

/**
 * Authenticate and log in user
 */
function loginUserSession($user) {
    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_role'] = $user['role'];
    $_SESSION['user_name'] = $user['full_name'];
    $_SESSION['user_email'] = $user['email'];
}

/**
 * Authenticate an existing MySQL email/password account.
 */
function authenticateUser($email, $password) {
    $email = strtolower(trim($email));

    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
        return ['success' => false, 'error' => 'Invalid email or password.'];
    }

    $pdo = getDBConnection();

    $stmt = $pdo->prepare(
        "SELECT id, full_name, email, password, phone, profile_image, role,
                balance, account_status, referral_code, referral_unlocked,
                referred_by, referred_by_code, welcome_seen, admin_welcome_seen,
                created_at, updated_at
         FROM users WHERE email = ? LIMIT 1"
    );
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || empty($user['password']) || !password_verify($password, $user['password'])) {
        return ['success' => false, 'error' => 'Invalid email or password.'];
    }

    if ($user['account_status'] !== 'active') {
        return ['success' => false, 'error' => 'Your account is suspended. Please contact Surest Plug support.'];
    }

    loginUserSession($user);
    unset($user['password']);

    return ['success' => true, 'user' => $user];
}

/**
 * Register a new user securely
 */
function registerUser($fullName, $email, $password, $confirmPassword) {
    $fullName = trim($fullName);
    $email = strtolower(trim($email));
    
    if (empty($fullName) || empty($email) || empty($password)) {
        return ['success' => false, 'error' => 'All fields are required.'];
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return ['success' => false, 'error' => 'Please provide a valid email address.'];
    }
    
    if (strlen($password) < 6) {
        return ['success' => false, 'error' => 'Password must be at least 6 characters long.'];
    }
    
    if ($password !== $confirmPassword) {
        return ['success' => false, 'error' => 'Passwords do not match.'];
    }
    
    $pdo = getDBConnection();
    
    // Check if email already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        return ['success' => false, 'error' => 'An account with this email address already exists.'];
    }
    
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    
    $stmt = $pdo->prepare("INSERT INTO users (full_name, email, password, role, balance, account_status) VALUES (?, ?, ?, 'user', 0.00, 'active')");
    $stmt->execute([$fullName, $email, $hashedPassword]);
    $userId = $pdo->lastInsertId();
    
    // Create welcome notification
    $notifStmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'system')");
    $notifStmt->execute([$userId, 'Welcome to Surest Plug!', 'Your account has been successfully created. Fund your wallet or explore our digital marketplace services.', 'system']);
    
    return [
        'success' => true,
        'user' => [
            'id' => $userId,
            'full_name' => $fullName,
            'email' => $email,
            'role' => 'user'
        ]
    ];
}
