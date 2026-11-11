// ============================================
// injector-lineup-mobile.js
// Reposiciona los slots de alineacion en movil
// para que cuadren con el campo rotado 90deg.
// Se ejecuta tras cada renderLineupPageUI(),
// por lo que funciona con cualquier tactica.
// No toca logica de juego ni style.css.
// ============================================

(function() {

    function reposicionarSlots() {
        // Solo actuar en movil (mismo criterio que pcf-mobile.css)
        if (!window.matchMedia('(max-width:767px), (max-height:500px) and (max-width:1100px)').matches) return;

        var slots = document.querySelectorAll('.pitch-position-placeholder');
        if (!slots.length) return;

        // El campo original usa:
        //   left = posData.y * (100/8) + offset   -> y = profundidad (0=portero, 6=delantera)
        //   top  = posData.x * (100/5) + offset   -> x = columna (0-4)
        //   slotWidth  = 18%
        //   slotHeight = 10%
        //
        // Con el campo rotado 90deg (portero arriba, delantero abajo):
        //   new top  = left_original          -> la profundidad pasa a ser top
        //   new left = 100 - top_original - slotHeight_como_width
        //
        // En el campo rotado, ancho y alto del slot tambien se intercambian:
        //   new width  = slotHeight original = 10%  -> pero queremos mas ancho, usamos 22%
        //   new height = slotWidth original  = 18%  -> pero queremos mas alto, usamos 12%

        slots.forEach(function(slot) {
            // Se parte SIEMPRE de los valores originales (guardados la primera vez):
            // asi repetir la funcion (resize, giro, barra de direcciones) no los transforma de nuevo.
            if (slot.dataset.pcfL === undefined) {
                slot.dataset.pcfL = slot.style.left;
                slot.dataset.pcfT = slot.style.top;
            }
            var leftOrig = parseFloat(slot.dataset.pcfL);   // % en campo horizontal
            var topOrig  = parseFloat(slot.dataset.pcfT);   // % en campo horizontal

            // Transformar coordenadas para campo vertical
            var newTop  = leftOrig;
            // El CENTRO del hueco original (en vertical) es topOrig + 5 (la mitad de su alto, 10 %); al girar el campo pasa a ser
            // 100 - (topOrig + 5) en horizontal, y el hueco nuevo mide 18 % de ancho, así que su borde izquierdo es ese centro - 9.
            // (Antes se restaba 18 en vez de 5 + 9 = 14: todo salía corrido ~4 % a la izquierda y la columna extrema se aplastaba contra el borde.)
            var newLeft = 100 - topOrig - 5 - 9;

            // Que no se salgan del campo
            newLeft = Math.max(1, Math.min(newLeft, 81));
            newTop  = Math.max(1, Math.min(newTop,  88));

            slot.style.left   = newLeft + '%';
            slot.style.top    = newTop  + '%';
            slot.style.width  = '18%';
            slot.style.height = '11%';
        });
    }

    // Hook sobre renderLineupPageUI
    var _orig = null;
    var interval = setInterval(function() {
        if (window.renderLineupPageUI && window.renderLineupPageUI !== _orig) {
            _orig = window.renderLineupPageUI;
            window.renderLineupPageUI = function() {
                _orig.apply(this, arguments);
                // Reposicionar tras el render (pequeño delay para que el DOM este listo)
                setTimeout(reposicionarSlots, 30);
            };
            clearInterval(interval);
            console.log('\u2705 injector-lineup-mobile: hook aplicado');
        }
    }, 300);

    // Tambien reposicionar si cambia el tamano de ventana
    window.addEventListener('resize', function() {
        setTimeout(reposicionarSlots, 50);
    });

})();
