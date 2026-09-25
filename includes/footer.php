<?php
/**
 * Surest Plug - Global Footer Component
 * Contains working links to About Us, How It Works, Contact, Terms, Privacy, Refund, and floating WhatsApp support.
 */

if (!defined('SITE_NAME')) {
    require_once __DIR__ . '/../config/app_config.php';
}
?>
</main>

<!-- Floating WhatsApp Support Button -->
<a 
    href="https://wa.me/<?php echo preg_replace('/[^0-9]/', '', WHATSAPP_SUPPORT_NUMBER); ?>?text=<?php echo urlencode(WHATSAPP_WELCOME_MESSAGE); ?>" 
    target="_blank" 
    rel="noopener noreferrer" 
    class="fixed bottom-6 right-6 z-40 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white p-3.5 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2.5 group"
    aria-label="Chat on WhatsApp"
>
    <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
    <span class="hidden md:inline font-semibold text-sm">Need Help? Chat with us</span>
</a>

<!-- Site Footer -->
<footer class="bg-navy-900 text-slate-300 pt-14 pb-8 border-t border-slate-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
            
            <!-- Brand Column -->
            <div class="lg:col-span-2 space-y-4">
                <a href="/index.php" class="flex items-center gap-3">
                    <img 
                        src="/assets/images/sp-logo.png" 
                        alt="Surest Plug" 
                        class="w-10 h-10 object-contain rounded-lg"
                        onerror="this.src='https://www.image2url.com/r2/default/images/1787280450296-e9b96e0a-2afe-4699-b779-c0a26af1f613.png'"
                    />
                    <span class="text-2xl font-extrabold tracking-tight text-white">
                        Surest<span class="text-blue-500">Plug</span>
                    </span>
                </a>
                <p class="text-slate-400 text-sm leading-relaxed max-w-sm">
                    <?php echo SITE_TAGLINE; ?>. Premium ready-made websites, custom digital development, and social media growth tools designed for modern creators and enterprises.
                </p>
                <div class="flex items-center gap-4 text-xs text-slate-400 pt-2">
                    <span class="inline-flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                        100% Secure System
                    </span>
                    <span class="inline-flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-blue-400"></span>
                        Fast Delivery
                    </span>
                </div>
            </div>

            <!-- Marketplace Links -->
            <div class="space-y-3">
                <h4 class="text-white font-semibold text-sm tracking-wider uppercase">Marketplace</h4>
                <ul class="space-y-2.5 text-sm">
                    <li>
                        <a href="/marketplace.php" class="text-slate-400 hover:text-white transition-colors">
                            Ready-Made Websites
                        </a>
                    </li>
                    <li>
                        <a href="/custom-website.php" class="text-slate-400 hover:text-white transition-colors">
                            Custom Websites
                        </a>
                    </li>
                    <li>
                        <a href="/boosting.php" class="text-slate-400 hover:text-white transition-colors">
                            Boosting of Account
                        </a>
                    </li>
                    <li>
                        <button type="button" onclick="openComingSoonModal('International Numbers')" class="text-slate-400 hover:text-white transition-colors text-left flex items-center gap-2">
                            <span>International Numbers</span>
                            <span class="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">Soon</span>
                        </button>
                    </li>
                    <li>
                        <button type="button" onclick="openComingSoonModal('Social Media Accounts & Logins')" class="text-slate-400 hover:text-white transition-colors text-left flex items-center gap-2">
                            <span>Social Media Accounts</span>
                            <span class="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">Soon</span>
                        </button>
                    </li>
                </ul>
            </div>

            <!-- Company Links -->
            <div class="space-y-3">
                <h4 class="text-white font-semibold text-sm tracking-wider uppercase">Company</h4>
                <ul class="space-y-2.5 text-sm">
                    <li>
                        <a href="/about.php" class="text-slate-400 hover:text-white transition-colors">
                            About Us
                        </a>
                    </li>
                    <li>
                        <a href="/how-it-works.php" class="text-slate-400 hover:text-white transition-colors">
                            How It Works
                        </a>
                    </li>
                    <li>
                        <a href="/contact.php" class="text-slate-400 hover:text-white transition-colors">
                            Contact Support
                        </a>
                    </li>
                </ul>
            </div>

            <!-- Support & Legal Links -->
            <div class="space-y-3">
                <h4 class="text-white font-semibold text-sm tracking-wider uppercase">Support & Legal</h4>
                <ul class="space-y-2.5 text-sm">
                    <li>
                        <a href="/contact.php" class="text-slate-400 hover:text-white transition-colors">
                            Support Center
                        </a>
                    </li>
                    <li>
                        <a href="/terms.php" class="text-slate-400 hover:text-white transition-colors">
                            Terms & Conditions
                        </a>
                    </li>
                    <li>
                        <a href="/privacy.php" class="text-slate-400 hover:text-white transition-colors">
                            Privacy Policy
                        </a>
                    </li>
                    <li>
                        <a href="/refund.php" class="text-slate-400 hover:text-white transition-colors">
                            Refund Policy
                        </a>
                    </li>
                </ul>
            </div>

        </div>

        <!-- Copyright -->
        <div class="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© <?php echo date('Y'); ?> <?php echo SITE_NAME; ?>. All rights reserved.</p>
            <p class="flex items-center gap-2">
                <span>Production Digital Marketplace</span>
                <span>•</span>
                <span>InfinityFree Ready</span>
            </p>
        </div>
    </div>
</footer>

</body>
</html>
