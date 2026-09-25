<?php
/**
 * Surest Plug - Google OAuth Configuration & Helper
 * Server-Side Authentication Integration
 */

// Google OAuth Client ID & Secret
define('GOOGLE_CLIENT_ID', getenv('GOOGLE_CLIENT_ID') ?: '');
define('GOOGLE_CLIENT_SECRET', getenv('GOOGLE_CLIENT_SECRET') ?: '');
define('GOOGLE_REDIRECT_URI', BASE_URL . '/api/auth/google-callback.php');

/**
 * Generate Google OAuth Authorization URL
 */
function getGoogleAuthUrl() {
    $params = [
        'client_id' => GOOGLE_CLIENT_ID,
        'redirect_uri' => GOOGLE_REDIRECT_URI,
        'response_type' => 'code',
        'scope' => 'openid email profile',
        'access_type' => 'online',
        'prompt' => 'select_account',
        'state' => bin2hex(random_bytes(16))
    ];
    
    $_SESSION['google_oauth_state'] = $params['state'];
    return 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params);
}

/**
 * Exchange Google Authorization Code for Access Token and User Info
 */
function handleGoogleCallback($code, $state) {
    if (empty($_SESSION['google_oauth_state']) || $_SESSION['google_oauth_state'] !== $state) {
        return ['success' => false, 'error' => 'Invalid OAuth state verification.'];
    }
    
    // Exchange code for token
    $tokenUrl = 'https://oauth2.googleapis.com/token';
    $postData = [
        'code' => $code,
        'client_id' => GOOGLE_CLIENT_ID,
        'client_secret' => GOOGLE_CLIENT_SECRET,
        'redirect_uri' => GOOGLE_REDIRECT_URI,
        'grant_type' => 'authorization_code'
    ];
    
    $ch = curl_init($tokenUrl);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    curl_close($ch);
    
    $tokenData = json_decode($response, true);
    if (empty($tokenData['access_token'])) {
        return ['success' => false, 'error' => 'Failed to obtain access token from Google.'];
    }
    
    // Retrieve user profile
    $userInfoUrl = 'https://www.googleapis.com/oauth2/v3/userinfo';
    $ch = curl_init($userInfoUrl);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $tokenData['access_token']]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $userResponse = curl_exec($ch);
    curl_close($ch);
    
    $userData = json_decode($userResponse, true);
    if (empty($userData['email'])) {
        return ['success' => false, 'error' => 'Could not retrieve user email from Google account.'];
    }
    
    return [
        'success' => true,
        'user' => [
            'google_id' => $userData['sub'],
            'email' => $userData['email'],
            'name' => $userData['name'] ?? explode('@', $userData['email'])[0],
            'picture' => $userData['picture'] ?? null
        ]
    ];
}
