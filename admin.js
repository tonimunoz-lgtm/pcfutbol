// admin.js
window.adminBackend = {
    updateTeamBudget(teamName, newBudget) {
        const state = gameLogic.getGameState();
        const team = state.teams.find(t => t.name === teamName);
        if (!team) return { success: false, message: 'Equipo no encontrado' };
        team.budget = newBudget;
        gameLogic.updateGameState(state);
        return { success: true, message: `Presupuesto de ${teamName} actualizado a ${newBudget.toLocaleString()}€` };
    },

    updateStadiumCapacity(teamName, newCapacity) {
        const state = gameLogic.getGameState();
        const team = state.teams.find(t => t.name === teamName);
        if (!team) return { success: false, message: 'Equipo no encontrado' };
        team.stadiumCapacity = newCapacity;
        gameLogic.updateGameState(state);
        return { success: true, message: `Aforo de ${teamName} actualizado a ${newCapacity}` };
    },

    uploadTeamLogo(teamName, fileInputId) {
        const file = document.getElementById(fileInputId).files[0];
        if (!file) return { success: false, message: 'No se seleccionó archivo' };
        const reader = new FileReader();
        reader.onload = function(e) {
            const state = gameLogic.getGameState();
            const team = state.teams.find(t => t.name === teamName);
            if (team) {
                team.logo = e.target.result; // base64
                gameLogic.updateGameState(state);
            }
        };
        reader.readAsDataURL(file);
        return { success: true, message: 'Logo cargado correctamente' };
    },

    uploadStadiumImage(teamName, fileInputId) {
        const file = document.getElementById(fileInputId).files[0];
        if (!file) return { success: false, message: 'No se seleccionó archivo' };
        const reader = new FileReader();
        reader.onload = function(e) {
            const state = gameLogic.getGameState();
            const team = state.teams.find(t => t.name === teamName);
            if (team) {
                team.stadiumImage = e.target.result; // base64
                gameLogic.updateGameState(state);
            }
        };
        reader.readAsDataURL(file);
        return { success: true, message: 'Imagen del estadio cargada correctamente' };
    }
};
