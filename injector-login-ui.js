// injector-login-ui.js  
(function() {  
    console.log('Login UI Injector cargando...');  
  
    // Usuarios por defecto - SOLO ADMIN (solo se usan si Firebase está deshabilitado)  
    const DEFAULT_USERS = {  
        'tonaco92@gmail.com': { email: 'tonaco92@gmail.com', password: '12345678', role: 'admin', name: 'Antonio (Admin)' }  
    };  
  
    // Guardar usuarios por defecto si no existen (solo si Firebase está deshabilitado)  
    // Esta lógica solo se ejecutará si window.firebaseConfig.enabled es false.  
    window.addEventListener('DOMContentLoaded', () => {  
        if (!window.firebaseConfig || !window.firebaseConfig.enabled) {  
            Object.values(DEFAULT_USERS).forEach(user => {  
                if (!localStorage.getItem('user_' + user.email)) {  
                    localStorage.setItem('user_' + user.email, JSON.stringify(user));  
                    console.log(`✔️ Usuario por defecto creado: ${user.email}`);  
                }  
            });  
        }  
    });  
  
    // Función de login (ahora usa Firebase si está habilitado)  
    window.loginUser = async function(email, password) {  
        if (window.firebaseConfig?.enabled && window.firebaseLoginWithEmailPassword) {  
            console.log('Intentando login con Firebase...');  
            const firebaseResult = await window.firebaseLoginWithEmailPassword(email, password);  
            if (firebaseResult.success) {  
                // currentUser ya está establecido por onAuthStateChanged o firebaseLoginWithEmailPassword  
                console.log(`✔️ Login exitoso con Firebase: ${firebaseResult.user.email} (${firebaseResult.user.role})`);  
                return { success: true, user: firebaseResult.user };  
            } else {  
                console.error(`❌ Error login Firebase: ${firebaseResult.message}`);  
                return firebaseResult;  
            }  
        } else {  
            // Fallback a login local si Firebase no está habilitado  
            console.log('Intentando login local...');  
            const userData = localStorage.getItem('user_' + email);  
            if (!userData) {  
                return { success: false, message: 'Usuario no encontrado' };  
            }  
            const user = JSON.parse(userData);  
            if (user.password !== password) {  
                return { success: false, message: 'Contraseña incorrecta' };  
            }  
            window.currentUser = user;  
            localStorage.setItem('currentUser', JSON.stringify(user));  
            console.log(`✔️ Login exitoso local: ${user.email} (${user.role})`);  
            return { success: true, user };  
        }  
    };  
  
    // Función de registro (ahora usa Firebase si está habilitado)  
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
            // Fallback a registro local si Firebase no está habilitado  
            console.log('Intentando registro local...');  
            if (localStorage.getItem('user_' + email)) {  
                return { success: false, message: 'El usuario ya existe' };  
            }  
            const newUser = { email: email, password: password, name: name || 'Usuario', role: 'user' };  
            localStorage.setItem('user_' + email, JSON.stringify(newUser));  
            console.log(`✔️ Usuario registrado local: ${email}`);  
            return { success: true, message: 'Usuario registrado correctamente' };  
        }  
    };  
  
    // Función de logout (ahora usa Firebase si está habilitado)  
    window.logoutUser = async function() {  
        if (!confirm('¿Seguro que quieres cerrar sesión?')) {  
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
            console.log('Intentando logout local...');  
            window.currentUser = null;  
            localStorage.removeItem('currentUser');  
            location.reload();  
        }  
    };  
  
    // Crear modal de login  
    function createLoginModal() {  
        const modal = document.createElement('div');  
        modal.id = 'loginModal';  
        modal.className = 'modal active'; // active por defecto  
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
                    <p style="font-size: 0.8em; margin-top: 10px;">Admin: tonaco92@gmail.com / 12345678 (Solo si Firebase deshabilitado)</p>  
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
        console.log('✔️ Modal de login creado');  
        window.switchLoginTab('login'); // Asegurarse de que la pestaña de login esté activa por defecto  
    }  
  
    // Cambiar entre pestañas  
    window.switchLoginTab = function(tab) {  
        const loginTab = document.getElementById('loginTab');  
        const registerTab = document.getElementById('registerTab');  
        const loginForm = document.getElementById('loginForm');  
        const registerForm = document.getElementById('registerForm');  
        const messageDiv = document.getElementById('loginMessage');  
        messageDiv.style.display = 'none'; // Limpiar mensajes al cambiar de pestaña  
  
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
  
    // Manejar login  
    window.handleLogin = async function() { // Hacerla asíncrona  
        const email = document.getElementById('loginEmail').value.trim();  
        const password = document.getElementById('loginPassword').value;  
        const messageDiv = document.getElementById('loginMessage');  
  
        if (!email || !password) {  
            messageDiv.style.display = 'block';  
            messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';  
            messageDiv.style.color = 'red';  
            messageDiv.textContent = '❗ Por favor, completa todos los campos';  
            return;  
        }  
  
        const result = await window.loginUser(email, password); // await aquí  
        if (result.success) {  
            messageDiv.style.display = 'block';  
            messageDiv.style.background = 'rgba(0, 255, 0, 0.2)';  
            messageDiv.style.color = '#00ff00';  
            messageDiv.textContent = '✔️ Bienvenido, ' + (result.user.name || result.user.email.split('@')[0]);  
            console.log(`✔️ Login exitoso: ${result.user.email} (${result.user.role})`);  
  
            // Cerrar modal después de 1 segundo  
            setTimeout(() => {  
                document.getElementById('loginModal').classList.remove('active');  
                addUserButtons(result.user);  
            }, 1000);  
        } else {  
            messageDiv.style.display = 'block';  
            messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';  
            messageDiv.style.color = 'red';  
            messageDiv.textContent = '❗ ' + result.message;  
        }  
    };  
  
    // Manejar registro  
    window.handleRegister = async function() { // Hacerla asíncrona  
        const name = document.getElementById('registerName').value.trim();  
        const email = document.getElementById('registerEmail').value.trim();  
        const password = document.getElementById('registerPassword').value;  
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;  
        const messageDiv = document.getElementById('loginMessage');  
  
        if (!name || !email || !password || !passwordConfirm) {  
            messageDiv.style.display = 'block';  
            messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';  
            messageDiv.style.color = 'red';  
            messageDiv.textContent = '❗ Por favor, completa todos los campos';  
            return;  
        }  
  
        if (password !== passwordConfirm) {  
            messageDiv.style.display = 'block';  
            messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';  
            messageDiv.style.color = 'red';  
            messageDiv.textContent = '❗ Las contraseñas no coinciden';  
            return;  
        }  
  
        if (password.length < 6) {  
            messageDiv.style.display = 'block';  
            messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';  
            messageDiv.style.color = 'red';  
            messageDiv.textContent = '❗ La contraseña debe tener al menos 6 caracteres';  
            return;  
        }  
  
        const result = await window.registerUser(email, password, name); // await aquí  
        if (result.success) {  
            messageDiv.style.display = 'block';  
            messageDiv.style.background = 'rgba(0, 255, 0, 0.2)';  
            messageDiv.style.color = '#00ff00';  
            messageDiv.textContent = '✔️ Cuenta creada. Puedes iniciar sesión ahora';  
            console.log(`✔️ Usuario registrado: ${email}`);  
  
            // Cambiar a pestaña de login después de 2 segundos  
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
            messageDiv.textContent = '❗ ' + result.message;  
        }  
    };  
  
    // Añadir botones de usuario al header  
    function addUserButtons(user) {  
        const headerInfo = document.querySelector('.header-info');  
        if (!headerInfo) {  
            console.warn('⚠️ No se encontró .header-info');  
            return;  
        }  
  
        // Limpiar botones existentes antes de añadir nuevos para evitar duplicados  
        const existingAdminBtn = document.getElementById('adminButton');  
        if (existingAdminBtn) existingAdminBtn.remove();  
        const existingLogoutBtn = document.getElementById('logoutButton');  
        if (existingLogoutBtn) existingLogoutBtn.remove();  
        const existingUserIndicator = document.getElementById('userIndicator');  
        if (existingUserIndicator) existingUserIndicator.remove();  
  
  
        // Añadir botón de admin si es admin  
        if (user.role === 'admin' && !document.getElementById('adminButton')) {  
            const adminBtn = document.createElement('button');  
            adminBtn.id = 'adminButton';  
            adminBtn.className = 'btn btn-sm';  
            adminBtn.innerHTML = '⚙️ Admin';  
            adminBtn.onclick = () => {  
                if (window.openAdminPanel) {  
                    window.openAdminPanel();  
                } else {  
                    alert('El panel de administración aún no está cargado');  
                }  
            };  
            adminBtn.style.background = '#ff9500';  
            headerInfo.insertBefore(adminBtn, headerInfo.firstChild);  
            console.log('✔️ Botón de Admin añadido');  
        }  
  
        // Añadir botón de logout  
        if (!document.getElementById('logoutButton')) {  
            const logoutBtn = document.createElement('button');  
            logoutBtn.id = 'logoutButton';  
            logoutBtn.className = 'btn btn-sm';  
            logoutBtn.innerHTML = '👋 Salir';  
            logoutBtn.onclick = window.logoutUser;  
            logoutBtn.style.background = '#c73446';  
            headerInfo.appendChild(logoutBtn);  
            console.log('✔️ Botón de Logout añadido');  
        }  
  
        // Añadir indicador de usuario  
        if (!document.getElementById('userIndicator')) {  
            const userIndicator = document.createElement('div');  
            userIndicator.id = 'userIndicator';  
            userIndicator.className = 'info-box';  
            // Corregido: Usar user.name con fallback al email  
            userIndicator.innerHTML = `👤 ${user.name || user.email.split('@')[0] || 'Usuario'}`;  
            headerInfo.insertBefore(userIndicator, headerInfo.firstChild);  
            console.log('✔️ Indicador de usuario añadido');  
        }  
    }  
  
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
        console.log('Initializing Login system...');  
  
        if (window.firebaseConfig?.enabled) {  
            // Si Firebase está habilitado, onAuthStateChanged (en firebase-config.js)  
            // se encargará de establecer window.currentUser y window.currentUserId  
            // y de llamar a addUserButtons. Esperamos a que la autenticación se resuelva.  
            window.authReadyPromise.then(uid => {  
                if (uid && window.currentUser) {  
                    console.log(`✅ Sesión Firebase restaurada para UID: ${uid}`);  
                    setTimeout(() => { // Pequeño retraso para asegurar que el DOM esté listo  
                        addUserButtons(window.currentUser);  
                    }, 500);   
                } else {  
                    console.log('⚪ No hay sesión activa de Firebase, mostrando modal de login.');  
                    createLoginModal();  
                }  
            }).catch(error => {  
                console.error('❌ Error esperando authReadyPromise:', error);  
                createLoginModal(); // Mostrar modal si hay un error en la promesa  
            });  
        } else {  
            // Si Firebase está deshabilitado, se usa solo el sistema de login local  
            const savedUser = localStorage.getItem('currentUser');  
            if (savedUser) {  
                try {  
                    window.currentUser = JSON.parse(savedUser);  
                    console.log(`✅ Sesión local restaurada: ${window.currentUser.email} (${window.currentUser.role})`);  
                    setTimeout(() => { // Pequeño retraso para asegurar que el DOM esté listo  
                        addUserButtons(window.currentUser);  
                    }, 500);  
                } catch (error) {  
                    console.error('❌ Error restaurando sesión local:', error);  
                    localStorage.removeItem('currentUser');  
                    createLoginModal();  
                }  
            } else {  
                console.log('⚪ No hay sesión local activa, mostrando modal de login');  
                createLoginModal();  
            }  
        }  
    });  
  
    console.log('✔️ Login UI Injector cargado correctamente');  
})();  
