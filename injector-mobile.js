// injector-supermobile.js
(function() {
    console.log('🚀 Injector Super Mobile activado');

    // --- Detectar móvil/tableta ---
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent);
    if (!isMobile) return; // Solo aplicar en móviles/tabletas

    // --- Estilos profesionales móviles ---
    const style = document.createElement('style');
    style.innerHTML = `
        body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            font-family: Arial, sans-serif;
            overflow-x: hidden;
            background: #111;
            color: #fff;
        }

        /* Ocultar barras originales */
        #sidebar, #superos, .sidebar, .top-bar { display: none !important; }

        /* Menú superior fijo */
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
            box-shadow: 0 2px 10px rgba(0,0,0,0.5);
        }
        #topMobileMenu button {
            flex: 1;
            margin: 0 3px;
            font-size: 1rem;
            padding: 12px 0;
            color: #fff;
            background: rgba(255,255,255,0.1);
            border: none;
            border-radius: 5px;
            font-weight: bold;
        }
        #topMobileMenu button.active {
            background: #fff;
            color: #e94560;
        }

        /* Páginas adaptadas */
        .page {
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            width: 95vw;
            max-width: 480px;
            margin: 70px auto 20px auto; /* espacio para menú superior */
            padding: 10px;
            box-sizing: border-box;
            overflow-y: auto;
        }
        .page.active {
            display: flex;
        }

        /* Inputs y botones grandes */
        input, select, button {
            font-size: 1rem !important;
            padding: 10px !important;
            margin: 5px 0 !important;
        }

        /* Pitch adaptado */
        #pitchContainer {
            width: 90vw !important;
            max-width: 450px;
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            position: relative;
            margin: 15px 0;
        }
        .pitch-position-placeholder {
            width: 16vw !important;
            height: 12vw !important;
            min-width: 60px;
            min-height: 45px;
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
    document.head.appendChild(style);

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

        const switchPageMobile = (pageId) => {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const targetPage = document.getElementById(pageId);
            if (!targetPage) return;

            if (window.switchPage) {
                const menuBtn = document.querySelector(`.menu-item[onclick*="${pageId}"]`);
                if(menuBtn) window.switchPage(pageId, menuBtn);
            }

            targetPage.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        topMenu.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                topMenu.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                switchPageMobile(btn.getAttribute('data-page'));
            });
        });
    }

    // --- Ajuste dinámico del pitch ---
    const resizePitch = () => {
        document.querySelectorAll('.pitch-position-placeholder').forEach(slot => {
            const width = Math.min(window.innerWidth * 0.16, 80);
            const height = width * 0.75;
            slot.style.width = width + 'px';
            slot.style.height = height + 'px';
        });
    };
    window.addEventListener('resize', resizePitch);
    resizePitch();

    console.log('📱 SuperDisplay Mobile listo');
})();
