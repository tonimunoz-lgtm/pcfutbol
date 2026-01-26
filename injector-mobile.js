// injector-mobile.js
(function() {
    console.log('🚀 Injector Mobile - versión menú superior funcional');

    // --- Estilos móviles ---
    const mobileStyles = document.createElement('style');
    mobileStyles.innerHTML = `
        body, html {
            width: 100% !important;
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            overflow-x: hidden;
            background: #111;
            color: #fff;
        }

        #sidebar, #superos, .sidebar, .top-bar { display: none !important; }

        #topMobileMenu {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            background: #e94560;
            display: flex;
            justify-content: space-around;
            padding: 10px 0;
            z-index: 9999;
            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        }

        #topMobileMenu button {
            flex: 1;
            margin: 0 3px;
            font-size: 1rem;
            padding: 10px 5px;
            color: #fff;
            background: rgba(255,255,255,0.1);
            border: none;
            border-radius: 5px;
        }

        #topMobileMenu button.active {
            background: #fff;
            color: #e94560;
            font-weight: bold;
        }

        .page {
            width: 95vw !important;
            max-width: 480px;
            margin: 60px auto 20px auto;
            padding: 10px;
            box-sizing: border-box;
            display: none; /* Oculto por defecto */
            flex-direction: column;
            align-items: center;
            text-align: center;
        }

        .page.active {
            display: flex !important; /* Solo la activa se ve */
        }

        button, input, select {
            font-size: 1rem !important;
            padding: 10px !important;
            margin: 5px 0 !important;
        }

        #pitchContainer {
            width: 90vw !important;
            max-width: 450px;
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            margin: 15px 0;
            position: relative;
        }

        .pitch-position-placeholder {
            width: 16vw !important;
            height: 12vw !important;
            min-width: 60px;
            min-height: 40px;
            margin: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(233, 69, 96, 0.1);
            border: 1px solid #e94560;
            border-radius: 5px;
            font-size: 0.75rem;
            flex-direction: column;
        }

        .pitch-player, .draggable-player {
            font-size: 0.7rem;
            cursor: grab;
            margin: 2px 0;
            text-align: center;
        }

        #reservesList {
            width: 90vw !important;
            max-width: 450px;
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 5px;
        }

        .modal-content {
            width: 90vw !important;
            max-width: 400px !important;
            margin: 0 auto !important;
        }

        img {
            max-width: 100%;
            height: auto;
        }
    `;
    document.head.appendChild(mobileStyles);

    // --- Crear menú superior ---
    if (!document.getElementById('topMobileMenu')) {
        const topMenu = document.createElement('div');
        topMenu.id = 'topMobileMenu';
        topMenu.innerHTML = `
            <button data-page="dashboard" class="active">Dashboard</button>
            <button data-page="lineup">Alineación</button>
            <button data-page="market">Mercado</button>
            <button data-page="training">Entrenamiento</button>
            <button data-page="finance">Finanzas</button>
        `;
        document.body.prepend(topMenu);

        const switchMobilePage = (pageId) => {
            // Ocultar todas las páginas
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

            // Mostrar la página objetivo
            const targetPage = document.getElementById(pageId);
            if (!targetPage) return;

            // Usar switchPage si existe
            if (window.switchPage) {
                const menuButton = document.querySelector(`.menu-item[onclick*="${pageId}"]`);
                if(menuButton) {
                    window.switchPage(pageId, menuButton);
                    targetPage.classList.add('active');
                } else {
                    targetPage.classList.add('active');
                }
            } else {
                targetPage.classList.add('active');
            }

            // Scroll al top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        topMenu.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.getAttribute('data-page');

                // Actualizar botón activo
                topMenu.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Cambiar página
                switchMobilePage(page);
            });
        });
    }

    // --- Ajuste de pitch ---
    const resizePitchSlots = () => {
        document.querySelectorAll('.pitch-position-placeholder').forEach(slot => {
            const width = Math.min(window.innerWidth * 0.16, 80);
            const height = width * 0.75;
            slot.style.width = width + 'px';
            slot.style.height = height + 'px';
        });
    };
    window.addEventListener('resize', resizePitchSlots);
    resizePitchSlots();

    console.log('📱 Móvil: menú superior funcional, sidebar oculto, páginas exclusivas por botón');
})();
