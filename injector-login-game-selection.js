// injector-login-game-selection.js
// VERSIÓN SIMPLIFICADA - Sin ocultar el dashboard

console.log('🎮 Game Selection Modal Injector (SIMPLIFICADO) cargando...');

(function() {
    'use strict';
    
    // NO ocultar nada al inicio - dejar que el juego funcione normal
    
    // Crear el HTML del modal
    function createGameSelectionModal() {
        if (document.getElementById('gameSelectionModal')) return;
        
        const modalHTML = `
            <div id="gameSelectionModal" class="modal">
                <div class="modal-content" style="max-width: 600px; padding: 40px;">
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
            </style>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Event listeners
        document.getElementById('btnNewGameSelection').addEventListener('click', () => {
            console.log('🎮 Nueva Partida seleccionada');
            document.getElementById('gameSelectionModal').classList.remove('active');
            
            setTimeout(() => {
                if (typeof window.openModal === 'function') {
                    window.openModal('gameMode');
                }
            }, 300);
        });
        
        document.getElementById('btnLoadGameSelection').addEventListener('click', () => {
            console.log('☁️ Cargar Partida desde la nube seleccionada');
            document.getElementById('gameSelectionModal').classList.remove('active');
            
            setTimeout(() => {
                if (typeof window.openSavedGamesModal === 'function') {
                    window.openSavedGamesModal();
                }
            }, 300);
        });
        
        // Botón de logout
        document.getElementById('btnLogoutSelection').addEventListener('click', () => {
            console.log('🚪 Cerrando sesión...');
            
            if (window.firebase && window.firebase.auth) {
                window.firebase.auth().signOut().then(() => {
                    localStorage.removeItem('currentUser');
                    window.location.reload();
                }).catch(() => {
                    localStorage.removeItem('currentUser');
                    window.location.reload();
                });
            } else {
                localStorage.removeItem('currentUser');
                window.location.reload();
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
        }
    };
    
    // Detectar si ya hay una partida al cargar (recarga F5)
    function checkExistingGame() {
        setTimeout(() => {
            if (window.gameLogic) {
                const state = window.gameLogic.getGameState();
                if (state && state.teamName) {
                    console.log('✅ Partida existente detectada:', state.teamName);
                    // Hay partida, no mostrar modal
                    return;
                }
            }
            
            // Si no hay partida y hay usuario, mostrar modal
            if (window.currentUser) {
                console.log('👤 Usuario sin partida, mostrando modal');
                window.showGameSelectionModal();
            }
        }, 2500);
    }
    
    // Interceptar el login
    function interceptLoginSuccess() {
        let loginSuccessDetected = false;
        
        const checkUserInterval = setInterval(() => {
            if (window.currentUser && !loginSuccessDetected) {
                const state = window.gameLogic?.getGameState();
                
                if (!state || !state.teamName) {
                    loginSuccessDetected = true;
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
        
        setTimeout(() => {
            clearInterval(checkUserInterval);
        }, 30000);
    }
    
    // Inicializar
    setTimeout(() => {
        createGameSelectionModal();
        interceptLoginSuccess();
        checkExistingGame();
    }, 1000);
    
    console.log('✅ Game Selection Modal Injector (SIMPLIFICADO) cargado');
})();
