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
                <section class="modal-content pcf-welcome">
                    <p class="pcf-eyebrow">TU CLUB. TU DECISIÓN.</p>
                    <h2>Bienvenido al PC Fútbol Manager</h2>
                    <p class="pcf-welcome-intro">Empieza un nuevo proyecto deportivo o continúa tu carrera.</p>
                    <div class="game-selection-options">
                        <button id="btnNewGameSelection" class="game-selection-btn">
                            <img src="assets/modern/new.svg" alt="">
                            <span>Nueva partida</span><small>Construye tu próximo proyecto</small>
                        </button>
                        <button id="btnLoadGameSelection" class="game-selection-btn">
                            <img src="assets/modern/load.svg" alt="">
                            <span>Cargar partida</span><small>Vuelve al banquillo</small>
                        </button>
                    </div>
                    <footer class="pcf-welcome-footer"><button id="btnLogoutSelection" class="btn btn-sm"><img src="assets/modern/logout.svg" class="pcf-ui-icon" alt="">Cerrar sesión</button></footer>
                </section>
            </div>`;

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
