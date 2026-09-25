<?php
/**
 * Surest Plug - Global Loading Screen Component
 * Uses the exact SP logo rotating smoothly, with stationary text "Connecting to Surest Plug...."
 */
?>
<!-- Global SP Loading Screen Overlay -->
<div id="sp-global-loader" class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm transition-opacity duration-300 pointer-events-none opacity-0" style="display: none;">
    <div class="flex flex-col items-center justify-center p-8 text-center">
        <!-- Exact SP Logo spinning/rotating smoothly -->
        <div class="relative w-24 h-24 mb-6 flex items-center justify-center">
            <img 
                src="/assets/images/sp-logo.png" 
                alt="Surest Plug" 
                class="w-20 h-20 object-contain animate-sp-spin drop-shadow-md select-none"
                onerror="this.src='https://www.image2url.com/r2/default/images/1787280450296-e9b96e0a-2afe-4699-b779-c0a26af1f613.png'"
            />
        </div>
        <!-- Stationary text (does NOT rotate) -->
        <p id="sp-loader-text" class="text-slate-750 font-medium text-base tracking-wide text-slate-800 animate-pulse select-none">
            Connecting to Surest Plug....
        </p>
    </div>
</div>

<style>
@keyframes spSpin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}
.animate-sp-spin {
    animation: spSpin 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
</style>

<script>
window.showSPLoader = function(customText) {
    const loader = document.getElementById('sp-global-loader');
    const textEl = document.getElementById('sp-loader-text');
    if (!loader) return;
    if (customText && textEl) textEl.textContent = customText;
    else if (textEl) textEl.textContent = 'Connecting to Surest Plug....';
    
    loader.style.display = 'flex';
    loader.classList.remove('pointer-events-none', 'opacity-0');
    loader.classList.add('opacity-100');
};

window.hideSPLoader = function() {
    const loader = document.getElementById('sp-global-loader');
    if (!loader) return;
    loader.classList.remove('opacity-100');
    loader.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => {
        if (loader.classList.contains('opacity-0')) {
            loader.style.display = 'none';
        }
    }, 300);
};
</script>
