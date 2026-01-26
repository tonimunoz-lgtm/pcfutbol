// injector-player-arrows.js
(function() {
    const originalRenderAttributes = window.renderPlayerAttributes || function(player, containerId) {};

    window.renderPlayerAttributes = function(player, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        ATTRIBUTES.forEach(attr => {
            const prevValue = player.previousAttributes ? player.previousAttributes[attr] || 0 : 0;
            const currentValue = player[attr] || 0;
            const upArrow = currentValue > prevValue ? ' <span style="color:green; font-size:0.8em;">&#9650;</span>' : '';
            container.innerHTML += `<li>${attr}: ${currentValue}${upArrow}</li>`;
        });
        // Guardar valores actuales para comparaciones futuras
        player.previousAttributes = { ...player };
    };
})();
