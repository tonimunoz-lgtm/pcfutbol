// injector-mobile.js
(function() {
    console.log('🚀 Injector Mobile cargado');

    // --- Estilos CSS responsivos ---
    const mobileStyles = document.createElement('style');
    mobileStyles.id = 'mobile-injector-styles';
    mobileStyles.innerHTML = `
        /* Contenedor principal a pantalla completa y centrado */
        body, html {
            width: 100% !important;
            height: 100% !important;
            margin: 0;
            padding: 0;
            overflow-x: hidden;
            font-size: 16px;
            font-family: Arial, sans-serif;
        }

        /* Hacer que las páginas ocupen todo el ancho y se centren */
        .page {
            width: 100% !important;
            max-width: 100vw;
            padding: 10px;
            box-sizing: border-box;
        }

        /* Contenedor principal tipo flex para centrado */
        #dashboard, #lineupContainer, #marketContainer, #trainingContainer, #financeContainer {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
        }

        /* Ajustar botones y inputs para touch */
        button, input, select {
            font-size: 1rem !important;
            padding: 0.6em 1em !important;
            margin: 5px 0 !important;
        }

        /* Pitch responsivo */
        #pitchContainer {
            width: 95vw !important;
            max-width: 500px;
            height: auto !important;
            position: relative;
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            margin-bottom: 15px;
        }

        .pitch-position-placeholder {
            width: 18vw !important;
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
            text-align: center;
            font-size: 0.7rem;
            flex-direction: column;
        }

        .pitch-player {
            font-size: 0.65rem;
            text-align: center;
            cursor: grab;
            margin: 2px 0;
        }

        #reservesList {
            width: 95vw !important;
            max-width: 500px;
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 5px;
        }

        .draggable-player {
            padding: 5px;
            background: rgba(0,0,0,0.05);
            border-radius: 4px;
            font-size: 0.75rem;
            min-width: 80px;
            text-align: center;
        }

        /* Modales responsivos */
        .modal-content {
            width: 90vw !important;
            max-width: 450px !important;
            margin: 0 auto !important;
        }

        /* Menú inferior flotante */
        #bottomMenu {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            display: flex;
            justify-content: space-around;
            background: rgba(0,0,0,0.85);
            padding: 8px 0;
            z-index: 9999;
        }

        #bottomMenu button {
            flex: 1;
            margin: 0 2px;
            font-size: 0.85rem;
        }

        /* Ajustar tablas, listas y sliders */
        table, ul, ol {
            width: 95% !important;
            overflow-x: auto;
        }

        /* Ajuste de imágenes */
        img {
            max-width: 100%;
            height: auto;
            display: block;
        }
    `;
    document.head.appendChild(mobileStyles);

    // --- Crear menú inferior si no existe ---
    if (!document.getElementById('bottomMenu')) {
        const bottomMenu = document.createElement('div');
        bottomMenu.id = 'bottomMenu';
        bottomMenu.innerHTML = `
            <button onclick="switchPage('dashboard', this)">Dashboard</button>
            <button onclick="switchPage('lineup', this)">Alineación</button>
            <button onclick="switchPage('market', this)">Mercado</button>
            <button onclick="switchPage('training', this)">Entrenamiento</button>
            <button onclick="switchPage('finance', this)">Finanzas</button>
        `;
        document.body.appendChild(bottomMenu);
    }

    // --- Ajuste dinámico de pitch y elementos al redimensionar ---
    window.addEventListener('resize', () => {
        document.querySelectorAll('.pitch-position-placeholder').forEach(slot => {
            const width = Math.min(window.innerWidth * 0.18, 80);
            const height = width * 0.65;
            slot.style.width = width + 'px';
            slot.style.height = height + 'px';
        });
    });

    console.log('📱 UI móvil adaptativa activada');
})();
