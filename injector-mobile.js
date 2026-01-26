// == Injector Móvil Premium ==
(function() {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;
    console.log('🌟 Modo Móvil Activado');

    // Agregar clase body mobile
    document.body.classList.add('mobile-mode');

    // Estilos generales
    const style = document.createElement('style');
    style.textContent = `
        /* Botones más grandes y fáciles de tocar */
        .btn { 
            padding: 12px 20px !important; 
            font-size: 1.1em !important; 
            width: 100% !important; 
        }

        /* Modales a pantalla completa con bordes redondeados */
        .modal {
            width: 95% !important;
            height: 90% !important;
            top: 5% !important;
            left: 2.5% !important;
            border-radius: 10px;
            padding: 15px;
            overflow-y: auto;
        }

        /* Listas desplazables táctiles */
        #reservesList, #marketList, #staffCandidatesList {
            max-height: 300px;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        }

        /* Texto más legible */
        body, .page, .pitch-player, .draggable-player, .staff-candidate {
            font-size: 14px !important;
        }

        /* Pitch y draggables más grandes para dedos */
        .pitch-player, .draggable-player {
            min-height: 50px !important;
            font-size: 1em !important;
            padding: 8px !important;
        }

        /* Imagen del estadio centrada y responsiva */
        #stadiumImageContainer img {
            max-width: 100%;
            height: auto;
            border-radius: 10px;
            display: block;
            margin: 10px auto;
        }

        /* Inputs y sliders más grandes */
        input, select {
            font-size: 1em !important;
            padding: 8px !important;
        }

        /* Mensajes y alertas más visibles */
        .alert {
            font-size: 0.95em !important;
            padding: 8px !important;
        }

        /* Ajuste de la alineación en pantalla pequeña */
        #pitchContainer {
            min-height: 400px;
            position: relative;
        }
        .pitch-position-placeholder {
            font-size: 0.8em !important;
        }

        /* Aumentar hitbox de los elementos táctiles */
        .draggable-player:hover, .pitch-player:hover, .btn:hover {
            transform: scale(1.02);
            transition: 0.2s;
        }
    `;
    document.head.appendChild(style);

    // Función para actualizar draggables dinámicamente
    function enlargeDraggables() {
        document.querySelectorAll('.draggable-player, .pitch-player').forEach(div => {
            div.style.minHeight = '50px';
            div.style.fontSize = '1em';
            div.style.padding = '8px';
        });
    }
    enlargeDraggables();

    // Observar cambios dinámicos (por ejemplo, al renderizar la alineación)
    const observer = new MutationObserver(enlargeDraggables);
    observer.observe(document.body, { childList: true, subtree: true });

    console.log('✅ Inyector móvil cargado y aplicado.');
})();
