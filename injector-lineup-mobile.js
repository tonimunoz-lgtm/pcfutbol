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
        // Solo actuar en movil
        if (window.innerWidth > 640) return;

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
            var leftOrig = parseFloat(slot.style.left);   // % en campo horizontal
            var topOrig  = parseFloat(slot.style.top);    // % en campo horizontal

            // Transformar coordenadas para campo vertical
            var newTop  = leftOrig;
            var newLeft = 100 - topOrig - 18; // 18 = slotHeight original en %

            // Ajuste fino para que queden centrados y no se salgan
            newLeft = Math.max(1, Math.min(newLeft, 78));
            newTop  = Math.max(1, Math.min(newTop,  88));

            slot.style.left   = newLeft + '%';
            slot.style.top    = newTop  + '%';
            slot.style.width  = '20%';
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
