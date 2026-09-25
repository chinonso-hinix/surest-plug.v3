<?php
/**
 * Surest Plug - Global Header Component
 * Strict Rule: No WhatsApp, Email, About Us, How It Works, or Contact in top header.
 */

if (!defined('SITE_NAME')) {
    require_once __DIR__ . '/../config/app_config.php';
}
require_once __DIR__ . '/auth.php';

$currentUser = getCurrentUser();
$currentPage = basename($_SERVER['PHP_SELF']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo isset($pageTitle) ? e($pageTitle) . ' — ' . SITE_NAME : SITE_NAME . ' — ' . SITE_TAGLINE; ?></title>
    
    <!-- Favicon using exact SP Logo -->
    <link rel="icon" type="image/png" href="/assets/images/favicon.png">
    
    <!-- Tailwind CSS (via CDN for standalone InfinityFree deployment) -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: {
                            50: '#EFF6FF',
                            100: '#DBEAFE',
                            500: '#3B82F6',
                            600: '#2563EB',
                            700: '#1D4ED8',
                            800: '#1E40AF',
                            900: '#1E3A8A',
                        },
                        navy: {
                            800: '#1E293B',
                            900: '#0F172A',
                        }
                    }
                }
            }
        }
    </script>
    
    <!-- Inter Font -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
    </style>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen flex flex-col antialiased selection:bg-blue-600 selection:text-white">

<!-- Global Loading Screen Component -->
<?php include __DIR__ . '/loading.php'; ?>

<!-- Global Coming Soon Modal Component -->
<?php include __DIR__ . '/modal.php'; ?>

<!-- Top Navigation Header -->
<header class="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16 sm:h-20 gap-4">
            
            <!-- Left Zone: Logo & Wordmark -->
            <div class="flex items-center gap-3 shrink-0">
                <a href="/index.php" class="flex items-center gap-2.5 group">
                    <img 
                        src="/assets/images/sp-logo.png" 
                        alt="Surest Plug" 
                        class="w-10 h-10 object-contain rounded-lg transition-transform group-hover:scale-105"
                        onerror="this.src='https://www.image2url.com/r2/default/images/1787280450296-e9b96e0a-2afe-4699-b779-c0a26af1f613.png'"
                    />
                    <div class="flex flex-col">
                        <span class="text-xl font-extrabold tracking-tight text-blue-700 leading-tight">
                            Surest<span class="text-slate-900">Plug</span>
                        </span>
                    </div>
                </a>
            </div>

            <!-- Middle Zone: Search Bar & Quick Categories Dropdown -->
            <div class="hidden md:flex items-center flex-1 max-w-xl mx-4 gap-3">
                <!-- Search Form -->
                <form action="/marketplace.php" method="GET" class="relative w-full">
                    <div class="relative">
                        <input 
                            type="text" 
                            name="search" 
                            placeholder="Search ready-made websites, services..." 
                            value="<?php echo isset($_GET['search']) ? e($_GET['search']) : ''; ?>"
                            class="w-full pl-10 pr-4 py-2 text-sm bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-slate-900 placeholder-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        />
                        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                        </div>
                    </div>
                </form>

                <!-- Categories Quick Menu -->
                <div class="relative group">
                    <button type="button" class="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-colors whitespace-nowrap">
                        <span>Services</span>
                        <svg class="w-4 h-4 text-slate-400 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </button>
                    
                    <!-- Dropdown Content -->
                    <div class="absolute left-0 mt-1 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 hidden group-hover:block transition-all z-50">
                        <a href="/marketplace.php" class="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600">
                            <span class="w-2 h-2 rounded-full bg-blue-600"></span>
                            <span>Ready-Made Websites</span>
                        </a>
                        <a href="/custom-website.php" class="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600">
                            <span class="w-2 h-2 rounded-full bg-indigo-600"></span>
                            <span>Custom Websites</span>
                        </a>
                        <a href="/boosting.php" class="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600">
                            <span class="w-2 h-2 rounded-full bg-emerald-600"></span>
                            <span>Boosting of Account</span>
                        </a>
                        <button type="button" onclick="openComingSoonModal('International Numbers')" class="w-full text-left flex items-center justify-between px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                            <div class="flex items-center gap-3">
                                <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                                <span>International Numbers</span>
                            </div>
                            <span class="text-[10px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Soon</span>
                        </button>
                        <button type="button" onclick="openComingSoonModal('Social Media Accounts & Logins')" class="w-full text-left flex items-center justify-between px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                            <div class="flex items-center gap-3">
                                <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                                <span>Social Accounts & Logins</span>
                            </div>
                            <span class="text-[10px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Soon</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Right Zone: User Actions / Auth Buttons -->
            <div class="flex items-center gap-2 sm:gap-3 shrink-0">
                <?php if ($currentUser): ?>
                    <!-- Wallet Balance Pill -->
                    <a href="/dashboard/wallet.php" class="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold border border-blue-100 hover:bg-blue-100 transition-colors">
                        <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                        </svg>
                        <span><?php echo formatCurrency($currentUser['balance']); ?></span>
                    </a>

                    <!-- User Account Menu Button -->
                    <div class="relative group">
                        <a href="/dashboard/index.php" class="flex items-center gap-2 p-1.5 text-slate-700 hover:text-blue-600 rounded-xl hover:bg-slate-100 transition-colors">
                            <div class="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                                <?php echo strtoupper(substr($currentUser['full_name'], 0, 1)); ?>
                            </div>
                            <span class="hidden lg:block text-sm font-medium text-slate-800 max-w-[120px] truncate">
                                <?php echo e($currentUser['full_name']); ?>
                            </span>
                            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </a>
                        
                        <div class="absolute right-0 mt-1 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 hidden group-hover:block transition-all z-50">
                            <div class="px-4 py-2 border-b border-slate-100">
                                <p class="text-xs text-slate-400">Signed in as</p>
                                <p class="text-sm font-semibold text-slate-800 truncate"><?php echo e($currentUser['email']); ?></p>
                            </div>
                            <?php if ($currentUser['role'] === 'admin'): ?>
                                <a href="/admin/index.php" class="flex items-center gap-2.5 px-4 py-2 text-sm text-blue-600 font-semibold hover:bg-blue-50">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                                    <span>Admin Panel</span>
                                </a>
                            <?php endif; ?>
                            <a href="/dashboard/index.php" class="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                <span>Dashboard</span>
                            </a>
                            <a href="/dashboard/orders.php" class="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                <span>My Orders</span>
                            </a>
                            <a href="/dashboard/wallet.php" class="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                <span>Wallet & Deposit</span>
                            </a>
                            <a href="/dashboard/profile.php" class="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                <span>Profile Settings</span>
                            </a>
                            <div class="border-t border-slate-100 my-1"></div>
                            <a href="/logout.php" class="flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                <span>Logout</span>
                            </a>
                        </div>
                    </div>
                <?php else: ?>
                    <a href="/login.php" class="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 rounded-xl hover:bg-slate-100 transition-colors whitespace-nowrap">
                        Login
                    </a>
                    <a href="/register.php" class="px-4 sm:px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow-md transition-all whitespace-nowrap">
                        Create Account
                    </a>
                <?php endif; ?>
            </div>

        </div>
    </div>
</header>
<main class="flex-1">
