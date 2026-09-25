<?php
/**
 * Surest Plug - Security & Helper Functions
 */

if (!defined('APP_SECRET_KEY')) {
    require_once __DIR__ . '/../config/app_config.php';
}

/**
 * Generate CSRF Token and store in session
 */
function generateCSRFToken() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Validate CSRF Token from POST request
 */
function validateCSRFToken($token) {
    if (empty($_SESSION['csrf_token']) || empty($token)) {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Sanitize string for HTML output (Prevent XSS)
 */
function e($string) {
    return htmlspecialchars((string)$string, ENT_QUOTES, 'UTF-8');
}

/**
 * Format currency in Nigerian Naira (₦)
 */
function formatCurrency($amount) {
    return CURRENCY_SYMBOL . number_format((float)$amount, 2);
}

/**
 * Generate unique order or transaction reference
 */
function generateReference($prefix = 'SP') {
    return $prefix . '-' . strtoupper(substr(uniqid(), 7, 6)) . '-' . rand(100, 999);
}

/**
 * Send JSON response and exit
 */
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}
