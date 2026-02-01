// injector-cloud-load.js  
(function() {  
    console.log('☁️ Cloud Load Injector cargando...');  
  
    // ========================================  
    // FUNCIONES DE CARGA DESDE LA NUBE  
    // ========================================  
  
    // Función para abrir el modal de partidas guardadas  
    window.openSavedGamesModal = async function() {  
        let modal = document.getElementById('savedGamesModal');  
        if (!modal) {  
            // Crear modal si no existe  
            modal = document.createElement('div');  
            modal.id = 'savedGamesModal';  
            modal.className = 'modal';  
            modal.style.zIndex = '10001'; // Asegurarse de que esté por encima de otros modales  
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
  
        modal.classList.add('active'); // Abrir modal  
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
                    <button class="btn btn-primary" onclick="window.loadGameFromCloudUI('${game.id}')">▶️ Cargar</button>  
                    <button class="btn btn-danger" onclick="window.deleteGameFromCloudUI('${game.id}', '${game.name || 'Partida sin nombre'}')">🗑️ Eliminar</button>  
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
                if (window.ui && window.gameLogic) { // Asegúrate de que gameLogic también esté disponible  
                    window.gameLogic.updateGameState(result.data.gameState);  
                    window.ui.refreshUI(window.gameLogic.getGameState());  
                } else {  
                    console.warn('gameLogic o ui no disponibles después de cargar partida, recargando página.');  
                    location.reload(); // Recargar si los módulos principales no están accesibles  
                }  
                // Cerrar modal y cambiar a dashboard  
                window.closeSavedGamesModal();  
                const dashboardButton = document.querySelector('.menu-item[onclick*="dashboard"]');  
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
  
    // ========================================  
    // MODIFICAR LA SECCIÓN DE OPCIONES  
    // ========================================  
    function injectCloudLoadUI() {  
        // Esperar a que el DOM esté listo  
        const settingsPage = document.getElementById('settings');  
        if (!settingsPage) {  
            console.log('⚠️ Página de settings no encontrada, reintentando...');  
            setTimeout(injectCloudLoadUI, 500);  
            return;  
        }  
        console.log('🔄 Modificando sección de Opciones...');  
  
        // Buscar el botón de "Cargar de la Nube" que tiene el alert (del index.html)  
        const buttons = settingsPage.querySelectorAll('button');  
        let cloudLoadButton = null;  
        buttons.forEach(btn => {  
            if (btn.textContent.includes('Cargar de la Nube') || btn.onclick?.toString().includes('Funcionalidad de cargar desde la nube')) {  
                cloudLoadButton = btn;  
            }  
        });  
  
        if (cloudLoadButton) {  
            // Reemplazar el botón existente  
            cloudLoadButton.onclick = window.openSavedGamesModal;  
            cloudLoadButton.textContent = '☁️ Ver y Cargar Partidas de la Nube';  
            console.log('✔️ Botón de "Cargar de la Nube" actualizado');  
        } else {  
            // Si no existe, añadir una nueva sección completa  
            const cloudSection = document.createElement('div');  
            cloudSection.innerHTML = `  
                <hr>  
                <h2>☁️ Opciones de la Nube</h2>  
                <p>Las partidas se guardan automáticamente en la nube cuando haces clic en "💾 Guardar" en el header.</p>  
                <button class="btn btn-primary" onclick="window.openSavedGamesModal()">☁️ Ver y Cargar Partidas de la Nube</button>  
            `;  
            // Insertar antes del botón de cerrar (si existe)  
            const closeButton = Array.from(buttons).find(btn => btn.textContent.includes('Cerrar') || btn.style.background.includes('c73446'));  
            if (closeButton) {  
                closeButton.parentNode.insertBefore(cloudSection, closeButton);  
            } else {  
                settingsPage.appendChild(cloudSection);  
            }  
            console.log('✔️ Sección de opciones de la nube añadida');  
        }  
  
        // Añadir indicador de estado de Firebase  
        if (!document.getElementById('firebaseStatusIndicator')) {  
            const statusIndicator = document.createElement('p');  
            statusIndicator.id = 'firebaseStatusIndicator';  
            statusIndicator.style.cssText = 'margin-top: 10px; color: #999; font-size: 0.9em;';  
            statusIndicator.innerHTML = `  
                <strong>Estado de Firebase:</strong> <span id="firebaseStatus">Verificando...</span>  
            `;  
            // Insertar después del botón de la nube  
            const cloudBtn = Array.from(settingsPage.querySelectorAll('button')).find(btn => btn.textContent.includes('Ver y Cargar Partidas'));  
            if (cloudBtn && cloudBtn.parentNode) {  
                cloudBtn.parentNode.insertBefore(statusIndicator, cloudBtn.nextSibling);  
            }  
            // Actualizar estado después de un momento  
            setTimeout(updateFirebaseStatus, 2000);  
        }  
    }  
  
    // Función para actualizar el estado de Firebase  
    function updateFirebaseStatus() {  
        const statusSpan = document.getElementById('firebaseStatus');  
        if (!statusSpan) return;  
  
        if (window.firebaseConfig?.enabled && window.currentUserId) {  
            statusSpan.innerHTML = '✅ Conectado (Usuario: ' + window.currentUserId.substring(0, 8) + '...)';  
            statusSpan.style.color = '#00ff00';  
        } else if (window.firebaseConfig?.enabled) {  
            statusSpan.innerHTML = '⚠️ Firebase habilitado pero sin autenticar';  
            statusSpan.style.color = 'orange';  
        } else {  
            statusSpan.innerHTML = '❌ Firebase deshabilitado (solo localStorage)';  
            statusSpan.style.color = 'red';  
        }  
    }  
  
    // Exponer función para actualizar estado (útil después del login/logout)  
    window.updateFirebaseStatusIndicator = updateFirebaseStatus;  
  
    // ========================================  
    // INICIALIZACIÓN  
    // ========================================  
    window.addEventListener('DOMContentLoaded', () => {  
        console.log('☁️ Inicializando Cloud Load Injector...');  
        // Intentar inyectar después de un pequeño delay  
        setTimeout(injectCloudLoadUI, 1000);  
  
        // También intentar cuando se cambie a la página de settings  
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
        // Ya no necesitamos interceptar window.loginUser aquí,  
        // ya que firebase-config.js maneja la actualización del estado de Firebase  
        // y llama a updateFirebaseStatusIndicator directamente.  
    });  
  
    console.log('✔️ Cloud Load Injector cargado correctamente');  
})();  
