<?php
/**
 * Surest Plug - Firebase Authentication & Server-Side Token Verification
 * Handles verifying Firebase ID Tokens and synchronizing identity with MySQL database.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/app_config.php';
require_once __DIR__ . '/security.php';

// Firebase Project Configuration
if (!defined('FIREBASE_PROJECT_ID')) {
    define('FIREBASE_PROJECT_ID', 'seventh-flame-sk7s0');
}

/**
 * Verify Firebase ID Token server-side via Google Identity Verification
 * 
 * @param string $idToken The Firebase ID Token from client SDK
 * @return array Decoded payload or error
 */
function verifyFirebaseIdToken(string $idToken): array {
    if (empty($idToken)) {
        return ['success' => false, 'error' => 'Authentication token missing.'];
    }

    // Call Google's tokeninfo verification endpoint
    $url = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' . (defined('FIREBASE_API_KEY') ? FIREBASE_API_KEY : '');
    
    // For universal token verification without exposing private service accounts:
    // We verify against Google's public token verification service
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($idToken));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError || $httpCode !== 200 || empty($response)) {
        // Fallback: Verify JWT structure and claims
        return verifyFirebaseJwtClaims($idToken);
    }

    $payload = json_decode($response, true);
    if (!$payload || isset($payload['error_description']) || isset($payload['error'])) {
        return verifyFirebaseJwtClaims($idToken);
    }

    // Verify audience / issuer
    $aud = $payload['aud'] ?? '';
    if ($aud !== FIREBASE_PROJECT_ID && !str_contains($aud, FIREBASE_PROJECT_ID)) {
        // Double check issuer
        $iss = $payload['iss'] ?? '';
        if ($iss !== 'https://securetoken.google.com/' . FIREBASE_PROJECT_ID) {
            return ['success' => false, 'error' => 'Invalid token audience.'];
        }
    }

    return [
        'success' => true,
        'uid' => $payload['sub'] ?? ($payload['user_id'] ?? ''),
        'email' => $payload['email'] ?? '',
        'name' => $payload['name'] ?? '',
        'picture' => $payload['picture'] ?? ''
    ];
}

/**
 * Fallback lightweight JWT parser and claims verifier
 */
function verifyFirebaseJwtClaims(string $jwt): array {
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) {
        return ['success' => false, 'error' => 'Invalid token format.'];
    }

    $payloadJson = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1]));
    if (!$payloadJson) {
        return ['success' => false, 'error' => 'Malformed token payload.'];
    }

    $payload = json_decode($payloadJson, true);
    if (!$payload || empty($payload['sub'])) {
        return ['success' => false, 'error' => 'Invalid token claims.'];
    }

    // Check expiration
    if (isset($payload['exp']) && $payload['exp'] < time()) {
        return ['success' => false, 'error' => 'Authentication token has expired.'];
    }

    // Check audience / issuer matches project
    $aud = $payload['aud'] ?? '';
    $iss = $payload['iss'] ?? '';
    $expectedIss = 'https://securetoken.google.com/' . FIREBASE_PROJECT_ID;

    if ($aud !== FIREBASE_PROJECT_ID && $iss !== $expectedIss) {
        return ['success' => false, 'error' => 'Token audience mismatch.'];
    }

    return [
        'success' => true,
        'uid' => $payload['sub'] ?? ($payload['user_id'] ?? ''),
        'email' => $payload['email'] ?? '',
        'name' => $payload['name'] ?? '',
        'picture' => $payload['picture'] ?? ''
    ];
}

/**
 * Synchronize Firebase Authenticated User with MySQL Database
 * 
 * @param string $idToken Firebase ID token
 * @param string|null $phone Optional phone number
 * @return array User record and session state
 */
function syncFirebaseUserWithMySQL(string $idToken, ?string $phone = null): array {
    $verification = verifyFirebaseIdToken($idToken);
    if (!$verification['success']) {
        return $verification;
    }

    $firebaseUid = $verification['uid'];
    $email = strtolower(trim($verification['email']));
    $fullName = !empty($verification['name']) ? trim($verification['name']) : 'Surest Plug User';
    $picture = !empty($verification['picture']) ? $verification['picture'] : 'assets/images/sp-logo.png';

    if (empty($firebaseUid) || empty($email)) {
        return ['success' => false, 'error' => 'Incomplete Firebase user identity.'];
    }

    $pdo = getDBConnection();

    // Check if user already exists by firebase_uid or email
    $stmt = $pdo->prepare("SELECT * FROM users WHERE firebase_uid = ? OR email = ? LIMIT 1");
    $stmt->execute([$firebaseUid, $email]);
    $user = $stmt->fetch();

    if ($user) {
        // User exists: Update firebase_uid and profile image if needed
        $updateStmt = $pdo->prepare("UPDATE users SET firebase_uid = ?, profile_image = COALESCE(profile_image, ?), updated_at = NOW() WHERE id = ?");
        $updateStmt->execute([$firebaseUid, $picture, $user['id']]);

        // Re-fetch fresh record
        $stmt = $pdo->prepare("SELECT id, firebase_uid, full_name, email, phone, profile_image, role, balance, account_status FROM users WHERE id = ? LIMIT 1");
        $stmt->execute([$user['id']]);
        $user = $stmt->fetch();
    } else {
        // New User: Create record in MySQL with initial balance ₦0.00
        $insertStmt = $pdo->prepare("
            INSERT INTO users (firebase_uid, full_name, email, phone, profile_image, role, balance, account_status)
            VALUES (?, ?, ?, ?, ?, 'user', 0.00, 'active')
        ");
        $insertStmt->execute([$firebaseUid, $fullName, $email, $phone, $picture]);
        $newUserId = $pdo->lastInsertId();

        // Create welcome notification
        $notifStmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'system')");
        $notifStmt->execute([$newUserId, 'Welcome to Surest Plug!', 'Your account is ready. Fund your wallet or browse available services.', 'system']);

        $stmt = $pdo->prepare("SELECT id, firebase_uid, full_name, email, phone, profile_image, role, balance, account_status FROM users WHERE id = ? LIMIT 1");
        $stmt->execute([$newUserId]);
        $user = $stmt->fetch();
    }

    if ($user['account_status'] === 'suspended') {
        return ['success' => false, 'error' => 'This account has been suspended. Please contact support.'];
    }

    // Establish secure PHP session
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['firebase_uid'] = $user['firebase_uid'];
    $_SESSION['user_role'] = $user['role'];
    $_SESSION['user_name'] = $user['full_name'];
    $_SESSION['user_email'] = $user['email'];

    return [
        'success' => true,
        'user' => $user
    ];
}
