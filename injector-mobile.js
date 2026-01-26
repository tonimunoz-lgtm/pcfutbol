// injector-mobile.js
(function() {
    console.log('🚀 Injector Mobile cargado');

    // --- Estilos CSS responsivos para móvil ---
    const mobileStyles = document.createElement('style');
    mobileStyles.id = 'mobile-injector-styles';
    mobileStyles.innerHTML = `
        /* Reset y layout base */
        body, html {
            width: 100% !important;
            height: 100% !important;
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            overflow-x: hidden;
            background: #111;
            color: #fff;
        }

        /* Esconder barra lateral y superos */
        #sidebar, #superos { display: none !important; }

        /* Menú superior para móvil */
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

        /* Páginas centradas y grandes */
        .page {
            width: 95vw !important;
            max-width: 480px;
            margin: 60px auto 20px auto; /* margen superior para el menú */
            padding: 10px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }

        /* Ajuste general de botones, inputs, selects */
        button, input, select {
            font-size: 1rem !important;
            padding: 10px !important;
            margin: 5px 0 !important;
        }

        /* Pitch responsivo y centrado */
        #pitchContainer {
            width: 90vw !important;
            max-width: 450px;
            height: auto !important;
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

        /* Modales centrados y responsivos */
        .modal-content {
            width: 90vw !important;
            max-width: 400px !important;
            margin: 0 auto !important;
        }

        /* Imágenes */
        img {
            max-width: 100%;
            height: auto;
        }
    `;
    document.head.appendChild(mobileStyles);

    // --- Crear menú superior si no existe ---
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

        // Funcionalidad de botones
        topMenu.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.getAttribute('data-page');
                // Activar/desactivar estilos de botones
                topMenu.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // Mostrar la página
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                const target = document.getElementById(page);
                if(target) target.classList.add('active');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }

    // --- Ajuste dinámico de pitch ---
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

    console.log('📱 UI móvil rediseñada: menú superior, contenido centrado y grande');
})();
