// injector-login-game-selection.js
// Muestra un modal de selección después del login

console.log('🎮 Game Selection Modal Injector cargando...');

(function() {
    'use strict';
    
    // Bandera para evitar carga automática
    window.skipAutoLoad = false;
    
    // Interceptar la carga automática del localStorage
    function preventAutoLoad() {
        // Buscar la inicialización del juego
        const originalInit = window.addEventListener;
        let initIntercepted = false;
        
        window.addEventListener = function(type, listener, options) {
            if (type === 'DOMContentLoaded' && !initIntercepted) {
                initIntercepted = true;
                
                // Envolver el listener original
                const wrappedListener = function(event) {
                    console.log('🚫 Previniendo carga automática del localStorage');
                    
                    // Marcar que queremos saltarnos la carga automática
                    window.skipAutoLoad = true;
                    
                    // Ejecutar el listener original
                    listener.call(this, event);
                    
                    // Después de un momento, mostrar el modal de selección
                    setTimeout(() => {
                        if (window.currentUser) {
                            console.log('✅ Usuario logueado, mostrando selección');
                            window.showGameSelectionModal();
                        }
                    }, 1500);
                };
                
                return originalInit.call(this, type, wrappedListener, options);
            }
            
            return originalInit.call(this, type, listener, options);
        };
    }
    
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
                
                /* Ocultar el contenido del juego inicialmente */
                #gameContainer {
                    display: none;
                }
                
                #gameSelectionModal.active ~ #gameContainer {
                    display: none;
                }
            </style>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Event listeners
        document.getElementById('btnNewGameSelection').addEventListener('click', () => {
            console.log('🎮 Nueva Partida seleccionada');
            document.getElementById('gameSelectionModal').classList.remove('active');
            
            // Mostrar el contenedor del juego
            const gameContainer = document.getElementById('gameContainer');
            if (gameContainer) gameContainer.style.display = 'block';
            
            setTimeout(() => {
                if (typeof window.openModal === 'function') {
                    window.openModal('gameMode');
                }
            }, 300);
        });
        
        document.getElementById('btnLoadGameSelection').addEventListener('click', () => {
            console.log('☁️ Cargar Partida desde la nube seleccionada');
            document.getElementById('gameSelectionModal').classList.remove('active');
            
            // Mostrar el contenedor del juego
            const gameContainer = document.getElementById('gameContainer');
            if (gameContainer) gameContainer.style.display = 'block';
            
            setTimeout(() => {
                // Ir directamente al modal de partidas de la nube
                if (typeof window.openSavedGamesModal === 'function') {
                    window.openSavedGamesModal();
                } else {
                    console.warn('⚠️ openSavedGamesModal no disponible');
                }
            }, 300);
        });
        
        console.log('✅ Modal de selección creado');
    }
    
    // Función para mostrar el modal
    window.showGameSelectionModal = function() {
        const modal = document.getElementById('gameSelectionModal');
        if (modal) {
            modal.classList.add('active');
            
            // Ocultar el contenedor del juego
            const gameContainer = document.getElementById('gameContainer');
            if (gameContainer) gameContainer.style.display = 'none';
        }
    };
    
    // Interceptar el cierre del modal de login
    function interceptLoginSuccess() {
        // Observar cambios en el modal de login
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const loginModal = document.getElementById('loginModal');
                    if (loginModal && !loginModal.classList.contains('active')) {
                        // El modal de login se cerró
                        console.log('✅ Login completado, mostrando selección de partida');
                        setTimeout(() => {
                            window.showGameSelectionModal();
                        }, 1200);
                        
                        // Dejar de observar después del primer login exitoso
                        observer.disconnect();
                    }
                }
            });
        });
        
        // Buscar el modal de login y observarlo
        const checkLoginModal = setInterval(() => {
            const loginModal = document.getElementById('loginModal');
            if (loginModal) {
                observer.observe(loginModal, {
                    attributes: true,
                    attributeFilter: ['class']
                });
                console.log('👀 Observando modal de login');
                clearInterval(checkLoginModal);
            }
        }, 500);
    }
    
    // Interceptar la función loadFromLocalStorage
    function interceptLoadFromLocalStorage() {
        setTimeout(() => {
            if (window.gameLogic && window.gameLogic.loadFromLocalStorage) {
                const originalLoad = window.gameLogic.loadFromLocalStorage;
                
                window.gameLogic.loadFromLocalStorage = function() {
                    // Si está marcada la bandera de saltar carga, retornar false
                    if (window.skipAutoLoad) {
                        console.log('🚫 Carga automática omitida');
                        window.skipAutoLoad = false; // Resetear la bandera
                        return { success: false };
                    }
                    
                    // De lo contrario, ejecutar la carga normal
                    return originalLoad.call(this);
                };
                
                console.log('✅ loadFromLocalStorage interceptado');
            }
        }, 1000);
    }
    
    // Inicializar
    setTimeout(() => {
        createGameSelectionModal();
        interceptLoginSuccess();
        interceptLoadFromLocalStorage();
    }, 1000);
    
    console.log('✅ Game Selection Modal Injector cargado');
})();
