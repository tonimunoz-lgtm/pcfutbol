// injector-login-ui.js
(function() {
    // Usuarios por defecto
    const DEFAULT_USERS = {
        'tonaco92@gmail.com': { 
            email: 'tonaco92@gmail.com', 
            password: '12345678', 
            role: 'admin',
            name: 'Administrador'
        },
        'user@demo.com': {
            email: 'user@demo.com',
            password: 'demo123',
            role: 'user',
            name: 'Usuario Demo'
        }
    };

    // Guardar usuarios por defecto si no existen
    Object.values(DEFAULT_USERS).forEach(user => {
        if (!localStorage.getItem('user_' + user.email)) {
            localStorage.setItem('user_' + user.email, JSON.stringify(user));
        }
    });

    // Función de login
    window.loginUser = function(email, password) {
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
        
        return { success: true, user };
    };

    // Función de registro
    window.registerUser = function(email, password, name) {
        if (localStorage.getItem('user_' + email)) {
            return { success: false, message: 'El usuario ya existe' };
        }
        
        const newUser = {
            email: email,
            password: password,
            name: name || 'Usuario',
            role: 'user'
        };
        
        localStorage.setItem('user_' + email, JSON.stringify(newUser));
        return { success: true, message: 'Usuario registrado correctamente' };
    };

    // Función de logout
    window.logoutUser = function() {
        window.currentUser = null;
        localStorage.removeItem('currentUser');
        location.reload();
    };

    // Crear modal de login
    function createLoginModal() {
        const modal = document.createElement('div');
        modal.id = 'loginModal';
        modal.className = 'modal active'; // active por defecto
        modal.style.zIndex = '10000';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 450px; text-align: center;">
                <h1 style="color: #e94560; margin-bottom: 30px;">⚽ PC FÚTBOL MANAGER</h1>
                
                <!-- Pestañas -->
                <div style="display: flex; margin-bottom: 20px; border-bottom: 2px solid #e94560;">
                    <button id="loginTab" class="btn" onclick="switchLoginTab('login')" 
                            style="flex: 1; border-radius: 0; background: #e94560;">
                        Iniciar Sesión
                    </button>
                    <button id="registerTab" class="btn" onclick="switchLoginTab('register')" 
                            style="flex: 1; border-radius: 0; background: rgba(233, 69, 96, 0.3);">
                        Registrarse
                    </button>
                </div>

                <!-- Formulario de Login -->
                <div id="loginForm" style="display: block;">
                    <div style="margin-bottom: 15px; text-align: left;">
                        <label style="display: block; margin-bottom: 5px; color: #e94560;">Email:</label>
                        <input type="email" id="loginEmail" placeholder="correo@ejemplo.com" 
                               style="width: 100%; padding: 12px;" value="tonaco92@gmail.com">
                    </div>
                    <div style="margin-bottom: 20px; text-align: left;">
                        <label style="display: block; margin-bottom: 5px; color: #e94560;">Contraseña:</label>
                        <input type="password" id="loginPassword" placeholder="••••••••" 
                               style="width: 100%; padding: 12px;" value="12345678">
                    </div>
                    <button class="btn" onclick="handleLogin()" style="width: 100%; padding: 15px; font-size: 1.1em;">
                        🔓 Entrar
                    </button>
                    <p style="margin-top: 15px; color: #999; font-size: 0.9em;">
                        Demo: tonaco92@gmail.com / 12345678
                    </p>
                </div>

                <!-- Formulario de Registro -->
                <div id="registerForm" style="display: none;">
                    <div style="margin-bottom: 15px; text-align: left;">
                        <label style="display: block; margin-bottom: 5px; color: #e94560;">Nombre:</label>
                        <input type="text" id="registerName" placeholder="Tu nombre" 
                               style="width: 100%; padding: 12px;">
                    </div>
                    <div style="margin-bottom: 15px; text-align: left;">
                        <label style="display: block; margin-bottom: 5px; color: #e94560;">Email:</label>
                        <input type="email" id="registerEmail" placeholder="correo@ejemplo.com" 
                               style="width: 100%; padding: 12px;">
                    </div>
                    <div style="margin-bottom: 15px; text-align: left;">
                        <label style="display: block; margin-bottom: 5px; color: #e94560;">Contraseña:</label>
                        <input type="password" id="registerPassword" placeholder="••••••••" 
                               style="width: 100%; padding: 12px;">
                    </div>
                    <div style="margin-bottom: 20px; text-align: left;">
                        <label style="display: block; margin-bottom: 5px; color: #e94560;">Confirmar Contraseña:</label>
                        <input type="password" id="registerPasswordConfirm" placeholder="••••••••" 
                               style="width: 100%; padding: 12px;">
                    </div>
                    <button class="btn" onclick="handleRegister()" style="width: 100%; padding: 15px; font-size: 1.1em;">
                        ✍️ Crear Cuenta
                    </button>
                </div>

                <div id="loginMessage" style="margin-top: 15px; padding: 10px; border-radius: 5px; display: none;"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Cambiar entre pestañas
    window.switchLoginTab = function(tab) {
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

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
    window.handleLogin = function() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const messageDiv = document.getElementById('loginMessage');

        if (!email || !password) {
            messageDiv.style.display = 'block';
            messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';
            messageDiv.style.color = 'red';
            messageDiv.textContent = '❌ Por favor, completa todos los campos';
            return;
        }

        const result = window.loginUser(email, password);
        
        if (result.success) {
            messageDiv.style.display = 'block';
            messageDiv.style.background = 'rgba(0, 255, 0, 0.2)';
            messageDiv.style.color = '#00ff00';
            messageDiv.textContent = '✅ Bienvenido, ' + result.user.name;

            // Añadir botón de admin si es admin
            if (result.user.role === 'admin') {
                setTimeout(() => {
                    const headerInfo = document.querySelector('.header-info');
                    if (headerInfo && !document.getElementById('adminButton')) {
                        const adminBtn = document.createElement('button');
                        adminBtn.id = 'adminButton';
                        adminBtn.className = 'btn btn-sm';
                        adminBtn.innerHTML = '⚙️ Admin';
                        adminBtn.onclick = () => window.openAdminPanel();
                        adminBtn.style.background = '#ff9500';
                        headerInfo.insertBefore(adminBtn, headerInfo.firstChild);
                    }
                }, 100);
            }

            // Añadir botón de logout
            setTimeout(() => {
                const headerInfo = document.querySelector('.header-info');
                if (headerInfo && !document.getElementById('logoutButton')) {
                    const logoutBtn = document.createElement('button');
                    logoutBtn.id = 'logoutButton';
                    logoutBtn.className = 'btn btn-sm';
                    logoutBtn.innerHTML = '🚪 Salir';
                    logoutBtn.onclick = () => {
                        if (confirm('¿Seguro que quieres cerrar sesión?')) {
                            window.logoutUser();
                        }
                    };
                    logoutBtn.style.background = '#c73446';
                    headerInfo.appendChild(logoutBtn);
                }
            }, 100);

            // Cerrar modal después de 1 segundo
            setTimeout(() => {
                document.getElementById('loginModal').classList.remove('active');
            }, 1000);
        } else {
            messageDiv.style.display = 'block';
            messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';
            messageDiv.style.color = 'red';
            messageDiv.textContent = '❌ ' + result.message;
        }
    };

    // Manejar registro
    window.handleRegister = function() {
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
        const messageDiv = document.getElementById('loginMessage');

        if (!name || !email || !password || !passwordConfirm) {
            messageDiv.style.display = 'block';
            messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';
            messageDiv.style.color = 'red';
            messageDiv.textContent = '❌ Por favor, completa todos los campos';
            return;
        }

        if (password !== passwordConfirm) {
            messageDiv.style.display = 'block';
            messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';
            messageDiv.style.color = 'red';
            messageDiv.textContent = '❌ Las contraseñas no coinciden';
            return;
        }

        if (password.length < 6) {
            messageDiv.style.display = 'block';
            messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';
            messageDiv.style.color = 'red';
            messageDiv.textContent = '❌ La contraseña debe tener al menos 6 caracteres';
            return;
        }

        const result = window.registerUser(email, password, name);
        
        if (result.success) {
            messageDiv.style.display = 'block';
            messageDiv.style.background = 'rgba(0, 255, 0, 0.2)';
            messageDiv.style.color = '#00ff00';
            messageDiv.textContent = '✅ Cuenta creada. Puedes iniciar sesión ahora';

            // Cambiar a pestaña de login después de 2 segundos
            setTimeout(() => {
                window.switchLoginTab('login');
                document.getElementById('loginEmail').value = email;
                messageDiv.style.display = 'none';
            }, 2000);
        } else {
            messageDiv.style.display = 'block';
            messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';
            messageDiv.style.color = 'red';
            messageDiv.textContent = '❌ ' + result.message;
        }
    };

    // Permitir login con Enter
    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            if (document.getElementById('loginForm').style.display !== 'none') {
                handleLogin();
            } else if (document.getElementById('registerForm').style.display !== 'none') {
                handleRegister();
            }
        }
    });

    // Inicializar
    window.addEventListener('DOMContentLoaded', () => {
        // Verificar si hay sesión guardada
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            window.currentUser = JSON.parse(savedUser);
            
            // Añadir botón de admin si es admin
            if (window.currentUser.role === 'admin') {
                setTimeout(() => {
                    const headerInfo = document.querySelector('.header-info');
                    if (headerInfo && !document.getElementById('adminButton')) {
                        const adminBtn = document.createElement('button');
                        adminBtn.id = 'adminButton';
                        adminBtn.className = 'btn btn-sm';
                        adminBtn.innerHTML = '⚙️ Admin';
                        adminBtn.onclick = () => window.openAdminPanel();
                        adminBtn.style.background = '#ff9500';
                        headerInfo.insertBefore(adminBtn, headerInfo.firstChild);
                    }
                }, 1000);
            }

            // Añadir botón de logout
            setTimeout(() => {
                const headerInfo = document.querySelector('.header-info');
                if (headerInfo && !document.getElementById('logoutButton')) {
                    const logoutBtn = document.createElement('button');
                    logoutBtn.id = 'logoutButton';
                    logoutBtn.className = 'btn btn-sm';
                    logoutBtn.innerHTML = '🚪 Salir';
                    logoutBtn.onclick = () => {
                        if (confirm('¿Seguro que quieres cerrar sesión?')) {
                            window.logoutUser();
                        }
                    };
                    logoutBtn.style.background = '#c73446';
                    headerInfo.appendChild(logoutBtn);
                }
            }, 1000);
        } else {
            // No hay sesión, mostrar modal de login
            createLoginModal();
        }
    });
})();
