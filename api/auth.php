<?php
/**
 * Surest Plug - MySQL Session Authentication API
 */

require_once __DIR__ . '/../includes/auth.php';

header('Content-Type: application/json; charset=utf-8');

function authInput() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : $_POST;
}

function publicUser($user) {
    if (!$user) return null;
    unset($user['password']);
    return $user;
}

$action = strtolower(trim($_GET['action'] ?? ''));

if ($action === '') {
    $path = trim(parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), '/');
    $parts = explode('/', $path);
    $action = strtolower(end($parts));
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'login') {
        $input = authInput();
        $result = authenticateUser(
            (string)($input['email'] ?? ''),
            (string)($input['password'] ?? '')
        );

        if (!$result['success']) {
            jsonResponse($result, 401);
        }

        jsonResponse([
            'success' => true,
            'user' => publicUser($result['user'])
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'register') {
        $input = authInput();

        $name = trim((string)($input['full_name'] ?? $input['name'] ?? ''));
        $email = strtolower(trim((string)($input['email'] ?? '')));
        $password = (string)($input['password'] ?? '');
        $confirm = (string)($input['confirm_password'] ?? $input['confirmPassword'] ?? $password);
        $phone = trim((string)($input['phone'] ?? ''));

        $result = registerUser($name, $email, $password, $confirm);

        if (!$result['success']) {
            jsonResponse($result, 400);
        }

        $pdo = getDBConnection();
        $userId = (int)$result['user']['id'];

        if ($phone !== '') {
            $stmt = $pdo->prepare("UPDATE users SET phone = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$phone, $userId]);
        }

        $stmt = $pdo->prepare(
            "SELECT id, full_name, email, phone, profile_image, role, balance,
                    account_status, referral_code, referral_unlocked,
                    referred_by, referred_by_code, welcome_seen,
                    admin_welcome_seen, created_at, updated_at
             FROM users WHERE id = ? LIMIT 1"
        );
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user) {
            jsonResponse(['success' => false, 'error' => 'Account was created but could not be loaded.'], 500);
        }

        loginUserSession($user);

        jsonResponse([
            'success' => true,
            'user' => publicUser($user)
        ], 201);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'me') {
        $user = getCurrentUser();

        if (!$user) {
            jsonResponse(['success' => false, 'user' => null], 401);
        }

        jsonResponse([
            'success' => true,
            'user' => publicUser($user)
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'logout') {
        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly']
            );
        }

        session_destroy();

        jsonResponse(['success' => true]);
    }

    jsonResponse(['success' => false, 'error' => 'Authentication endpoint not found.'], 404);

} catch (Throwable $e) {
    error_log('Auth API Error: ' . $e->getMessage());
    jsonResponse(['success' => false, 'error' => 'Authentication service error. Please try again.'], 500);
}
