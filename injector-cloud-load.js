// injector-cloud-load.js  
(function() {  
    console.log('☁️ Cloud Load Injector cargando...'); // Corregido el carácter  
  
    // ... (funciones openSavedGamesModal, closeSavedGamesModal, loadGameFromCloudUI, deleteGameFromCloudUI) ...  
    // Estas son las mismas que en saved-games-manager.js, así que ya están corregidas de caracteres especiales.  
  
    function injectCloudLoadUI() {  
        const settingsPage = document.getElementById('settings');  
        if (!settingsPage) {  
            console.log('⚠️ Página de settings no encontrada, reintentando...'); // Corregido el carácter  
            setTimeout(injectCloudLoadUI, 500);  
            return;  
        }  
        console.log('🔄 Modificando sección de Opciones...'); // Corregido el carácter  
  
        const buttons = settingsPage.querySelectorAll('button');  
        let cloudLoadButton = null;  
        buttons.forEach(btn => {  
            if (btn.textContent.includes('Cargar de la Nube') || btn.onclick?.toString().includes('Funcionalidad de cargar desde la nube')) {  
                cloudLoadButton = btn;  
            }  
        });  
  
        if (cloudLoadButton) {  
            cloudLoadButton.onclick = window.openSavedGamesModal;  
            cloudLoadButton.textContent = '☁️ Ver y Cargar Partidas de la Nube'; // Corregido el carácter  
            console.log('✔️ Botón de "Cargar de la Nube" actualizado'); // Corregido el carácter  
        } else {  
            const cloudSection = document.createElement('div');  
            cloudSection.innerHTML = `  
                <hr>  
                <h2>☁️ Opciones de la Nube</h2> <!-- Corregido el carácter -->  
                <p>Las partidas se guardan automáticamente en la nube cuando haces clic en "💾 Guardar" en el header.</p> <!-- Corregido el carácter -->  
                <button class="btn btn-primary" onclick="window.openSavedGamesModal()">☁️ Ver y Cargar Partidas de la Nube</button> <!-- Corregido el carácter -->  
            `;  
            const closeButton = Array.from(buttons).find(btn => btn.textContent.includes('Cerrar') || btn.style.background.includes('c73446'));  
            if (closeButton) {  
                closeButton.parentNode.insertBefore(cloudSection, closeButton);  
            } else {  
                settingsPage.appendChild(cloudSection);  
            }  
            console.log('✔️ Sección de opciones de la nube añadida'); // Corregido el carácter  
        }  
  
        if (!document.getElementById('firebaseStatusIndicator')) {  
            const statusIndicator = document.createElement('p');  
            statusIndicator.id = 'firebaseStatusIndicator';  
            statusIndicator.style.cssText = 'margin-top: 10px; color: #999; font-size: 0.9em;';  
            statusIndicator.innerHTML = `  
                <strong>Estado de Firebase:</strong> <span id="firebaseStatus">Verificando...</span>  
            `;  
            const cloudBtn = Array.from(settingsPage.querySelectorAll('button')).find(btn => btn.textContent.includes('Ver y Cargar Partidas'));  
            if (cloudBtn && cloudBtn.parentNode) {  
                cloudBtn.parentNode.insertBefore(statusIndicator, cloudBtn.nextSibling);  
            }  
            setTimeout(updateFirebaseStatus, 2000);  
        }  
    }  
  
    function updateFirebaseStatus() {  
        const statusSpan = document.getElementById('firebaseStatus');  
        if (!statusSpan) return;  
  
        if (window.firebaseConfig?.enabled && window.currentUserId) {  
            statusSpan.innerHTML = '✅ Conectado (Usuario: ' + window.currentUserId.substring(0, 8) + '...)'; // Corregido el carácter  
            statusSpan.style.color = '#00ff00';  
        } else if (window.firebaseConfig?.enabled) {  
            statusSpan.innerHTML = '⚠️ Firebase habilitado pero sin autenticar'; // Corregido el carácter  
            statusSpan.style.color = 'orange';  
        } else {  
            statusSpan.innerHTML = '❌ Firebase deshabilitado (solo localStorage)'; // Corregido el carácter  
            statusSpan.style.color = 'red';  
        }  
    }  
  
    window.updateFirebaseStatusIndicator = updateFirebaseStatus;  
  
    window.addEventListener('DOMContentLoaded', () => {  
        console.log('☁️ Inicializando Cloud Load Injector...'); // Corregido el carácter  
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
        // *** CAMBIO CLAVE 2: ELIMINAR ESTE BLOQUE COMPLETO DE originalLoginUser ***  
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
