<?php
/**
 * Surest Plug - Customer Dashboard Sidebar Component
 */

$currentPage = basename($_SERVER['PHP_SELF']);
$currentUser = getCurrentUser();
?>
<aside class="w-full lg:w-64 bg-white lg:min-h-[calc(100vh-5rem)] border-r border-slate-200 p-4 shrink-0 flex flex-col justify-between">
    <div class="space-y-6">
        <!-- User Quick Info -->
        <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                <?php echo strtoupper(substr($currentUser['full_name'] ?? 'U', 0, 1)); ?>
            </div>
            <div class="flex-1 min-w-0">
                <h4 class="text-sm font-semibold text-slate-800 truncate"><?php echo e($currentUser['full_name'] ?? 'User'); ?></h4>
                <p class="text-xs font-semibold text-blue-600"><?php echo formatCurrency($currentUser['balance'] ?? 0); ?></p>
            </div>
        </div>

        <!-- Navigation Links -->
        <nav class="space-y-1">
            <a href="/dashboard/index.php" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors <?php echo $currentPage === 'index.php' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'; ?>">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                <span>Dashboard</span>
            </a>

            <a href="/marketplace.php" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-slate-700 hover:bg-slate-100 hover:text-blue-600">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                <span>Marketplace</span>
            </a>

            <a href="/dashboard/orders.php" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors <?php echo $currentPage === 'orders.php' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'; ?>">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                <span>My Orders</span>
            </a>

            <a href="/dashboard/custom-orders.php" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors <?php echo $currentPage === 'custom-orders.php' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'; ?>">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                <span>Custom Projects</span>
            </a>

            <a href="/boosting.php" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-slate-700 hover:bg-slate-100 hover:text-blue-600">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                <span>Boosting of Account</span>
            </a>

            <div class="pt-2 pb-1">
                <p class="px-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Billing & Finance</p>
            </div>

            <a href="/dashboard/wallet.php" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors <?php echo $currentPage === 'wallet.php' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'; ?>">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                <span>Wallet</span>
            </a>

            <a href="/dashboard/fund.php" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors <?php echo $currentPage === 'fund.php' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'; ?>">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                <span>Fund Account</span>
            </a>

            <a href="/dashboard/transactions.php" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors <?php echo $currentPage === 'transactions.php' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'; ?>">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m0 0l-6-6m6 6H3"></path></svg>
                <span>Transactions</span>
            </a>

            <div class="pt-2 pb-1">
                <p class="px-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Account</p>
            </div>

            <a href="/dashboard/support.php" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors <?php echo $currentPage === 'support.php' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'; ?>">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                <span>Support Tickets</span>
            </a>

            <a href="/dashboard/profile.php" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors <?php echo $currentPage === 'profile.php' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'; ?>">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                <span>Profile Settings</span>
            </a>
        </nav>
    </div>

    <div class="pt-6 border-t border-slate-100 mt-6">
        <a href="/logout.php" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            <span>Logout</span>
        </a>
    </div>
</aside>
