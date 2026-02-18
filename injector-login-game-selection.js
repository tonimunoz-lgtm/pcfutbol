// injector-login-game-selection.js

// Muestra un modal de selección después del login

console.log('🎮 Game Selection Modal Injector cargando...');

(function() {
    'use strict';
    
    // OPCIONAL: Descomentar para forzar login en cada recarga
    // setTimeout(() => {
    //     if (window.firebase && window.firebase.auth) {
    //         window.firebase.auth().signOut();
    //         localStorage.removeItem('currentUser');
    //         console.log('🔄 Sesión limpiada - requiere login');
    //     }
    // }, 100);
    
    // OCULTAR TODO EL JUEGO INMEDIATAMENTE
    function hideGameLayout() {
        const style = document.createElement('style');
        style.id = 'game-selection-hide-style';
        style.textContent = `
            /* Ocultar TODO excepto modales */
            body {
                background: #0a0e27 !important;
            }
            
            /* Ocultar elementos específicos del juego */
            #dashboard,
            #menuLeft,
            .main-header,
            .center-options,
            .menu-items {
                display: none !important;
            }
            
            /* Asegurar que los modales se vean correctamente */
            .modal {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                z-index: 9999 !important;
            }
            
            .modal:not(.active) {
                display: none !important;
            }
            
            .modal.active {
                display: flex !important;
            }
        `;
        document.head.appendChild(style);
        console.log('🙈 Layout del juego oculto completamente');
    }
    
    // MOSTRAR EL JUEGO cuando se elija una opción
    function showGameLayout() {
        const style = document.getElementById('game-selection-hide-style');
        if (style) {
            style.remove();
            console.log('👁️ Layout del juego visible');
        }
    }
    
    // Ocultar inmediatamente
    hideGameLayout();
    
    // Exportar para uso global
    window.showGameLayout = showGameLayout;
    
    // Crear el HTML del modal
    function createGameSelectionModal() {
        if (document.getElementById('gameSelectionModal')) return;
        
        const modalHTML = `
            <div id="gameSelectionModal" class="modal">
                <div class="modal-content" style="max-width: 600px; padding: 40px;">
                    <!-- NO hay botón de cerrar (X) - DEBE elegir una opción -->
                    
                    <h2 style="text-align: center; margin-bottom: 10px; color: #4CAF50; font-size: 32px;">
                        ¡Bienvenido al PC Fútbol Manager!
                    </h2>
                    
                    <p style="text-align: center; margin-bottom: 40px; font-size: 16px; color: #aaa;">
                        Selecciona una opción para continuar
                    </p>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                        <button id="btnNewGameSelection" class="game-selection-btn" style="
                            padding: 40px 20px;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            border: none;
                            border-radius: 15px;
                            cursor: pointer;
                            color: white;
                            font-size: 18px;
                            font-weight: bold;
                            transition: all 0.3s ease;
                            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                        ">
                            <div style="font-size: 48px; margin-bottom: 10px;">🎮</div>
                            <div>NUEVA PARTIDA</div>
                            <div style="font-size: 12px; margin-top: 8px; opacity: 0.8;">Comienza desde cero</div>
                        </button>
                        
                        <button id="btnLoadGameSelection" class="game-selection-btn" style="
                            padding: 40px 20px;
                            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                            border: none;
                            border-radius: 15px;
                            cursor: pointer;
                            color: white;
                            font-size: 18px;
                            font-weight: bold;
                            transition: all 0.3s ease;
                            box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4);
                        ">
                            <div style="font-size: 48px; margin-bottom: 10px;">☁️</div>
                            <div>CARGAR PARTIDA</div>
                            <div style="font-size: 12px; margin-top: 8px; opacity: 0.8;">Desde la nube</div>
                        </button>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px;">
                        <button id="btnLogoutSelection" style="
                            background: transparent;
                            border: 1px solid #666;
                            color: #999;
                            padding: 10px 30px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 14px;
                            transition: all 0.3s ease;
                        " onmouseover="this.style.borderColor='#fff'; this.style.color='#fff';" 
                           onmouseout="this.style.borderColor='#666'; this.style.color='#999';">
                            🚪 Cerrar Sesión
                        </button>
                    </div>
                </div>
            </div>
            
            <style>
                .game-selection-btn:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3) !important;
                }
                
                .game-selection-btn:active {
                    transform: translateY(-2px);
                }
                
                /* Prevenir que se cierre con ESC o clic fuera */
                #gameSelectionModal {
                    pointer-events: auto;
                }
                
                #gameSelectionModal .modal-content {
                    pointer-events: auto;
                }
            </style>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Event listeners
        document.getElementById('btnNewGameSelection').addEventListener('click', () => {
            console.log('🎮 Nueva Partida seleccionada');
            document.getElementById('gameSelectionModal').classList.remove('active');
            
            // Marcar que hay partida en proceso
            window.gameInProgress = true;
            
            // MOSTRAR el layout del juego
            showGameLayout();
            
            setTimeout(() => {
                if (typeof window.openModal === 'function') {
                    window.openModal('gameMode');
                } else {
                    console.error('❌ window.openModal no disponible');
                }
            }, 300);
        });
        
        document.getElementById('btnLoadGameSelection').addEventListener('click', () => {
            console.log('☁️ Cargar Partida desde la nube seleccionada');
            document.getElementById('gameSelectionModal').classList.remove('active');
            
            // Marcar que hay partida en proceso
            window.gameInProgress = true;
            
            // MOSTRAR el layout del juego
            showGameLayout();
            
            setTimeout(() => {
                // Ir directamente al modal de partidas de la nube
                if (typeof window.openSavedGamesModal === 'function') {
                    window.openSavedGamesModal();
                } else {
                    console.warn('⚠️ openSavedGamesModal no disponible aún, reintentando...');
                    // Reintentar después de 1 segundo
                    setTimeout(() => {
                        if (typeof window.openSavedGamesModal === 'function') {
                            window.openSavedGamesModal();
                        } else {
                            console.error('❌ openSavedGamesModal no disponible');
                            alert('⚠️ El sistema de carga no está disponible. Recarga la página.');
                        }
                    }, 1000);
                }
            }, 300);
        });
        
        // Botón de logout
        document.getElementById('btnLogoutSelection').addEventListener('click', () => {
            console.log('🚪 Cerrando sesión...');
            
            // Cerrar sesión de Firebase usando window.firebase
            if (window.firebase && window.firebase.auth) {
                window.firebase.auth().signOut().then(() => {
                    console.log('✅ Sesión cerrada');
                    // Limpiar localStorage
                    localStorage.removeItem('currentUser');
                    // Recargar la página
                    window.location.reload();
                }).catch((error) => {
                    console.error('❌ Error al cerrar sesión:', error);
                    // Fallback: limpiar y recargar de todas formas
                    localStorage.removeItem('currentUser');
                    window.location.reload();
                });
            } else {
                // Fallback: simplemente limpiar y recargar
                console.log('⚠️ Firebase no disponible, limpiando sesión...');
                localStorage.removeItem('currentUser');
                window.location.reload();
            }
        });
        
        // Prevenir que se cierre el modal haciendo clic fuera
        const modal = document.getElementById('gameSelectionModal');
        modal.addEventListener('click', (e) => {
            // Solo permitir cerrar si se hace clic en los botones internos
            if (e.target === modal) {
                e.stopPropagation();
                console.log('⚠️ Debes elegir una opción o cerrar sesión');
            }
        });
        
        console.log('✅ Modal de selección creado');
    }
    
    // Función para mostrar el modal
    window.showGameSelectionModal = function() {
        const modal = document.getElementById('gameSelectionModal');
        if (modal) {
            modal.classList.add('active');
            console.log('📺 Modal de selección mostrado');
        } else {
            console.error('❌ Modal de selección no encontrado');
        }
    };
    
    // Prevenir cierre de modales del flujo de juego sin completar
    function preventModalClose() {
        // Interceptar closeModal para prevenir cierre si no hay partida activa
        const originalCloseModal = window.closeModal;
        
        if (originalCloseModal) {
            window.closeModal = function(modalId) {
                // Si no hay partida en progreso y se intenta cerrar un modal del flujo
                if (!window.gameInProgress && 
                    (modalId === 'gameMode' || modalId === 'selectTeam' || modalId === 'savedGamesModal')) {
                    
                    console.warn('⚠️ No puedes cerrar este modal sin completar la acción');
                    
                    // Volver al modal de selección
                    setTimeout(() => {
                        hideGameLayout();
                        window.showGameSelectionModal();
                    }, 100);
                    
                    return;
                }
                
                // En cualquier otro caso, permitir cerrar
                originalCloseModal(modalId);
            };
            
            console.log('✅ Protección de modales activada');
        }
    }
    
    // Detectar si ya hay una partida al cargar (recarga F5)
    function checkExistingGame() {
        setTimeout(() => {
            // Si hay un gameState con teamName, hay partida activa
            if (window.gameLogic) {
                const state = window.gameLogic.getGameState();
                if (state && state.teamName) {
                    console.log('✅ Partida existente detectada:', state.teamName);
                    window.gameInProgress = true;
                    showGameLayout();
                    return;
                }
            }
            
            // Si no hay partida, verificar si hay usuario logueado
            console.log('⚠️ No hay partida activa');
            
            // Si hay usuario, mostrar modal de selección
            if (window.currentUser) {
                console.log('👤 Usuario logueado, mostrando modal de selección');
                hideGameLayout();
                setTimeout(() => {
                    window.showGameSelectionModal();
                }, 500);
            } else {
                // Si no hay usuario, simplemente ocultar el layout
                // El login UI se encargará de mostrarse
                console.log('🔐 Sin usuario, esperando login...');
                hideGameLayout();
            }
        }, 2500); // Aumentar timeout para asegurar que Firebase esté listo
    }
    
    // Interceptar el cierre del modal de login O sesión restaurada
    function interceptLoginSuccess() {
        let loginSuccessDetected = false;
        
        // MÉTODO 1: Observar el objeto currentUser
        const checkUserInterval = setInterval(() => {
            if (window.currentUser && !loginSuccessDetected) {
                const state = window.gameLogic?.getGameState();
                
                // Si hay usuario pero NO hay partida, mostrar modal de selección
                if (!state || !state.teamName) {
                    loginSuccessDetected = true;
                    console.log('✅ Usuario detectado sin partida, mostrando selección');
                    clearInterval(checkUserInterval);
                    
                    setTimeout(() => {
                        const loginModal = document.getElementById('loginModal');
                        if (loginModal) {
                            loginModal.classList.remove('active');
                        }
                        window.showGameSelectionModal();
                    }, 1500);
                }
            }
        }, 500);
        
        // MÉTODO 2: Observar cambios en el modal de login
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const loginModal = document.getElementById('loginModal');
                    if (loginModal && !loginModal.classList.contains('active') && !loginSuccessDetected) {
                        loginSuccessDetected = true;
                        console.log('✅ Login completado (modal cerrado)');
                        clearInterval(checkUserInterval);
                        
                        setTimeout(() => {
                            if (window.currentUser) {
                                const state = window.gameLogic?.getGameState();
                                if (!state || !state.teamName) {
                                    window.showGameSelectionModal();
                                }
                            }
                        }, 500);
                        
                        observer.disconnect();
                    }
                }
            });
        });
        
        // Buscar el modal de login y observarlo
        let checkAttempts = 0;
        const checkLoginModal = setInterval(() => {
            checkAttempts++;
            const loginModal = document.getElementById('loginModal');
            
            if (loginModal) {
                observer.observe(loginModal, {
                    attributes: true,
                    attributeFilter: ['class']
                });
                console.log('👀 Observando modal de login');
                clearInterval(checkLoginModal);
            } else if (checkAttempts > 20) {
                console.log('ℹ️ Modal de login no encontrado - sesión restaurada');
                clearInterval(checkLoginModal);
            }
        }, 500);
        
        // Timeout de seguridad: detener después de 30 segundos
        setTimeout(() => {
            clearInterval(checkUserInterval);
            clearInterval(checkLoginModal);
        }, 30000);
    }
    
    // Inicializar
    setTimeout(() => {
        createGameSelectionModal();
        interceptLoginSuccess();
        preventModalClose();
        checkExistingGame();
    }, 1000);
    
    console.log('✅ Game Selection Modal Injector cargado');
})();
