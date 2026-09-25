<?php
/**
 * Surest Plug - Admin Dashboard Sidebar Component
 */

$currentPage = basename($_SERVER['PHP_SELF']);
$currentUser = getCurrentUser();
?>
<aside class="w-full lg:w-64 bg-slate-900 text-slate-300 lg:min-h-[calc(100vh-5rem)] border-r border-slate-800 p-4 shrink-0 flex flex-col justify-between">
    <div class="space-y-6">
        <!-- Admin Badge -->
        <div class="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/50 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <div>
                    <p class="text-xs font-semibold text-white">Administrator</p>
                    <p class="text-[11px] text-slate-400 truncate max-w-[120px]"><?php echo e($currentUser['full_name'] ?? 'Admin'); ?></p>
                </div>
            </div>
            <a href="/dashboard/index.php" title="View User Dashboard" class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 text-xs">
                Switch
            </a>
        </div>

        <!-- Navigation Links -->
        <nav class="space-y-1">
            <a href="/admin/index.php" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors <?php echo $currentPage === 'index.php' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'; ?>">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                <span>Admin Overview</span>
            </a>

            <a href="/admin/users.php" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors <?php echo $currentPage === 'users.php' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'; ?>">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                <span>Users & Balances</span>
            </a>

            <a href="/admin/products.php" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors <?php echo in_array($currentPage, ['products.php', 'product-add.php', 'product-edit.php']) ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'; ?>">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                <span>Products Catalog</span>
            </a>

            <a href="/admin/orders.php" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors <?php echo $currentPage === 'orders.php' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'; ?>">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                <span>Orders Management</span>
            </a>

            <a href="/admin/deposits.php" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors <?php echo $currentPage === 'deposits.php' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'; ?>">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                <span>Deposit Approvals</span>
            </a>

            <a href="/admin/custom-orders.php" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors <?php echo $currentPage === 'custom-orders.php' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'; ?>">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                <span>Custom Web Requests</span>
            </a>

            <a href="/admin/transactions.php" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors <?php echo $currentPage === 'transactions.php' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'; ?>">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m0 0l-6-6m6 6H3"></path></svg>
                <span>All Transactions</span>
            </a>

            <a href="/admin/support.php" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors <?php echo $currentPage === 'support.php' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'; ?>">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                <span>Support Tickets</span>
            </a>

            <a href="/admin/settings.php" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors <?php echo $currentPage === 'settings.php' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'; ?>">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <span>System & API Settings</span>
            </a>
        </nav>
    </div>

    <div class="pt-6 border-t border-slate-800 mt-6">
        <a href="/logout.php" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            <span>Logout</span>
        </a>
    </div>
</aside>
