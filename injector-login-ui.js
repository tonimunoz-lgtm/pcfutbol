// injector-login-ui.js  
(function() {  
    console.log('🔗 Login UI Injector cargando...');   
  
    // *** INICIO DE LA CORRECCIÓN PARA EL TypeError ***  
    // Mover la definición de window.switchLoginTab al principio de la IIFE.  
    window.switchLoginTab = function(tab) {  
        const loginTab = document.getElementById('loginTab');  
        const registerTab = document.getElementById('registerTab');  
        const loginForm = document.getElementById('loginForm');  
        const registerForm = document.getElementById('registerForm');  
        const messageDiv = document.getElementById('loginMessage');  
        messageDiv.style.display = 'none';  
  
        if (tab === 'login') {  
            loginTab.style.background = '#e94560';  
            registerTab.style.background = 'rgba(233, 69, 96, 0.3)';  
            loginForm.style.display = 'block';  
            registerForm.style.display = 'none';  
        } else {  
            loginTab.style.background = 'rgba(233, 69, 96, 0.3)';  
            registerTab.style.background = '#e94560';  
            loginForm.style.display = 'none';  
            registerForm.style.display = 'block';  
        }  
    };  
    // *** FIN DE LA CORRECCIÓN DE POSICIÓN ***  
  
    // Eliminar DEFAULT_USERS y cualquier lógica de localStorage aquí,  
    // ya que no queremos usarlo para usuarios.  
    // El ejemplo de admin en el HTML del modal es solo informativo.  
  
  
    // Función de login  
    window.loginUser = async function(email, password) {  
        if (window.firebaseConfig?.enabled && window.firebaseLoginWithEmailPassword) {  
            console.log('Intentando login con Firebase...');  
            const firebaseResult = await window.firebaseLoginWithEmailPassword(email, password);  
            if (firebaseResult.success) {  
                console.log(`✔️ Login exitoso con Firebase: ${firebaseResult.user.email} (${firebaseResult.user.name})`); // Corregido carácter  
                return { success: true, user: firebaseResult.user };  
            } else {  
                console.error(`❌ Error login Firebase: ${firebaseResult.message}`); // Corregido carácter  
                return firebaseResult;  
            }  
        } else {  
            return { success: false, message: 'Firebase no habilitado. No se permite login local.' };  
        }  
    };  
  
    // Función de registro  
    window.registerUser = async function(email, password, name) {  
        if (window.firebaseConfig?.enabled && window.firebaseRegisterWithEmailPassword) {  
            console.log('Intentando registro con Firebase...');  
            const firebaseResult = await window.firebaseRegisterWithEmailPassword(email, password, name);  
            if (firebaseResult.success) {  
                console.log(`✔️ Usuario registrado con Firebase: ${firebaseResult.user.email}`); // Corregido carácter  
                return { success: true, message: 'Usuario registrado correctamente' };  
            } else {  
                console.error(`❌ Error registro Firebase: ${firebaseResult.message}`); // Corregido carácter  
                return firebaseResult;  
            }  
        } else {  
            return { success: false, message: 'Firebase no habilitado. No se permite registro local.' };  
        }  
    };  
  
    // Función de logout  
    window.logoutUser = async function() {  
        if (!confirm('¿Seguro que quieres cerrar sesión?')) { // Corregido carácter  
            return;  
        }  
        if (window.firebaseConfig?.enabled && window.firebaseLogout) {  
            console.log('Intentando logout con Firebase...');  
            const firebaseResult = await window.firebaseLogout();  
            if (firebaseResult.success) {  
                console.log('✔️ Logout de Firebase exitoso.'); // Corregido carácter  
                location.reload();   
            } else {  
                alert('Error al cerrar sesión con Firebase: ' + firebaseResult.message);  
            }  
        } else {  
            alert('Firebase no habilitado. No se puede cerrar sesión.');  
        }  
    };  
  
    // Crear modal de login  
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
        console.log('✔️ Modal de login creado'); // Corregido carácter  
        window.switchLoginTab('login'); // Ahora window.switchLoginTab ya está definida.  
    }  
  
    // Manejar login  
    window.handleLogin = async function() {   
        const email = document.getElementById('loginEmail').value.trim();  
        const password = document.getElementById('loginPassword').value;  
        const messageDiv = document.getElementById('loginMessage');  
  
        if (!email || !password) {  
            messageDiv.style.display = 'block';  
            messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';  
            messageDiv.style.color = 'red';  
            messageDiv.textContent = '❗ Por favor, completa todos los campos'; // Corregido carácter  
            return;  
        }  
  
        const result = await window.loginUser(email, password);   
        if (result.success) {  
            messageDiv.style.display = 'block';  
            messageDiv.style.background = 'rgba(0, 255, 0, 0.2)';  
            messageDiv.style.color = '#00ff00';  
            messageDiv.textContent = '✔️ Bienvenido, ' + (result.user.name || result.user.email.split('@')[0]); // Corregido carácter  
            console.log(`✔️ Login exitoso: ${result.user.email} (${result.user.role})`); // Corregido carácter  
  
            setTimeout(() => {  
                document.getElementById('loginModal').classList.remove('active');  
                // addUserButtons se llamará automáticamente desde firebase-config.js via onAuthStateChanged  
            }, 1000);  
        } else {  
            messageDiv.style.display = 'block';  
            messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';  
            messageDiv.style.color = 'red';  
            messageDiv.textContent = '❗ ' + result.message; // Corregido carácter  
        }  
    };  
  
    // Manejar registro  
    window.handleRegister = async function() {   
        const name = document.getElementById('registerName').value.trim();  
        const email = document.getElementById('registerEmail').value.trim();  
        const password = document.getElementById('registerPassword').value;  
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;  
        const messageDiv = document.getElementById('loginMessage');  
  
        if (!name || !email || !password || !passwordConfirm) {  
            messageDiv.style.display = 'block';  
            messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';  
            messageDiv.style.color = 'red';  
            messageDiv.textContent = '❗ Por favor, completa todos los campos'; // Corregido carácter  
            return;  
        }  
  
        if (password !== passwordConfirm) {  
            messageDiv.style.display = 'block';  
            messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';  
            messageDiv.style.color = 'red';  
            messageDiv.textContent = '❗ Las contraseñas no coinciden'; // Corregido carácter  
            return;  
        }  
  
        if (password.length < 6) {  
            messageDiv.style.display = 'block';  
            messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';  
            messageDiv.style.color = 'red';  
            messageDiv.textContent = '❗ La contraseña debe tener al menos 6 caracteres'; // Corregido carácter  
            return;  
        }  
  
        const result = await window.registerUser(email, password, name);   
        if (result.success) {  
            messageDiv.style.display = 'block';  
            messageDiv.style.background = 'rgba(0, 255, 0, 0.2)';  
            messageDiv.style.color = '#00ff00';  
            messageDiv.textContent = '✔️ Cuenta creada. Puedes iniciar sesión ahora'; // Corregido carácter  
            console.log(`✔️ Usuario registrado: ${email}`); // Corregido carácter  
  
            setTimeout(() => {  
                window.switchLoginTab('login');  
                document.getElementById('loginEmail').value = email;  
                document.getElementById('loginPassword').value = '';  
                messageDiv.style.display = 'none';  
            }, 2000);  
        } else {  
            messageDiv.style.display = 'block';  
            messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';  
            messageDiv.style.color = 'red';  
            messageDiv.textContent = '❗ ' + result.message; // Corregido carácter  
        }  
    };  
  
    // Añadir botones de usuario al header  
    function addUserButtons(user) {  
        const headerInfo = document.querySelector('.header-info');  
        if (!headerInfo) {  
            console.warn('⚠️ No se encontró .header-info'); // Corregido carácter  
            return;  
        }  
  
        removeUserButtons();   
  
        if (user.role === 'admin') {  
            const adminBtn = document.createElement('button');  
            adminBtn.id = 'adminButton';  
            adminBtn.className = 'btn btn-sm';  
            adminBtn.innerHTML = '⚙️ Admin'; // Corregido carácter  
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
            console.log('✔️ Botón de Admin añadido'); // Corregido carácter  
        }  
  
        const logoutBtn = document.createElement('button');  
        logoutBtn.id = 'logoutButton';  
        logoutBtn.className = 'btn btn-sm';  
        logoutBtn.innerHTML = '👋 Salir'; // Corregido carácter  
        logoutBtn.onclick = window.logoutUser;  
        logoutBtn.style.background = '#c73446';  
        headerInfo.appendChild(logoutBtn);  
        console.log('✔️ Botón de Logout añadido'); // Corregido carácter  
  
        const userIndicator = document.createElement('div');  
        userIndicator.id = 'userIndicator';  
        userIndicator.className = 'info-box';  
        userIndicator.innerHTML = `👤 ${user.name || (user.email ? user.email.split('@')[0] : 'Usuario')}`; // Corregido carácter   
        const saveBtn = document.getElementById('saveGameBtn');  
        if (saveBtn) {  
            headerInfo.insertBefore(userIndicator, saveBtn);  
        } else {  
            headerInfo.appendChild(userIndicator);  
        }  
        console.log('✔️ Indicador de usuario añadido'); // Corregido carácter   
    }  
  
    // NUEVA FUNCIÓN: Remover todos los botones de usuario del header  
    function removeUserButtons() {  
        const adminBtn = document.getElementById('adminButton');  
        if (adminBtn) adminBtn.remove();  
        const logoutBtn = document.getElementById('logoutButton');  
        if (logoutBtn) logoutBtn.remove();  
        const userIndicator = document.getElementById('userIndicator');  
        if (userIndicator) userIndicator.remove();  
        console.log('⚪ Botones de usuario removidos del header.'); // Corregido carácter  
    }  
  
    window.addUserButtons = addUserButtons;  
    window.removeUserButtons = removeUserButtons;  
  
    // Permitir login con Enter  
    document.addEventListener('keypress', (e) => {   
        if (e.key === 'Enter') {  
            const loginForm = document.getElementById('loginForm');  
            const registerForm = document.getElementById('registerForm');  
            if (loginForm && loginForm.style.display !== 'none') {  
                window.handleLogin();  
            } else if (registerForm && registerForm.style.display !== 'none') {  
                window.handleRegister();  
            }  
        }  
    });  
  
    // Inicializar  
    window.addEventListener('DOMContentLoaded', () => {  
        console.log('🔗 Inicializando sistema de login...'); // Corregido carácter  
  
        if (window.firebaseConfig?.enabled) {  
            window.authReadyPromise.then(uid => {  
                if (!uid) {   
                    console.log('⚪ No hay sesión activa de Firebase, mostrando modal de login.'); // Corregido carácter  
                    createLoginModal();  
                } else {  
                    console.log(`✔️ Sesión Firebase restaurada para UID: ${uid}. Botones añadidos por onAuthStateChanged.`); // Corregido carácter  
                    const loginModal = document.getElementById('loginModal');  
                    if (loginModal) loginModal.classList.remove('active');  
                }  
            }).catch(error => {  
                console.error('❌ Error esperando authReadyPromise:', error); // Corregido carácter  
                createLoginModal();   
            });  
        } else {  
            console.log('❌ Firebase deshabilitado. No se permite login ni registro. Mostrando modal de login.'); // Corregido carácter  
            createLoginModal();  
            // Deshabilitar botones de registro/login si Firebase no está activo  
            const registerTab = document.getElementById('registerTab');  
            if (registerTab) registerTab.disabled = true;  
            const loginEmailInput = document.getElementById('loginEmail');  
            if (loginEmailInput) loginEmailInput.value = 'Firebase requerido';  
            const loginPasswordInput = document.getElementById('loginPassword');  
            if (loginPasswordInput) loginPasswordInput.value = 'Firebase requerido';  
            alert('🚨 Firebase no está habilitado. El juego requiere Firebase para autenticación y guardado de partidas. Por favor, revisa tu configuración.'); // Corregido carácter  
        }  
    });  
  
    console.log('✔️ Login UI Injector cargado correctamente'); // Corregido carácter  
})();  
