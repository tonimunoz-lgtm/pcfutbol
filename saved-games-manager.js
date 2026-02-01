// saved-games-manager.js  
(function() {  
    console.log('📦 Saved Games Manager cargando...'); // Corregido el carácter  
  
    function createSavedGamesModal() {  
        const modal = document.createElement('div');  
        modal.id = 'savedGamesModal';  
        modal.className = 'modal';  
        modal.style.zIndex = '10001';  
        modal.innerHTML = `  
            <div class="modal-content">  
                <span class="close-button" onclick="window.closeSavedGamesModal()">&times;</span>  
                <h2>💾 Partidas Guardadas</h2> <!-- Corregido el carácter -->  
                <p id="savedGamesLoading" style="text-align: center;">Cargando partidas...</p>  
                <div id="savedGamesList"></div>  
                <p id="savedGamesEmpty" style="text-align: center; display: none;">No tienes partidas guardadas en la nube<br>Guarda tu primera partida usando el botón "💾 Guardar"</p> <!-- Corregido el carácter -->  
                <button class="btn btn-secondary" onclick="window.closeSavedGamesModal()">Cerrar</button>  
            </div>  
        `;  
        document.body.appendChild(modal);  
    }  
  
    window.openSavedGamesModal = async function() {  
        let modal = document.getElementById('savedGamesModal');  
        if (!modal) {  
            createSavedGamesModal();  
            modal = document.getElementById('savedGamesModal');  
        }  
        modal.classList.add('active');   
        document.getElementById('savedGamesLoading').style.display = 'block';  
        document.getElementById('savedGamesList').innerHTML = '';  
        document.getElementById('savedGamesEmpty').style.display = 'none';  
  
        if (!window.currentUserId) {  
            document.getElementById('savedGamesLoading').style.display = 'none';  
            document.getElementById('savedGamesList').innerHTML = `  
                <p style="color: red;">❌ Debes iniciar sesión para ver tus partidas guardadas en la nube</p> <!-- Corregido el carácter -->  
            `;  
            return;  
        }  
  
        try {  
            if (window.authReadyPromise) {  
                await window.authReadyPromise;  
            }  
            const games = await window.loadUserSavedGames(window.currentUserId);  
            document.getElementById('savedGamesLoading').style.display = 'none';  
  
            if (!games || games.length === 0) {  
                document.getElementById('savedGamesEmpty').style.display = 'block';  
                return;  
            }  
  
            games.sort((a, b) => b.lastSaved - a.lastSaved);  
  
            const gamesListElem = document.getElementById('savedGamesList');  
            gamesListElem.innerHTML = games.map(game => `  
                <div class="saved-game-item">  
                    <h3>${game.name || 'Partida sin nombre'}</h3>  
                    <p>  
                        <strong>Equipo:</strong> ${game.team} |   
                        <strong>División:</strong> ${game.division || 'N/A'} |   
                        <strong>Jornada:</strong> ${game.week}  
                    </p>  
                    <p>📅 Guardada: ${new Date(game.lastSaved).toLocaleString('es-ES')}</p>  
                    <button class="btn btn-primary" onclick="window.loadGameFromCloudUI('${game.id}')">▶️ Cargar</button> <!-- Corregido el carácter -->  
                    <button class="btn btn-danger" onclick="window.deleteGameFromCloudUI('${game.id}', '${game.name || 'Partida sin nombre'}')">🗑️ Eliminar</button> <!-- Corregido el carácter -->  
                </div>  
            `).join('');  
        } catch (error) {  
            console.error('❌ Error cargando partidas:', error); // Corregido el carácter  
            document.getElementById('savedGamesLoading').style.display = 'none';  
            document.getElementById('savedGamesList').innerHTML = `  
                <p style="color: red;">❌ Error al cargar las partidas: ${error.message}</p> <!-- Corregido el carácter -->  
            `;  
        }  
    };  
  
    window.closeSavedGamesModal = function() {  
        const modal = document.getElementById('savedGamesModal');  
        if (modal) {  
            modal.classList.remove('active');  
        }  
    };  
  
    window.loadGameFromCloudUI = async function(gameId) {  
        if (!window.currentUserId) {  
            alert('⚠️ Debes iniciar sesión para cargar partidas'); // Corregido el carácter  
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
                alert('✅ Partida cargada correctamente'); // Corregido el carácter  
                if (window.ui && window.gameLogic) {  
                    window.gameLogic.updateGameState(result.data.gameState);  
                    window.ui.refreshUI(window.gameLogic.getGameState());  
                } else {  
                    console.warn('gameLogic o ui no disponibles después de cargar partida, recargando página.');  
                    location.reload();   
                }  
                window.closeSavedGamesModal();  
                const dashboardButton = document.querySelector('.menu-item[onclick*="dashboard"]');  
                if (dashboardButton) {  
                    window.switchPage('dashboard', dashboardButton);  
                }  
            } else {  
                alert('❌ Error al cargar la partida: ' + (result.message || result.error)); // Corregido el carácter  
            }  
        } catch (error) {  
            console.error('❌ Error cargando partida:', error); // Corregido el carácter  
            alert('❌ Error al cargar la partida: ' + error.message); // Corregido el carácter  
        }  
    };  
  
    window.deleteGameFromCloudUI = async function(gameId, gameName) {  
        if (!window.currentUserId) {  
            alert('⚠️ Debes iniciar sesión para eliminar partidas'); // Corregido el carácter  
            return;  
        }  
        if (!confirm(`¿Seguro que quieres eliminar la partida "${gameName}"? Esta acción no se puede deshacer.`)) {  
            return;  
        }  
        try {  
            if (window.authReadyPromise) {  
                await window.authReadyPromise;  
            }  
            const result = await window.deleteGameFromCloud(window.currentUserId, gameId);  
            if (result.success) {  
                alert('✅ Partida eliminada correctamente'); // Corregido el carácter  
                window.openSavedGamesModal();  
            } else {  
                alert('❌ Error al eliminar la partida: ' + (result.error || 'Error desconocido')); // Corregido el carácter  
            }  
        } catch (error) {  
            console.error('❌ Error eliminando partida:', error); // Corregido el carácter  
            alert('❌ Error al eliminar la partida: ' + error.message); // Corregido el carácter  
        }  
    };  
  
    // ... (Resto del código de injectCloudLoadUI, updateFirebaseStatus) ...  
    // Estos ya fueron corregidos en la solución anterior.  
    // Solo un carácter más para corregir en el botón:  
    // cloudLoadButton.innerHTML = '☁️ Ver y Cargar Partidas de la Nube'; // Corregido el carácter  
    // en la función injectCloudLoadUI.  
  
    window.addEventListener('DOMContentLoaded', () => {  
        console.log('📦 Inicializando Cloud Load Injector...'); // Corregido el carácter  
        setTimeout(injectCloudLoadUI, 1000);  
  
        const originalSwitchPage = window.switchPage;  
        if (originalSwitchPage) {  
            window.switchPage = function(pageId, element) {  
                originalSwitchPage(pageId, element);  
                if (pageId === 'settings') {  
                    setTimeout(() => {  
                        updateFirebaseStatus();  
                    }, 100);  
                }  
            };  
        }  
        // ELIMINAR EL BLOQUE originalLoginUser  
        // const originalLoginUser = window.loginUser;  
        // if (originalLoginUser) {  
        //     window.loginUser = function(...args) {  
        //         const result = originalLoginUser.apply(this, args);  
        //         if (result.success) {  
        //             setTimeout(updateFirebaseStatus, 1000);  
        //         }  
        //         return result;  
        //     };  
        // }  
    });  
  
    console.log('✔️ Cloud Load Injector cargado correctamente'); // Corregido el carácter  
})();  
