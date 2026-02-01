// injector-login-ui.js  
(function() {  
    console.log('🔗 Login UI Injector cargando...'); // Corregido el carácter  
  
    // Eliminar DEFAULT_USERS y cualquier lógica de localStorage aquí,  
    // ya que no queremos usarlo para usuarios.  
    // ...  
  
    window.loginUser = async function(email, password) {  
        if (window.firebaseConfig?.enabled && window.firebaseLoginWithEmailPassword) {  
            console.log('Intentando login con Firebase...');  
            const firebaseResult = await window.firebaseLoginWithEmailPassword(email, password);  
            if (firebaseResult.success) {  
                console.log(`✔️ Login exitoso con Firebase: ${firebaseResult.user.email} (${firebaseResult.user.name})`);  
                return { success: true, user: firebaseResult.user };  
            } else {  
                console.error(`❌ Error login Firebase: ${firebaseResult.message}`);  
                return firebaseResult;  
            }  
        } else {  
            return { success: false, message: 'Firebase no habilitado. No se permite login local.' };  
        }  
    };  
  
    window.registerUser = async function(email, password, name) {  
        if (window.firebaseConfig?.enabled && window.firebaseRegisterWithEmailPassword) {  
            console.log('Intentando registro con Firebase...');  
            const firebaseResult = await window.firebaseRegisterWithEmailPassword(email, password, name);  
            if (firebaseResult.success) {  
                console.log(`✔️ Usuario registrado con Firebase: ${firebaseResult.user.email}`);  
                return { success: true, message: 'Usuario registrado correctamente' };  
            } else {  
                console.error(`❌ Error registro Firebase: ${firebaseResult.message}`);  
                return firebaseResult;  
            }  
        } else {  
            return { success: false, message: 'Firebase no habilitado. No se permite registro local.' };  
        }  
    };  
  
    window.logoutUser = async function() {  
        if (!confirm('¿Seguro que quieres cerrar sesión?')) { // Corregido el carácter  
            return;  
        }  
        if (window.firebaseConfig?.enabled && window.firebaseLogout) {  
            console.log('Intentando logout con Firebase...');  
            const firebaseResult = await window.firebaseLogout();  
            if (firebaseResult.success) {  
                console.log('✔️ Logout de Firebase exitoso.');  
                location.reload();   
            } else {  
                alert('Error al cerrar sesión con Firebase: ' + firebaseResult.message);  
            }  
        } else {  
            alert('Firebase no habilitado. No se puede cerrar sesión.');  
        }  
    };  
  
    function createLoginModal() {  
        const modal = document.createElement('div');  
        modal.id = 'loginModal';  
        modal.className = 'modal active';   
        modal.style.zIndex = '10000';  
        modal.innerHTML = `  
            <div class="modal-content">  
                <span class="close-button" onclick="window.closeModal('loginModal')">&times;</span>  
                <h1>⚽ PC FÚTBOL MANAGER</h1>  
                <div class="login-tabs">  
                    <button id="loginTab" class="login-tab-button active" onclick="window.switchLoginTab('login')">Iniciar Sesión</button>  
                    <button id="registerTab" class="login-tab-button" onclick="window.switchLoginTab('register')">Registrarse</button>  
                </div>  
                <div id="loginMessage" class="message-area" style="display: none;"></div>  
  
                <div id="loginForm" class="login-form">  
                    <label for="loginEmail">Email:</label>  
                    <input type="email" id="loginEmail" placeholder="tu@email.com">  
                    <label for="loginPassword">Contraseña:</label>  
                    <input type="password" id="loginPassword" placeholder="Contraseña">  
                    <button class="btn btn-primary" onclick="window.handleLogin()">➡️ Entrar</button>  
                    <p style="font-size: 0.8em; margin-top: 10px;">Admin: tonaco92@gmail.com / 12345678</p>  
                </div>  
  
                <div id="registerForm" class="register-form" style="display: none;">  
                    <label for="registerName">Nombre:</label>  
                    <input type="text" id="registerName" placeholder="Tu nombre o alias">  
                    <label for="registerEmail">Email:</label>  
                    <input type="email" id="registerEmail" placeholder="tu@email.com">  
                    <label for="registerPassword">Contraseña:</label>  
                    <input type="password" id="registerPassword" placeholder="Mínimo 6 caracteres">  
                    <label for="registerPasswordConfirm">Confirmar Contraseña:</label>  
                    <input type="password" id="registerPasswordConfirm" placeholder="Repite la contraseña">  
                    <button class="btn btn-primary" onclick="window.handleRegister()">✨ Crear Cuenta</button>  
                    <p style="font-size: 0.8em; margin-top: 10px;">Las cuentas registradas son de usuario normal (no admin)</p>  
                </div>  
            </div>  
        `;  
        document.body.appendChild(modal);  
        console.log('✔️ Modal de login creado'); // Corregido el carácter  
        window.switchLoginTab('login');   
    }  
  
    // ... (switchLoginTab, handleLogin, handleRegister - se mantienen igual) ...  
  
    function addUserButtons(user) {  
        const headerInfo = document.querySelector('.header-info');  
        if (!headerInfo) {  
            console.warn('⚠️ No se encontró .header-info'); // Corregido el carácter  
            return;  
        }  
  
        removeUserButtons();   
  
        if (user.role === 'admin') {  
            const adminBtn = document.createElement('button');  
            adminBtn.id = 'adminButton';  
            adminBtn.className = 'btn btn-sm';  
            adminBtn.innerHTML = '⚙️ Admin'; // Corregido el carácter  
            adminBtn.onclick = () => {  
                if (window.openAdminPanel) {  
                    window.openAdminPanel();  
                } else {  
                    alert('El panel de administración aún no está cargado');  
                }  
            };  
            adminBtn.style.background = '#ff9500';  
            const saveBtn = document.getElementById('saveGameBtn');  
            const loadBtn = document.getElementById('loadFromCloudBtn');   
            if (loadBtn) {  
                loadBtn.parentNode.insertBefore(adminBtn, loadBtn.nextSibling);  
            } else if (saveBtn) {  
                saveBtn.parentNode.insertBefore(adminBtn, saveBtn.nextSibling);  
            } else {  
                headerInfo.appendChild(adminBtn);  
            }  
            console.log('✔️ Botón de Admin añadido'); // Corregido el carácter  
        }  
  
        const logoutBtn = document.createElement('button');  
        logoutBtn.id = 'logoutButton';  
        logoutBtn.className = 'btn btn-sm';  
        logoutBtn.innerHTML = '👋 Salir'; // Corregido el carácter  
        logoutBtn.onclick = window.logoutUser;  
        logoutBtn.style.background = '#c73446';  
        headerInfo.appendChild(logoutBtn);  
        console.log('✔️ Botón de Logout añadido'); // Corregido el carácter  
  
        const userIndicator = document.createElement('div');  
        userIndicator.id = 'userIndicator';  
        userIndicator.className = 'info-box';  
        userIndicator.innerHTML = `👤 ${user.name || (user.email ? user.email.split('@')[0] : 'Usuario')}`; // Corregido el carácter  
        const saveBtn = document.getElementById('saveGameBtn');  
        if (saveBtn) {  
            headerInfo.insertBefore(userIndicator, saveBtn);  
        } else {  
            headerInfo.appendChild(userIndicator);  
        }  
        console.log('✔️ Indicador de usuario añadido'); // Corregido el carácter  
    }  
  
    function removeUserButtons() {  
        const adminBtn = document.getElementById('adminButton');  
        if (adminBtn) adminBtn.remove();  
        const logoutBtn = document.getElementById('logoutButton');  
        if (logoutBtn) logoutBtn.remove();  
        const userIndicator = document.getElementById('userIndicator');  
        if (userIndicator) userIndicator.remove();  
        console.log('⚪ Botones de usuario removidos del header.');  
    }  
  
    window.addUserButtons = addUserButtons;  
    window.removeUserButtons = removeUserButtons;  
  
    // ... (document.addEventListener('keypress', ...) ...  
  
    window.addEventListener('DOMContentLoaded', () => {  
        console.log('🔗 Inicializando sistema de login...'); // Corregido el carácter  
  
        if (window.firebaseConfig?.enabled) {  
            window.authReadyPromise.then(uid => {  
                if (!uid) {   
                    console.log('⚪ No hay sesión activa de Firebase, mostrando modal de login.');  
                    createLoginModal();  
                } else {  
                    console.log(`✔️ Sesión Firebase restaurada para UID: ${uid}. Botones añadidos por onAuthStateChanged.`); // Corregido el carácter  
                    const loginModal = document.getElementById('loginModal');  
                    if (loginModal) loginModal.classList.remove('active');  
                }  
            }).catch(error => {  
                console.error('❌ Error esperando authReadyPromise:', error);  
                createLoginModal();   
            });  
        } else {  
            console.log('❌ Firebase deshabilitado. No se permite login ni registro. Mostrando modal de login.');  
            createLoginModal();  
            document.getElementById('registerTab').disabled = true;  
            document.getElementById('loginEmail').value = 'Firebase requerido';  
            document.getElementById('loginPassword').value = 'Firebase requerido';  
            alert('🚨 Firebase no está habilitado. El juego requiere Firebase para autenticación y guardado de partidas. Por favor, revisa tu configuración.');  
        }  
    });  
  
    console.log('✔️ Login UI Injector cargado correctamente'); // Corregido el carácter  
})();  
