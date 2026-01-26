(function() {
    function applyMobileUI() {
        const isMobile = window.innerWidth <= 768;
        if (!isMobile) return; // Solo aplicar en móviles

        // 1️⃣ Ocultar sidebar original
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.style.display = 'none';

        // 2️⃣ Ajustar contenedores principales
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.padding = '10px';
            mainContent.style.width = '100%';
            mainContent.style.overflowX = 'hidden';
        }

        // 3️⃣ Hacer que todos los modales sean scrollables
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.maxHeight = '90vh';
            modal.style.overflowY = 'auto';
            modal.style.padding = '10px';
        });

        // 4️⃣ Adaptar pitch
        const pitchContainer = document.getElementById('pitchContainer');
        if (pitchContainer) {
            pitchContainer.style.width = '100%';
            pitchContainer.style.height = '400px';
            pitchContainer.style.overflowX = 'auto';
            pitchContainer.style.overflowY = 'hidden';
            pitchContainer.style.position = 'relative';
        }

        // 5️⃣ Adaptar listas largas (reserves, mercado, staff)
        ['reservesList', 'marketList', 'staffCandidatesList'].forEach(id => {
            const list = document.getElementById(id);
            if (list) {
                list.style.maxHeight = '300px';
                list.style.overflowY = 'auto';
            }
        });

        // 6️⃣ Crear menú móvil flotante
        function createMobileMenu() {
            if (document.getElementById('mobileMenu')) return;

            const menu = document.createElement('div');
            menu.id = 'mobileMenu';
            menu.style.position = 'fixed';
            menu.style.bottom = '0';
            menu.style.left = '0';
            menu.style.width = '100%';
            menu.style.background = '#e94560';
            menu.style.display = 'flex';
            menu.style.justifyContent = 'space-around';
            menu.style.padding = '8px 0';
            menu.style.zIndex = '9999';
            menu.style.borderTop = '2px solid #fff';

            const sections = [
                { name: 'Dashboard', page: 'dashboard' },
                { name: 'Alineación', page: 'lineup' },
                { name: 'Mercado', page: 'market' },
                { name: 'Entrenamiento', page: 'training' },
                { name: 'Finanzas', page: 'finance' }
            ];

            sections.forEach(sec => {
                const btn = document.createElement('button');
                btn.textContent = sec.name;
                btn.style.flex = '1';
                btn.style.margin = '0 4px';
                btn.style.padding = '8px';
                btn.style.fontSize = '12px';
                btn.style.background = '#fff';
                btn.style.color = '#e94560';
                btn.style.border = 'none';
                btn.style.borderRadius = '5px';
                btn.style.cursor = 'pointer';
                btn.onclick = () => {
                    const menuItem = document.querySelector(`.menu-item[onclick="window.switchPage('${sec.page}', this)"]`);
                    if(menuItem) window.switchPage(sec.page, menuItem);
                };
                menu.appendChild(btn);
            });

            document.body.appendChild(menu);
        }
        createMobileMenu();

        // 7️⃣ Ajustes para botones y tablas largas
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            table.style.width = '100%';
            table.style.display = 'block';
            table.style.overflowX = 'auto';
        });

        // 8️⃣ Ajuste general de tipografía y botones
        document.querySelectorAll('button').forEach(btn => {
            btn.style.fontSize = '14px';
            btn.style.padding = '6px 8px';
        });
        document.querySelectorAll('input, select').forEach(el => {
            el.style.fontSize = '14px';
            el.style.width = '100%';
            el.style.boxSizing = 'border-box';
            el.style.marginBottom = '6px';
        });
    }

    // Ejecutar al cargar y al redimensionar
    window.addEventListener('load', applyMobileUI);
    window.addEventListener('resize', applyMobileUI);
    console.log('✅ Inyector móvil cargado y aplicado.');
})();
