// saved-games-manager.js  
(function() {  
    console.log('📦 Saved Games Manager cargando...');  
  
    // Crear modal para mostrar partidas guardadas  
    function createSavedGamesModal() {  
        const modal = document.createElement('div');  
        modal.id = 'savedGamesModal';  
        modal.className = 'modal';  
        modal.style.zIndex = '10001';  
        modal.innerHTML = `  
            <div class="modal-content">  
                <span class="close-button" onclick="window.closeSavedGamesModal()">&times;</span>  
                <h2>💾 Partidas Guardadas</h2>  
                <p id="savedGamesLoading" style="text-align: center;">Cargando partidas...</p>  
                <div id="savedGamesList"></div>  
                <p id="savedGamesEmpty" style="text-align: center; display: none;">No tienes partidas guardadas en la nube<br>Guarda tu primera partida usando el botón "💾 Guardar"</p>  
                <button class="btn btn-secondary" onclick="window.closeSavedGamesModal()">Cerrar</button>  
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
        modal.classList.add('active'); // Mostrar modal  
        document.getElementById('savedGamesLoading').style.display = 'block';  
        document.getElementById('savedGamesList').innerHTML = '';  
        document.getElementById('savedGamesEmpty').style.display = 'none';  
  
        // Verificar autenticación  
        if (!window.currentUserId) {  
            document.getElementById('savedGamesLoading').style.display = 'none';  
            document.getElementById('savedGamesList').innerHTML = `  
                <p style="color: red;">❌ Debes iniciar sesión para ver tus partidas guardadas en la nube</p>  
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
                <div class="saved-game-item">  
                    <h3>${game.name}</h3>  
                    <p>  
                        <strong>Equipo:</strong> ${game.team} |   
                        <strong>División:</strong> ${game.division || 'N/A'} |   
                        <strong>Jornada:</strong> ${game.week}  
                    </p>  
                    <p>📅 Guardada: ${new Date(game.lastSaved).toLocaleString('es-ES')}</p>  
                    <button class="btn btn-primary" onclick="window.loadGameFromCloudUI('${game.id}')">▶️ Cargar</button>  
                    <button class="btn btn-danger" onclick="window.deleteGameFromCloudUI('${game.id}', '${game.name}')">🗑️ Eliminar</button>  
                </div>  
            `).join('');  
        } catch (error) {  
            console.error('❌ Error cargando partidas:', error);  
            document.getElementById('savedGamesLoading').style.display = 'none';  
            document.getElementById('savedGamesList').innerHTML = `  
                <p style="color: red;">❌ Error al cargar las partidas: ${error.message}</p>  
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
            // Esperar a que Firebase esté listo  
            if (window.authReadyPromise) {  
                await window.authReadyPromise;  
            }  
            const result = await window.loadGameFromCloud(window.currentUserId, gameId);  
            if (result.success) {  
                alert('✅ Partida cargada correctamente');  
                // Refrescar UI  
                if (window.ui && window.gameLogic) {  
                    // *** MODIFICACIÓN CLAVE AQUÍ: Actualizar el gameState global antes de refrescar la UI ***  
                    window.gameLogic.updateGameState(result.data.gameState);  
                    window.ui.refreshUI(window.gameLogic.getGameState());  
                } else {  
                    console.warn('gameLogic o ui no disponibles después de cargar partida, recargando página.');  
                    location.reload(); // Recargar si los módulos principales no están accesibles  
                }  
                // Cerrar modal y cambiar a dashboard  
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
            alert('⚠️ Debes iniciar sesión para eliminar partidas');  
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
                loadBtn.style.background = '#0099ff'; // Un color distintivo para cargar  
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
  
    console.log('✅ Saved Games Manager cargado correctamente');  
})();  
