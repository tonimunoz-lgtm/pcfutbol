// injector-mobile.js
(function() {
    // --- 1️⃣ Detectar móvil ---
    function isMobile() {
        return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    if (!isMobile()) return; // No aplicar si no es móvil

    console.log('📱 Modo móvil activado');

    // --- 2️⃣ Ajustes generales de estilo ---
    function applyGlobalMobileStyles() {
        document.body.style.fontSize = '14px';
        document.body.style.padding = '0';
        document.body.style.margin = '0';
        document.body.style.overflowX = 'hidden';
        document.querySelectorAll('button').forEach(btn => {
            btn.style.padding = '12px 10px';
            btn.style.fontSize = '14px';
        });
        document.querySelectorAll('input, select').forEach(input => {
            input.style.fontSize = '14px';
        });
    }

    // --- 3️⃣ Ajustes de contenedores principales ---
    function adjustContainers() {
        const pitch = document.getElementById('pitchContainer');
        const reserves = document.getElementById('reservesList');
        const sidebar = document.querySelector('.sidebar');
        const header = document.querySelector('header');

        if (pitch) {
            pitch.style.width = '100%';
            pitch.style.height = 'auto';
        }
        if (reserves) {
            reserves.style.display = 'flex';
            reserves.style.flexDirection = 'column';
            reserves.style.width = '100%';
        }
        if (sidebar) sidebar.style.display = 'none';
        if (header) header.style.fontSize = '14px';
    }

    // --- 4️⃣ Ajustes de modales ---
    function adjustModals() {
        document.querySelectorAll('.modal-content').forEach(modal => {
            modal.style.width = '90%';
            modal.style.maxWidth = '90%';
            modal.style.maxHeight = '80vh';
            modal.style.overflowY = 'auto';
            modal.style.padding = '10px';
            modal.style.fontSize = '14px';
        });
    }

    // --- 5️⃣ Ajustes de alineación / pitch ---
    function adjustPitchUI() {
        const pitchSlots = document.querySelectorAll('.pitch-position-placeholder, .pitch-player');
        pitchSlots.forEach(slot => {
            slot.style.fontSize = '12px';
            slot.style.minHeight = '50px';
            slot.style.minWidth = '50px';
        });
    }

    // --- 6️⃣ Ajustes de mercado / listas de jugadores ---
    function adjustMarketUI() {
        const marketList = document.getElementById('marketPlayersList') || document.getElementById('reservesList');
        if (marketList) {
            marketList.style.display = 'flex';
            marketList.style.flexDirection = 'column';
            marketList.style.width = '100%';
        }

        document.querySelectorAll('.btn').forEach(btn => {
            btn.style.width = '100%';
            btn.style.marginBottom = '8px';
        });
    }

    // --- 7️⃣ Aplicar todos los ajustes ---
    function applyMobileUI() {
        applyGlobalMobileStyles();
        adjustContainers();
        adjustModals();
        adjustPitchUI();
        adjustMarketUI();
        console.log('✅ UI móvil aplicada');
    }

    // Ejecutar al cargar el DOM y al cambiar tamaño
    document.addEventListener('DOMContentLoaded', applyMobileUI);
    window.addEventListener('resize', applyMobileUI);

    console.log('✅ Inyector móvil cargado y aplicado.');
})();
