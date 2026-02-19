// injector-cloud-load.js
(function() {
    console.log('â˜ï¸ Cloud Load Injector cargando...');

    // ========================================
    // FUNCIONES DE CARGA DESDE LA NUBE
    // ========================================

    // FunciÃ³n para abrir el modal de partidas guardadas
    window.openSavedGamesModal = async function() {
        if (!window.currentUserId) {
            alert('âš ï¸ Debes iniciar sesiÃ³n para acceder a tus partidas guardadas en la nube.');
            return;
        }

        // Crear modal si no existe
        if (!document.getElementById('savedGamesModal')) {
            const modal = document.createElement('div');
            modal.id = 'savedGamesModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 700px;">
                    <span class="modal-close" onclick="document.getElementById('savedGamesModal').classList.remove('active')">&times;</span>
                    <h1>â˜ï¸ Partidas Guardadas en la Nube</h1>
                    <div id="savedGamesListContainer" style="margin-top: 20px;">
                        <div class="alert alert-info">Cargando partidas...</div>
                    </div>
                    <button class="btn" style="background: #c73446; margin-top: 20px;" onclick="document.getElementById('savedGamesModal').classList.remove('active')">Cerrar</button>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Abrir modal
        document.getElementById('savedGamesModal').classList.add('active');
        
        // Cargar partidas
        try {
            const games = await window.loadUserSavedGames(window.currentUserId);
            const container = document.getElementById('savedGamesListContainer');
            
            if (!games || games.length === 0) {
                container.innerHTML = '<div class="alert alert-warning">No tienes partidas guardadas en la nube.</div>';
                return;
            }

            // Ordenar por fecha de guardado (mÃ¡s reciente primero)
            games.sort((a, b) => (b.lastSaved || 0) - (a.lastSaved || 0));

            container.innerHTML = games.map(game => {
                const lastSavedDate = new Date(game.lastSaved || 0);
                const dateStr = lastSavedDate.toLocaleString('es-ES');
                
                return `
                    <div class="player-card" style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong style="color: #00ff00;">${game.name || 'Partida sin nombre'}</strong><br>
                            <span style="color: #999; font-size: 0.9em;">
                                Equipo: ${game.team || '?'} | 
                                Jornada: ${game.week || '?'} | 
                                DivisiÃ³n: ${game.division || '?'}
                            </span><br>
                            <span style="color: #666; font-size: 0.85em;">
                                Guardada: ${dateStr}
                            </span>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-sm" onclick="window.loadGameFromCloudUI('${game.id}')">ðŸ“‚ Cargar</button>
                            <button class="btn btn-sm" style="background: #c73446;" onclick="window.deleteGameFromCloudUI('${game.id}', '${(game.name || 'esta partida').replace(/'/g, "\\'")}')">ðŸ—‘ï¸ Borrar</button>
                        </div>
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error('Error cargando partidas:', error);
            document.getElementById('savedGamesListContainer').innerHTML = 
                '<div class="alert alert-error">âŒ Error al cargar las partidas: ' + error.message + '</div>';
        }
    };

    // FunciÃ³n para cargar una partida especÃ­fica
    window.loadGameFromCloudUI = async function(gameId) {
        if (!window.currentUserId) {
            alert('âš ï¸ Debes iniciar sesiÃ³n para cargar partidas.');
            return;
        }

        if (!confirm('Â¿Cargar esta partida? Se perderÃ¡ el progreso no guardado de la partida actual.')) {
            return;
        }

        try {
            const result = await window.loadGameFromCloud(window.currentUserId, gameId);
            
            if (result.success && result.data && result.data.gameState) {
                // Verificar que gameLogic estÃ© disponible
                if (!window.gameLogic) {
                    alert('âŒ Error: El sistema de juego no estÃ¡ cargado.');
                    return;
                }

                // Cargar el estado del juego
                window.gameLogic.updateGameState(result.data.gameState);
                
                // Guardar tambiÃ©n en localStorage como backup
                window.gameLogic.saveToLocalStorage();
                
                // Refrescar la UI
                if (window.ui && window.ui.refreshUI) {
                    window.ui.refreshUI(result.data.gameState);
                }

                // ✅ Cargar mercado de Firestore tras restaurar partida
                setTimeout(async () => {
                    if (window.loadMarketFromFirestore) {
                        const mySquadNames = (result.data.gameState.squad || []).map(p => p.name);
                        await window.loadMarketFromFirestore(mySquadNames);
                        console.log('✅ Mercado recargado tras cargar partida guardada');
                    }
                }, 800);
                
                // Cerrar modal
                document.getElementById('savedGamesModal').classList.remove('active');
                
                // Ir a dashboard
                const dashboardButton = document.querySelector('.menu-item[onclick*="dashboard"]');
                if (dashboardButton && window.switchPage) {
                    window.switchPage('dashboard', dashboardButton);
                }
                
                alert(`âœ… Partida "${result.data.name}" cargada correctamente!\n\nEquipo: ${result.data.team}\nJornada: ${result.data.week}`);
            } else {
                alert('âŒ Error al cargar la partida: ' + (result.message || result.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error al cargar partida:', error);
            alert('âŒ Error inesperado al cargar la partida: ' + error.message);
        }
    };

    // FunciÃ³n para eliminar una partida
    window.deleteGameFromCloudUI = async function(gameId, gameName) {
        if (!window.currentUserId) {
            alert('âš ï¸ Debes iniciar sesiÃ³n para eliminar partidas.');
            return;
        }

        if (!confirm(`Â¿EstÃ¡s seguro de que quieres eliminar "${gameName}"?\n\nEsta acciÃ³n no se puede deshacer.`)) {
            return;
        }

        try {
            const result = await window.deleteGameFromCloud(window.currentUserId, gameId);
            
            if (result.success) {
                alert(`âœ… Partida "${gameName}" eliminada correctamente.`);
                // Recargar la lista de partidas
                window.openSavedGamesModal();
            } else {
                alert('âŒ Error al eliminar la partida: ' + (result.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error al eliminar partida:', error);
            alert('âŒ Error inesperado al eliminar la partida: ' + error.message);
        }
    };

    // ========================================
    // MODIFICAR LA SECCIÃ“N DE OPCIONES
    // ========================================

    function injectCloudLoadUI() {
        // Esperar a que el DOM estÃ© listo
        const settingsPage = document.getElementById('settings');
        if (!settingsPage) {
            console.warn('âš ï¸ PÃ¡gina de settings no encontrada, reintentando...');
            setTimeout(injectCloudLoadUI, 500);
            return;
        }

        console.log('ðŸ“ Modificando secciÃ³n de Opciones...');

        // Buscar el botÃ³n de "Cargar de la Nube" que tiene el alert
        const buttons = settingsPage.querySelectorAll('button');
        let cloudLoadButton = null;
        
        buttons.forEach(btn => {
            if (btn.textContent.includes('Cargar de la Nube') || btn.onclick?.toString().includes('Funcionalidad de cargar desde la nube')) {
                cloudLoadButton = btn;
            }
        });

        if (cloudLoadButton) {
            // Reemplazar el botÃ³n existente
            cloudLoadButton.onclick = window.openSavedGamesModal;
            cloudLoadButton.innerHTML = 'â˜ï¸ Ver y Cargar Partidas de la Nube';
            console.log('âœ… BotÃ³n de "Cargar de la Nube" actualizado');
        } else {
            // Si no existe, aÃ±adir una nueva secciÃ³n completa
            const cloudSection = document.createElement('div');
            cloudSection.innerHTML = `
                <hr style="margin-top: 20px; border-color: rgba(233, 69, 96, 0.3);">
                <h2>â˜ï¸ Opciones de la Nube</h2>
                <p style="color: #999; margin-bottom: 10px;">
                    Las partidas se guardan automÃ¡ticamente en la nube cuando haces clic en "ðŸ’¾ Guardar" en el header.
                </p>
                <button class="btn" onclick="window.openSavedGamesModal()">â˜ï¸ Ver y Cargar Partidas de la Nube</button>
            `;
            
            // Insertar antes del botÃ³n de cerrar (si existe)
            const closeButton = Array.from(buttons).find(btn => 
                btn.textContent.includes('Cerrar') || btn.style.background.includes('c73446')
            );
            
            if (closeButton) {
                closeButton.parentNode.insertBefore(cloudSection, closeButton);
            } else {
                settingsPage.appendChild(cloudSection);
            }
            console.log('âœ… SecciÃ³n de opciones de la nube aÃ±adida');
        }

        // AÃ±adir indicador de estado de Firebase
        if (!document.getElementById('firebaseStatusIndicator')) {
            const statusIndicator = document.createElement('p');
            statusIndicator.id = 'firebaseStatusIndicator';
            statusIndicator.style.cssText = 'margin-top: 10px; color: #999; font-size: 0.9em;';
            statusIndicator.innerHTML = `
                <strong>Estado de Firebase:</strong> 
                <span id="firebaseStatus">Verificando...</span>
            `;
            
            // Insertar despuÃ©s del botÃ³n de la nube
            const cloudBtn = Array.from(settingsPage.querySelectorAll('button')).find(btn => 
                btn.textContent.includes('Ver y Cargar Partidas')
            );
            
            if (cloudBtn && cloudBtn.parentNode) {
                cloudBtn.parentNode.insertBefore(statusIndicator, cloudBtn.nextSibling);
            }
            
            // Actualizar estado despuÃ©s de un momento
            setTimeout(updateFirebaseStatus, 2000);
        }
    }

    // FunciÃ³n para actualizar el estado de Firebase
    function updateFirebaseStatus() {
        const statusSpan = document.getElementById('firebaseStatus');
        if (!statusSpan) return;

        if (window.firebaseConfig && window.firebaseConfig.enabled && window.currentUserId) {
            statusSpan.innerHTML = 'âœ… Conectado (Usuario: ' + window.currentUserId.substring(0, 8) + '...)';
            statusSpan.style.color = '#00ff00';
        } else if (window.firebaseConfig && window.firebaseConfig.enabled) {
            statusSpan.innerHTML = 'âš ï¸ Firebase habilitado pero sin autenticar';
            statusSpan.style.color = 'orange';
        } else {
            statusSpan.innerHTML = 'âŒ Firebase deshabilitado (solo localStorage)';
            statusSpan.style.color = 'red';
        }
    }

    // Exponer funciÃ³n para actualizar estado (Ãºtil despuÃ©s del login)
    window.updateFirebaseStatusIndicator = updateFirebaseStatus;

    // ========================================
    // INICIALIZACIÃ“N
    // ========================================

    window.addEventListener('DOMContentLoaded', () => {
        console.log('â˜ï¸ Inicializando Cloud Load Injector...');
        
        // Intentar inyectar despuÃ©s de un pequeÃ±o delay
        setTimeout(injectCloudLoadUI, 1000);
        
        // TambiÃ©n intentar cuando se cambie a la pÃ¡gina de settings
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
    });

    // Actualizar estado cuando cambie el usuario
    const originalLoginUser = window.loginUser;
    if (originalLoginUser) {
        window.loginUser = function(...args) {
            const result = originalLoginUser.apply(this, args);
            if (result.success) {
                setTimeout(updateFirebaseStatus, 1000);
            }
            return result;
        };
    }

    console.log('âœ… Cloud Load Injector cargado correctamente');
})();
