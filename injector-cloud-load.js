// injector-cloud-load.js
(function() {
    console.log('☁️ Cloud Load Injector cargando...');

    // ========================================
    // FUNCIONES DE CARGA DESDE LA NUBE
    // ========================================

    // Función para abrir el modal de partidas guardadas
    window.openSavedGamesModal = async function() {
        if (!window.currentUserId) {
            alert('⚠️ Debes iniciar sesión para acceder a tus partidas guardadas en la nube.');
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
                    <h1>☁️ Partidas Guardadas en la Nube</h1>
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
                container.innerHTML = `<div class="alert alert-warning">Todavía no tienes partidas guardadas en la nube.</div>
                    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
                        <button class="btn" onclick="document.getElementById('savedGamesModal').classList.remove('active'); setTimeout(()=>window.openModal && window.openModal('gameMode'), 200)">🎮 Empezar una partida nueva</button>
                        <button class="btn page-close-btn" onclick="document.getElementById('savedGamesModal').classList.remove('active'); setTimeout(()=>window.showGameSelectionModal && window.showGameSelectionModal(), 200)">← Volver</button>
                    </div>`;
                return;
            }

            // Ordenar por fecha de guardado (más reciente primero)
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
                                División: ${game.division || '?'}
                            </span><br>
                            <span style="color: #666; font-size: 0.85em;">
                                Guardada: ${dateStr}
                            </span>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-sm" onclick="window.loadGameFromCloudUI('${game.id}')">📂 Cargar</button>
                            <button class="btn btn-sm" style="background: #c73446;" onclick="window.deleteGameFromCloudUI('${game.id}', '${(game.name || 'esta partida').replace(/'/g, "\\'")}')">🗑️ Borrar</button>
                        </div>
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error('Error cargando partidas:', error);
            document.getElementById('savedGamesListContainer').innerHTML = 
                '<div class="alert alert-error">❌ Error al cargar las partidas: ' + error.message + '</div>';
        }
    };

    // Función para cargar una partida específica
    window.loadGameFromCloudUI = async function(gameId) {
        if (!window.currentUserId) {
            alert('⚠️ Debes iniciar sesión para cargar partidas.');
            return;
        }

        if (!await window.pcfConfirmText('¿Cargar esta partida? Se perderá el progreso no guardado de la partida actual.')) {
            return;
        }

        try {
            const result = await window.loadGameFromCloud(window.currentUserId, gameId);
            
            if (result.success && result.data && result.data.gameState) {
                // Verificar que gameLogic esté disponible
                if (!window.gameLogic) {
                    alert('❌ Error: El sistema de juego no está cargado.');
                    return;
                }

                // Cargar el estado del juego
                window.gameLogic.replaceGameState(result.data.gameState);
                
                // Guardar también en localStorage como backup
                window.gameLogic.saveToLocalStorage();
                
                // Refrescar la UI
                if (window.ui && window.ui.refreshUI) {
                    window.ui.refreshUI(result.data.gameState);
                }
                
                // Cerrar modal
                document.getElementById('savedGamesModal').classList.remove('active');
                
                // Ir a dashboard
                const dashboardButton = document.querySelector('.menu-item[onclick*="dashboard"]');
                if (dashboardButton && window.switchPage) {
                    window.switchPage('dashboard', dashboardButton);
                }
                
                alert(`✅ Partida "${result.data.name}" cargada correctamente!\n\nEquipo: ${result.data.team}\nJornada: ${result.data.week}`);
            } else {
                alert('❌ Error al cargar la partida: ' + (result.message || result.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error al cargar partida:', error);
            alert('❌ Error inesperado al cargar la partida: ' + error.message);
        }
    };

    // Función para eliminar una partida
    window.deleteGameFromCloudUI = async function(gameId, gameName) {
        if (!window.currentUserId) {
            alert('⚠️ Debes iniciar sesión para eliminar partidas.');
            return;
        }

        if (!await window.pcfConfirmText(`¿Estás seguro de que quieres eliminar "${gameName}"?\n\nEsta acción no se puede deshacer.`)) {
            return;
        }

        try {
            const result = await window.deleteGameFromCloud(window.currentUserId, gameId);
            
            if (result.success) {
                alert(`✅ Partida "${gameName}" eliminada correctamente.`);
                // Recargar la lista de partidas
                window.openSavedGamesModal();
            } else {
                alert('❌ Error al eliminar la partida: ' + (result.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error al eliminar partida:', error);
            alert('❌ Error inesperado al eliminar la partida: ' + error.message);
        }
    };

    // ========================================
    // MODIFICAR LA SECCIÓN DE OPCIONES
    // ========================================

    function injectCloudLoadUI() {
        // Esperar a que el DOM esté listo
        const settingsPage = document.getElementById('settings');
        if (!settingsPage) {
            console.warn('⚠️ Página de settings no encontrada, reintentando...');
            setTimeout(injectCloudLoadUI, 500);
            return;
        }

        console.log('📝 Modificando sección de Opciones...');

        // Buscar el botón de "Cargar de la Nube" que tiene el alert
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
            cloudLoadButton.innerHTML = '☁️ Ver y Cargar Partidas de la Nube';
            console.log('✅ Botón de "Cargar de la Nube" actualizado');
        } else {
            // Si no existe, añadir una nueva sección completa
            const cloudSection = document.createElement('div');
            cloudSection.innerHTML = `
                <hr style="margin-top: 20px; border-color: rgba(233, 69, 96, 0.3);">
                <h2>☁️ Opciones de la Nube</h2>
                <p style="color: #999; margin-bottom: 10px;">
                    Las partidas se guardan automáticamente en la nube cuando haces clic en "💾 Guardar" en el header.
                </p>
                <button class="btn" onclick="window.openSavedGamesModal()">☁️ Ver y Cargar Partidas de la Nube</button>
            `;
            
            // Insertar antes del botón de cerrar (si existe)
            const closeButton = Array.from(buttons).find(btn => 
                btn.textContent.includes('Cerrar') || btn.style.background.includes('c73446')
            );
            
            if (closeButton) {
                closeButton.parentNode.insertBefore(cloudSection, closeButton);
            } else {
                settingsPage.appendChild(cloudSection);
            }
            console.log('✅ Sección de opciones de la nube añadida');
        }

        // Añadir indicador de estado de Firebase
        if (!document.getElementById('firebaseStatusIndicator')) {
            const statusIndicator = document.createElement('p');
            statusIndicator.id = 'firebaseStatusIndicator';
            statusIndicator.style.cssText = 'margin-top: 10px; color: #999; font-size: 0.9em;';
            statusIndicator.innerHTML = `
                <strong>Estado de Firebase:</strong> 
                <span id="firebaseStatus">Verificando...</span>
            `;
            
            // Insertar después del botón de la nube
            const cloudBtn = Array.from(settingsPage.querySelectorAll('button')).find(btn => 
                btn.textContent.includes('Ver y Cargar Partidas')
            );
            
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

        if (window.firebaseConfig && window.firebaseConfig.enabled && window.currentUserId) {
            statusSpan.innerHTML = '✅ Conectado (Usuario: ' + window.currentUserId.substring(0, 8) + '...)';
            statusSpan.style.color = '#00ff00';
        } else if (window.firebaseConfig && window.firebaseConfig.enabled) {
            statusSpan.innerHTML = '⚠️ Firebase habilitado pero sin autenticar';
            statusSpan.style.color = 'orange';
        } else {
            statusSpan.innerHTML = '❌ Firebase deshabilitado (solo localStorage)';
            statusSpan.style.color = 'red';
        }
    }

    // Exponer función para actualizar estado (útil después del login)
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

    console.log('✅ Cloud Load Injector cargado correctamente');
})();
