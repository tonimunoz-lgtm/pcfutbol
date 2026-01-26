// injector-player-arrows.js
(function() {
    // Esperar a que la UI esté cargada
    window.addEventListener('DOMContentLoaded', () => {
        // Guardar atributos anteriores al aplicar entrenamiento
        const originalApplyTraining = window.gameLogic?.applyWeeklyTraining;
        if (originalApplyTraining) {
            window.gameLogic.applyWeeklyTraining = function() {
                const state = window.gameLogic.getGameState();
                const playerIndex = state.trainingFocus.playerIndex;
                
                if (playerIndex >= 0 && playerIndex < state.squad.length) {
                    const player = state.squad[playerIndex];
                    // Guardar valores anteriores
                    if (!player.previousAttributes) {
                        player.previousAttributes = {};
                    }
                    ATTRIBUTES.forEach(attr => {
                        player.previousAttributes[attr] = player[attr] || 0;
                    });
                }
                
                // Llamar a la función original
                return originalApplyTraining.call(this);
            };
        }
        
        console.log('✓ Player arrows injector loaded');
    });
})();
