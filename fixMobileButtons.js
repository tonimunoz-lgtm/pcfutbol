// ===============================
// fixMobileButtons.js
// Asegura que todos los botones respondan en móviles
// ===============================

document.addEventListener("DOMContentLoaded", function () {

    // Seleccionamos todos los botones interactivos
    const buttons = document.querySelectorAll("button, .btn, .menu-button, .center-option");

    buttons.forEach(button => {
        // Añadimos efecto visual de toque
        button.addEventListener("touchstart", () => {
            button.style.transform = "scale(0.97)";
            button.style.boxShadow = "0 2px 6px rgba(0,0,0,0.4)";
        });

        button.addEventListener("touchend", () => {
            button.style.transform = "scale(1)";
            button.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
        });

        // Previene que elementos superpuestos bloqueen el click
        button.addEventListener("click", (e) => {
            e.stopPropagation(); // evita que padres intercepten
        });
    });

    // Detecta modales y páginas dinámicas
    const observer = new MutationObserver(() => {
        const dynamicButtons = document.querySelectorAll("button, .btn, .menu-button, .center-option");
        dynamicButtons.forEach(btn => {
            if (!btn.dataset.touchReady) {
                btn.dataset.touchReady = "true";

                btn.addEventListener("touchstart", () => {
                    btn.style.transform = "scale(0.97)";
                    btn.style.boxShadow = "0 2px 6px rgba(0,0,0,0.4)";
                });

                btn.addEventListener("touchend", () => {
                    btn.style.transform = "scale(1)";
                    btn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
                });

                btn.addEventListener("click", (e) => {
                    e.stopPropagation();
                });
            }
        });
    });

    // Observamos todo el body por cambios (modales, páginas, listas dinámicas)
    observer.observe(document.body, { childList: true, subtree: true });

});
