// saved-games-manager.js
(function() {
    console.log('💾 Saved Games Manager cargando...');

    // Crear modal para mostrar partidas guardadas
    function createSavedGamesModal() {
        const modal = document.createElement('div');
        modal.id = 'savedGamesModal';
        modal.className = 'modal';
        modal.style.zIndex = '10001';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <span class="modal-close" onclick="window.closeSavedGamesModal()">&times;</span>
                <h1 style="color: #e94560; margin-bottom: 20px;">💾 Partidas Guardadas</h1>
                
                <div id="savedGamesLoading" style="text-align: center; padding: 40px; display: none;">
                    <p style="color: #e94560; font-size: 1.2em;">⏳ Cargando partidas...</p>
                </div>

                <div id="savedGamesList" style="max-height: 500px; overflow-y: auto;">
                    <!-- Las partidas se cargarán aquí -->
                </div>

                <div id="savedGamesEmpty" style="display: none; text-align: center; padding: 40px;">
                    <p style="color: #999; font-size: 1.1em;">No tienes partidas guardadas en la nube</p>
                    <p style="color: #666; margin-top: 10px;">Guarda tu primera partida usando el botón "💾 Guardar"</p>
                </div>

                <button class="btn" onclick="window.closeSavedGamesModal()" style="margin-top: 20px; background: #c73446;">
                    Cerrar
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Abrir modal de partidas guardadas
    window.openSavedGamesModal = async function() {
        let modal = document.getElementById('savedGamesModal');
        if (!modal) {
            createSavedGamesModal();
            modal = document.getElementById('savedGamesModal');
        }

        modal.classList.add('active');
        
        // Mostrar loading
        document.getElementById('savedGamesLoading').style.display = 'block';
        document.getElementById('savedGamesList').innerHTML = '';
        document.getElementById('savedGamesEmpty').style.display = 'none';

        // Verificar autenticación
        if (!window.currentUserId) {
            document.getElementById('savedGamesLoading').style.display = 'none';
            document.getElementById('savedGamesList').innerHTML = `
                <div class="alert alert-error" style="margin: 20px;">
                    ❌ Debes iniciar sesión para ver tus partidas guardadas en la nube
                </div>
            `;
            return;
        }

        try {
            // Esperar a que Firebase esté listo
            if (window.authReadyPromise) {
                await window.authReadyPromise;
            }

            // Cargar partidas
            const games = await window.loadUserSavedGames(window.currentUserId);
            
            document.getElementById('savedGamesLoading').style.display = 'none';

            if (!games || games.length === 0) {
                document.getElementById('savedGamesEmpty').style.display = 'block';
                return;
            }

            // Ordenar por fecha (más recientes primero)
            games.sort((a, b) => b.lastSaved - a.lastSaved);

            // Renderizar lista de partidas
            const gamesList = document.getElementById('savedGamesList');
            gamesList.innerHTML = games.map(game => `
                <div class="saved-game-item" style="
                    background: rgba(233, 69, 96, 0.1);
                    border: 1px solid #e94560;
                    padding: 20px;
                    margin-bottom: 15px;
                    border-radius: 5px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <div style="flex: 1;">
                        <h3 style="color: #00ff00; margin-bottom: 10px;">${game.name}</h3>
                        <p style="margin-bottom: 5px;">
                            <strong>Equipo:</strong> ${game.team} | 
                            <strong>División:</strong> ${game.gameState.division || 'N/A'} | 
                            <strong>Jornada:</strong> ${game.week}
                        </p>
                        <p style="color: #999; font-size: 0.9em;">
                            📅 Guardada: ${new Date(game.lastSaved).toLocaleString('es-ES')}
                        </p>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 10px; min-width: 120px;">
                        <button class="btn btn-sm" onclick="window.loadGameFromCloudUI('${game.id}')" style="background: #00ff00; color: #000;">
                            ▶️ Cargar
                        </button>
                        <button class="btn btn-sm" onclick="window.deleteGameFromCloudUI('${game.id}', '${game.name}')" style="background: #ff3333;">
                            🗑️ Eliminar
                        </button>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('❌ Error cargando partidas:', error);
            document.getElementById('savedGamesLoading').style.display = 'none';
            document.getElementById('savedGamesList').innerHTML = `
                <div class="alert alert-error" style="margin: 20px;">
                    ❌ Error al cargar las partidas: ${error.message}
                </div>
            `;
        }
    };

    // Cerrar modal
    window.closeSavedGamesModal = function() {
        const modal = document.getElementById('savedGamesModal');
        if (modal) {
            modal.classList.remove('active');
        }
    };

 // Cargar partida desde la nube  
window.loadGameFromCloudUI = async function(gameId) {  
    if (!window.currentUserId) {  
        alert('⚠️ Debes iniciar sesión para cargar partidas');  
        return;  
    }  
    if (!confirm('¿Seguro que quieres cargar esta partida? Se perderá el progreso actual no guardado.')) {  
        return;  
    }  
    try {  
        if (window.authReadyPromise) {  
            await window.authReadyPromise;  
        }  
        const result = await window.loadGameFromCloud(window.currentUserId, gameId);  
        if (result.success) {  
            alert('✅ Partida cargada correctamente');  
            // Refrescar UI DE LA PARTIDA ACTUALMENTE CARGADA  
            if (window.ui && window.gameLogic) {  
                // Actualizar el estado global del juego con los datos cargados  
                window.gameLogic.updateGameState(result.data.gameState);  
                window.ui.refreshUI(window.gameLogic.getGameState());  
            } else {  
                // Si gameLogic o ui no están disponibles, recargar la página para asegurar la inicialización  
                console.warn('gameLogic o ui no disponibles después de cargar partida, recargando página.');  
                location.reload();  
            }  
            window.closeSavedGamesModal();  
            const dashboardButton = document.querySelector('.menu-item[onclick="window.switchPage(\'dashboard\', this)"]');  
            if (dashboardButton) {  
                window.switchPage('dashboard', dashboardButton);  
            }  
        } else {  
            alert('❌ Error al cargar la partida: ' + (result.message || result.error));  
        }  
    } catch (error) {  
        console.error('❌ Error cargando partida:', error);  
        alert('❌ Error al cargar la partida: ' + error.message);  
    }  
};  

    // Eliminar partida de la nube
    window.deleteGameFromCloudUI = async function(gameId, gameName) {
        if (!window.currentUserId) {
            alert('❌ Debes iniciar sesión para eliminar partidas');
            return;
        }

        if (!confirm(`¿Seguro que quieres eliminar la partida "${gameName}"? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            // Esperar a que Firebase esté listo
            if (window.authReadyPromise) {
                await window.authReadyPromise;
            }

            const result = await window.deleteGameFromCloud(window.currentUserId, gameId);
            
            if (result.success) {
                alert('✅ Partida eliminada correctamente');
                // Recargar lista de partidas
                window.openSavedGamesModal();
            } else {
                alert('❌ Error al eliminar la partida: ' + (result.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('❌ Error eliminando partida:', error);
            alert('❌ Error al eliminar la partida: ' + error.message);
        }
    };

    // Añadir botón "Cargar de la Nube" al header
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            const headerInfo = document.querySelector('.header-info');
            if (headerInfo && !document.getElementById('loadFromCloudBtn')) {
                const loadBtn = document.createElement('button');
                loadBtn.id = 'loadFromCloudBtn';
                loadBtn.className = 'btn btn-sm';
                loadBtn.innerHTML = '☁️ Cargar';
                loadBtn.onclick = () => window.openSavedGamesModal();
                loadBtn.style.background = '#0099ff';
                
                // Insertar después del botón "Guardar"
                const saveBtn = document.querySelector('button[onclick="window.saveCurrentGame()"]');
                if (saveBtn) {
                    saveBtn.parentNode.insertBefore(loadBtn, saveBtn.nextSibling);
                } else {
                    headerInfo.appendChild(loadBtn);
                }
            }
        }, 1000);
    });

    console.log('✓ Saved Games Manager cargado correctamente');
})();
