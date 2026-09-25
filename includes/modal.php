<?php
/**
 * Surest Plug - Coming Soon & Reusable Modal Component
 * Used for International Numbers, Social Media Accounts & Logins, and dialogs
 */
?>
<!-- Coming Soon Modal -->
<div id="sp-coming-soon-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 opacity-0 pointer-events-none" style="display: none;">
    <div class="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 text-center transform transition-transform duration-300 scale-95 border border-slate-100" id="sp-modal-card">
        <!-- Close Button (Top-Right) -->
        <button 
            type="button" 
            onclick="closeComingSoonModal()" 
            class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
            aria-label="Close"
        >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </button>

        <!-- Brand Icon / Accent -->
        <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-5 shadow-inner">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
        </div>

        <!-- Heading -->
        <h3 id="sp-modal-title" class="text-2xl font-bold text-slate-900 tracking-tight mb-2 uppercase">
            COMING SOON
        </h3>

        <!-- Description -->
        <p id="sp-modal-description" class="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
            This service will be available on Surest Plug soon. Please check back later.
        </p>

        <!-- Action Button -->
        <div class="flex justify-center">
            <button 
                type="button" 
                onclick="closeComingSoonModal()" 
                class="w-full sm:w-auto px-8 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
            >
                Close
            </button>
        </div>
    </div>
</div>

<script>
window.openComingSoonModal = function(serviceName) {
    const modal = document.getElementById('sp-coming-soon-modal');
    const card = document.getElementById('sp-modal-card');
    const desc = document.getElementById('sp-modal-description');
    
    if (!modal) return;
    
    if (serviceName && desc) {
        desc.textContent = `${serviceName} will be available on Surest Plug soon. Please check back later.`;
    } else if (desc) {
        desc.textContent = 'This service will be available on Surest Plug soon. Please check back later.';
    }
    
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.remove('pointer-events-none', 'opacity-0');
        modal.classList.add('opacity-100');
        card.classList.remove('scale-95');
        card.classList.add('scale-100');
    }, 10);
};

window.closeComingSoonModal = function() {
    const modal = document.getElementById('sp-coming-soon-modal');
    const card = document.getElementById('sp-modal-card');
    if (!modal) return;
    
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0', 'pointer-events-none');
    card.classList.remove('scale-100');
    card.classList.add('scale-95');
    
    setTimeout(() => {
        if (modal.classList.contains('opacity-0')) {
            modal.style.display = 'none';
        }
    }, 300);
};
</script>
