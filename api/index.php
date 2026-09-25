<?php
/**
 * Surest Plug - Unified Server-Side API Gateway (PHP Router for InfinityFree / cPanel)
 *
 * Directs all /api/* requests to their corresponding server-side connectors:
 * - /api/international-numbers/* -> Node/Express international-numbers service
 * - /api/paystack/*              -> api/paystack.php
 * - /api/smm/*                   -> api/smm.php
 * - /api/admin/followspanel/*    -> api/smm.php
find . -maxdepth 2 -type f \( -name 'index.php' -o -name 'bootstrap.php' -o -name 'autoload.php' \) -not -path './node_modules/*' -not -path './dist/*' -not -path './.git/*' -print
 * - /api/admin/cartlogs/*        -> api/cartlogs.php
 * - /api/health                  -> API status
 *
 * CRITICAL SECURITY:
 * All third-party secrets (InstantNums, Paystack, FollowSPanel, Cartlogs) are kept strictly
 * server-side and never exposed to the client or browser network inspection.
 */

// Enable CORS and JSON headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Role, X-Admin-Email, X-Admin-Secret, X-User-Role, X-User-Email');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Parse request path
$requestUri = $_SERVER['REQUEST_URI'] ?? '';
$parsedPath = parse_url($requestUri, PHP_URL_PATH);

// Remove leading slash and /api/ prefix
$route = preg_replace('#^/*(api/)?#i', '', $parsedPath);
$route = trim($route, '/');

// 1. Health check endpoint
if ($route === 'health' || $route === '') {
    echo json_encode([
        'status' => 'ok',
        'service' => 'Surest Plug API Gateway',
        'runtime' => 'InfinityFree / PHP',
        'timestamp' => date('c')
    ]);
    exit;
}

// 2. Authentication - MySQL email/password session service.
if (strpos($route, 'auth') === 0) {
    $subRoute = preg_replace('#^auth/?#i', '', $route);
    $subRoute = trim($subRoute, '/');

    if (!empty($subRoute) && empty($_GET['action'])) {
        $_GET['action'] = $subRoute;
    }

    require __DIR__ . '/auth.php';
    exit;
}

// 3. International Numbers - server-side InstantNums PHP service.
if (strpos($route, 'international-numbers') === 0) {
    require __DIR__ . '/international-numbers.php';
    exit;
}

// 4. Paystack Routes
if (strpos($route, 'paystack') === 0) {
    $subRoute = preg_replace('#^paystack/?#i', '', $route);
    $subRoute = trim($subRoute, '/');
    if (empty($_GET['action'])) {
        $_GET['action'] = $subRoute ?: 'initialize';
    }
    require __DIR__ . '/paystack.php';
    exit;
}

// 5. FollowSPanel SMM Routes
if (strpos($route, 'smm') === 0 || strpos($route, 'admin/followspanel') === 0) {
    $subRoute = preg_replace('#^(smm|admin/followspanel)/?#i', '', $route);
    $subRoute = trim($subRoute, '/');
    if (empty($_GET['action'])) {
        $_GET['action'] = $subRoute ?: 'services';
    }
    require __DIR__ . '/smm.php';
    exit;
}

// 6. Cartlogs Account Logs Routes
if (strpos($route, 'cartlogs') === 0 || strpos($route, 'admin/cartlogs') === 0) {
    $subRoute = preg_replace('#^(cartlogs|admin/cartlogs)/?#i', '', $route);
    $subRoute = trim($subRoute, '/');
    if (empty($_GET['action'])) {
        $_GET['action'] = $subRoute ?: 'products';
    }
    require __DIR__ . '/cartlogs.php';
    exit;
}

// 7. Direct mapping to existing standalone PHP scripts if present
$scriptName = explode('/', $route)[0] . '.php';
if (file_exists(__DIR__ . '/' . $scriptName)) {
    require __DIR__ . '/' . $scriptName;
    exit;
}

// 8. Fallback for unknown API route
http_response_code(404);
echo json_encode([
    'success' => false,
    'error' => 'API endpoint not found: /api/' . htmlspecialchars($route)
]);
exit;
