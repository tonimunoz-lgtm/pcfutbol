// injector-budget.js
(function() {
    const CATEGORY_BUDGETS = {
        'primera': 50_000_000,
        'segunda': 20_000_000,
        'rfef_grupo1': 5_000_000,
        'rfef_grupo2': 5_000_000
    };
    
    // Interceptar cuando se selecciona un equipo
    const originalSelectTeam = window.gameLogic?.selectTeamWithInitialSquad;
    if (originalSelectTeam) {
        window.gameLogic.selectTeamWithInitialSquad = function(teamName, divisionType, gameMode) {
            // Llamar a la función original
            const result = originalSelectTeam.call(this, teamName, divisionType, gameMode);
            
            // Modificar el presupuesto según la división
            const state = window.gameLogic.getGameState();
            state.balance = CATEGORY_BUDGETS[divisionType] || state.balance;
            window.gameLogic.updateGameState(state);
            
            console.log(`Presupuesto inyectado para ${teamName} en ${divisionType}: ${state.balance.toLocaleString()}€`);
            return result;
        };
    }
})();
