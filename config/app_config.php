<?php
/**
 * Surest Plug - Application Configuration
 */

// Base URL (auto-detected or configured)
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443)) ? "https://" : "http://";
$host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
defined('BASE_URL') || define('BASE_URL', $protocol . $host);

// Brand & Identity
defined('SITE_NAME') || define('SITE_NAME', 'Surest Plug');
defined('SITE_TAGLINE') || define('SITE_TAGLINE', 'Your Plug for Websites, Social Media & Digital Services');
defined('CURRENCY_SYMBOL') || define('CURRENCY_SYMBOL', '₦');
defined('CURRENCY_CODE') || define('CURRENCY_CODE', 'NGN');

// Contact & Support (Used in footer & floating WhatsApp button)
defined('WHATSAPP_SUPPORT_NUMBER') || define('WHATSAPP_SUPPORT_NUMBER', '+2348141853557');
defined('WHATSAPP_WELCOME_MESSAGE') || define('WHATSAPP_WELCOME_MESSAGE', 'Hello Surest Plug, I need assistance with my account / order.');
defined('SUPPORT_EMAIL') || define('SUPPORT_EMAIL', 'chinonsochinix@gmail.com');

// Bank details for manual funding
defined('BANK_NAME') || define('BANK_NAME', 'OPAY BANK');
defined('BANK_ACCOUNT_NUMBER') || define('BANK_ACCOUNT_NUMBER', '8141853557');
defined('BANK_ACCOUNT_NAME') || define('BANK_ACCOUNT_NAME', 'CHINONSO MONDAY');

// Security Key for CSRF and session salts
defined('APP_SECRET_KEY') || define('APP_SECRET_KEY', 'surest_plug_prod_secret_key_8f3a19e2c4d7b5a6');

// Session Settings
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    ini_set('session.cookie_secure', (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 1 : 0);
    session_start();
}
