// injector-admin.js
(function() {
    window.openAdminPanel = function() {
        // Crear modal si no existe
        if (!document.getElementById('adminModal')) {
            const modal = document.createElement('div');
            modal.id = 'adminModal';
            modal.style.position = 'fixed';
            modal.style.top = '50%';
            modal.style.left = '50%';
            modal.style.transform = 'translate(-50%, -50%)';
            modal.style.background = '#fff';
            modal.style.border = '2px solid #000';
            modal.style.padding = '20px';
            modal.style.zIndex = 9999;
            modal.innerHTML = `
                <h2>Panel de Administración</h2>
                <div>
                    <label>Equipo: <input id="adminTeamName" type="text" placeholder="Nombre del equipo"></label>
                </div>
                <div>
                    <label>Presupuesto: <input id="adminTeamBudget" type="number"></label>
                    <button onclick="window.adminBackend.updateBudget()">Actualizar</button>
                </div>
                <div>
                    <label>Aforo estadio: <input id="adminStadiumCapacity" type="number"></label>
                    <button onclick="window.adminBackend.updateCapacity()">Actualizar</button>
                </div>
                <div>
                    <label>Logo: <input id="adminLogoUpload" type="file" accept=".png"></label>
                    <button onclick="window.adminBackend.uploadLogo()">Subir</button>
                </div>
                <div>
                    <label>Foto estadio: <input id="adminStadiumUpload" type="file" accept=".png"></label>
                    <button onclick="window.adminBackend.uploadStadium()">Subir</button>
                </div>
                <button onclick="document.getElementById('adminModal').style.display='none'">Cerrar</button>
            `;
            document.body.appendChild(modal);
        }
        document.getElementById('adminModal').style.display = 'block';
    };

    window.adminBackend = {
        updateBudget: function() {
            const name = document.getElementById('adminTeamName').value;
            const budget = parseInt(document.getElementById('adminTeamBudget').value);
            const state = gameLogic.getGameState();
            const team = state.teams.find(t => t.name === name);
            if (team) {
                team.budget = budget;
                gameLogic.updateGameState(state);
                alert(`Presupuesto de ${name} actualizado a ${budget.toLocaleString()}€`);
            } else alert('Equipo no encontrado');
        },
        updateCapacity: function() {
            const name = document.getElementById('adminTeamName').value;
            const capacity = parseInt(document.getElementById('adminStadiumCapacity').value);
            const state = gameLogic.getGameState();
            const team = state.teams.find(t => t.name === name);
            if (team) {
                team.stadiumCapacity = capacity;
                gameLogic.updateGameState(state);
                alert(`Aforo de ${name} actualizado a ${capacity}`);
            } else alert('Equipo no encontrado');
        },
        uploadLogo: function() {
            const fileInput = document.getElementById('adminLogoUpload');
            const file = fileInput.files[0];
            if (!file) return alert('Selecciona un archivo');
            const reader = new FileReader();
            reader.onload = function(e) {
                const state = gameLogic.getGameState();
                const name = document.getElementById('adminTeamName').value;
                const team = state.teams.find(t => t.name === name);
                if (team) {
                    team.logo = e.target.result;
                    gameLogic.updateGameState(state);
                    alert('Logo cargado correctamente');
                } else alert('Equipo no encontrado');
            };
            reader.readAsDataURL(file);
        },
        uploadStadium: function() {
            const fileInput = document.getElementById('adminStadiumUpload');
            const file = fileInput.files[0];
            if (!file) return alert('Selecciona un archivo');
            const reader = new FileReader();
            reader.onload = function(e) {
                const state = gameLogic.getGameState();
                const name = document.getElementById('adminTeamName').value;
                const team = state.teams.find(t => t.name === name);
                if (team) {
                    team.stadiumImage = e.target.result;
                    gameLogic.updateGameState(state);
                    alert('Imagen del estadio cargada correctamente');
                } else alert('Equipo no encontrado');
            };
            reader.readAsDataURL(file);
        }
    };
})();
