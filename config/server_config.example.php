<?php
/**
 * Surest Plug - InfinityFree Server Configuration Template
 *
 * Copy this file to:
 *   config/server_config.php
 *
 * Then replace the placeholder values with your real production
 * credentials on the server only.
 *
 * NEVER commit config/server_config.php to GitHub.
 */

return [
    'PAYSTACK_SECRET_KEY' => 'REPLACE_WITH_PAYSTACK_SECRET_KEY',
    'VITE_PAYSTACK_PUBLIC_KEY' => 'REPLACE_WITH_PAYSTACK_PUBLIC_KEY',

    'CARTLOGS_API_KEY' => 'REPLACE_WITH_CARTLOGS_API_KEY',

    'FOLLOWSPANEL_API_KEY' => 'REPLACE_WITH_FOLLOWSPANEL_API_KEY',

    'INSTANTNUM_API_KEY' => 'REPLACE_WITH_INSTANTNUM_API_KEY',
    'INSTANTNUM_BASE_URL' => 'https://instantnums.com/v1',
    'INSTANTNUM_USD_TO_NGN_RATE' => 1600.00,
    'INSTANTNUM_MARKUP_BELOW_1000_NGN' => 1000,
    'INSTANTNUM_MARKUP_1000_AND_ABOVE_NGN' => 2000,

    'GOOGLE_CLIENT_ID' => 'REPLACE_WITH_GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET' => 'REPLACE_WITH_GOOGLE_CLIENT_SECRET',
];
