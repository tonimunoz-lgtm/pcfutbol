// injector-admin.js
(function() {
    window.openAdminPanel = function() {
        if (!window.currentUser || window.currentUser.role !== 'admin') {
            alert('No tienes permisos de administrador');
            return;
        }
        
        // Crear modal si no existe
        if (!document.getElementById('adminModal')) {
            const modal = document.createElement('div');
            modal.id = 'adminModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 600px;">
                    <span class="modal-close" onclick="document.getElementById('adminModal').classList.remove('active')">&times;</span>
                    <h1>🔧 Panel de Administración</h1>
                    
                    <h2>Finanzas</h2>
                    <div style="margin-bottom: 20px;">
                        <label>Dinero del equipo:</label>
                        <input id="adminBalance" type="number" step="1000">
                        <button class="btn btn-sm" onclick="window.adminBackend.updateBalance()">Actualizar</button>
                    </div>
                    
                    <h2>Instalaciones</h2>
                    <div style="margin-bottom: 20px;">
                        <label>Capacidad del estadio:</label>
                        <input id="adminStadiumCapacity" type="number" step="1000">
                        <button class="btn btn-sm" onclick="window.adminBackend.updateCapacity()">Actualizar</button>
                    </div>
                    
                    <h2>Popularidad</h2>
                    <div style="margin-bottom: 20px;">
                        <label>Popularidad (0-100):</label>
                        <input id="adminPopularity" type="number" min="0" max="100">
                        <button class="btn btn-sm" onclick="window.adminBackend.updatePopularity()">Actualizar</button>
                    </div>
                    
                    <h2>Jornada</h2>
                    <div style="margin-bottom: 20px;">
                        <label>Semana actual:</label>
                        <input id="adminWeek" type="number" min="1" max="38">
                        <button class="btn btn-sm" onclick="window.adminBackend.updateWeek()">Actualizar</button>
                    </div>
                    
                    <button class="btn" onclick="window.adminBackend.refreshPanel()">Recargar Datos</button>
                    <button class="btn" style="background: #c73446;" onclick="document.getElementById('adminModal').classList.remove('active')">Cerrar</button>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        // Cargar datos actuales
        window.adminBackend.refreshPanel();
        document.getElementById('adminModal').classList.add('active');
    };

    window.adminBackend = {
        refreshPanel: function() {
            if (!window.gameLogic) return;
            const state = window.gameLogic.getGameState();
            
            document.getElementById('adminBalance').value = state.balance || 0;
            document.getElementById('adminStadiumCapacity').value = state.stadiumCapacity || 0;
            document.getElementById('adminPopularity').value = state.popularity || 0;
            document.getElementById('adminWeek').value = state.week || 1;
        },
        
        updateBalance: function() {
            const newBalance = parseInt(document.getElementById('adminBalance').value);
            if (isNaN(newBalance)) return alert('Valor inválido');
            
            const state = window.gameLogic.getGameState();
            state.balance = newBalance;
            window.gameLogic.updateGameState(state);
            window.ui?.refreshUI(state);
            
            alert(`Presupuesto actualizado a ${newBalance.toLocaleString('es-ES')}€`);
        },
        
        updateCapacity: function() {
            const newCapacity = parseInt(document.getElementById('adminStadiumCapacity').value);
            if (isNaN(newCapacity)) return alert('Valor inválido');
            
            const state = window.gameLogic.getGameState();
            state.stadiumCapacity = newCapacity;
            window.gameLogic.updateGameState(state);
            window.ui?.refreshUI(state);
            
            alert(`Capacidad actualizada a ${newCapacity.toLocaleString('es-ES')} espectadores`);
        },
        
        updatePopularity: function() {
            const newPop = parseInt(document.getElementById('adminPopularity').value);
            if (isNaN(newPop) || newPop < 0 || newPop > 100) return alert('Valor inválido (0-100)');
            
            const state = window.gameLogic.getGameState();
            state.popularity = newPop;
            window.gameLogic.updateGameState(state);
            window.ui?.refreshUI(state);
            
            alert(`Popularidad actualizada a ${newPop}%`);
        },
        
        updateWeek: function() {
            const newWeek = parseInt(document.getElementById('adminWeek').value);
            if (isNaN(newWeek) || newWeek < 1) return alert('Valor inválido');
            
            const state = window.gameLogic.getGameState();
            state.week = newWeek;
            window.gameLogic.updateGameState(state);
            window.ui?.refreshUI(state);
            
            alert(`Semana actualizada a ${newWeek}`);
        }
    };
})();
