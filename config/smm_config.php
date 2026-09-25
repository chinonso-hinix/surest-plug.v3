<?php
/**
 * Surest Plug - SMM / Social Media Boosting Configuration (FollowSPanel)
 * SECURE: Server-side only. Never exposed to browser, JS, HTML, or public networks.
 */

require_once __DIR__ . '/followspanel.php';

// USD to NGN currency conversion rate
if (!defined('USD_TO_NGN_RATE')) {
    define('USD_TO_NGN_RATE', 1550.00);
}

// Profit markup percentage (e.g. 20%)
if (!defined('SMM_PROFIT_MARGIN_PERCENT')) {
    define('SMM_PROFIT_MARGIN_PERCENT', 20.0);
}

/**
 * Execute server-to-server request to FollowSPanel
 * @param array $params
 * @return array
 */
function callSmmApi($params = []) {
    return followspanel_request($params);
}
