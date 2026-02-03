// injector-login-ui.js
(function() {
    console.log('🔐 Login UI Injector cargando...');

    // Usuarios por defecto - SOLO ADMIN
    const DEFAULT_USERS = {
        'tonaco92@gmail.com': { 
            email: 'tonaco92@gmail.com', 
            password: '12345678', 
            role: 'admin',
            name: 'Antonio (Admin)'
        }
    };

    // Guardar usuarios por defecto si no existen
    Object.values(DEFAULT_USERS).forEach(user => {
        if (!localStorage.getItem('user_' + user.email)) {
            localStorage.setItem('user_' + user.email, JSON.stringify(user));
            console.log(`✅ Usuario por defecto creado: ${user.email}`);
        }
    });

    // Función de login
 // Función de login CON FIREBASE
window.loginUser = async function(email, password) {
    // Login especial para admin (mantener en local)
    if (email === 'tonaco92@gmail.com' && password === '12345678') {
        const adminUser = {
            email: email,
            uid: 'admin-local-uid',
            role: 'admin',
            name: 'Tonaco92 (Admin)'
        };
        
        window.currentUser = adminUser;
        window.currentUserId = adminUser.uid;
        localStorage.setItem('currentUser', JSON.stringify(adminUser));

         // 🔥 HABILITAR BOTÓN DE GUARDAR MANUALMENTE
    setTimeout(() => {
        const saveBtn = document.querySelector('button[onclick="window.saveCurrentGame()"]');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.style.opacity = '1';
            console.log('✅ Botón de guardar habilitado para admin');
        }
    }, 500);
        
        return { success: true, user: adminUser };
    }
    
    // Para otros usuarios, usar Firebase
    if (window.firebaseAuth && window.firebaseConfig && window.firebaseConfig.enabled) {
        try {
            const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            const userCredential = await signInWithEmailAndPassword(window.firebaseAuth, email, password);
            const user = userCredential.user;
            
            const userData = {
                email: user.email,
                uid: user.uid,
                role: 'user',
                name: user.displayName || email.split('@')[0]
            };
            
            window.currentUser = userData;
            window.currentUserId = userData.uid;
            localStorage.setItem('currentUser', JSON.stringify(userData));
            
            console.log('✅ Login exitoso en Firebase:', user.email);
            return { success: true, user: userData };
            
        } catch (error) {
            console.error('❌ Error de Firebase Auth:', error);
            let message = 'Error de autenticación';
            if (error.code === 'auth/user-not-found') message = 'Usuario no encontrado';
            if (error.code === 'auth/wrong-password') message = 'Contraseña incorrecta';
            if (error.code === 'auth/invalid-email') message = 'Email inválido';
            return { success: false, message };
        }
    }
    
    return { success: false, message: 'Firebase no está disponible' };
};

    // Función de registro (solo para usuarios normales)
   // Función de registro CON FIREBASE
window.registerUser = async function(email, password, name) {
    if (window.firebaseAuth && window.firebaseConfig && window.firebaseConfig.enabled) {
        try {
            const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            const userCredential = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
            const user = userCredential.user;
            
            // Actualizar perfil con el nombre
            if (name) {
                await updateProfile(user, { displayName: name });
            }
            
            console.log('✅ Usuario registrado en Firebase:', email);
            return { success: true, message: 'Usuario registrado correctamente' };
            
        } catch (error) {
            console.error('❌ Error registrando en Firebase:', error);
            let message = 'Error al registrar usuario';
            if (error.code === 'auth/email-already-in-use') message = 'Este email ya está registrado';
            if (error.code === 'auth/weak-password') message = 'La contraseña debe tener al menos 6 caracteres';
            if (error.code === 'auth/invalid-email') message = 'Email inválido';
            return { success: false, message };
        }
    }
    
    return { success: false, message: 'Firebase no está disponible' };
};
    // Función de logout
 // Función de logout CON FIREBASE
window.logoutUser = async function() {
    if (!confirm('¿Seguro que quieres cerrar sesión?')) {
        return;
    }
    
    // Cerrar sesión en Firebase
    if (window.firebaseAuth && window.firebaseConfig && window.firebaseConfig.enabled) {
        try {
            const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            await signOut(window.firebaseAuth);
            console.log('✅ Sesión cerrada en Firebase');
        } catch (error) {
            console.error('❌ Error cerrando sesión en Firebase:', error);
        }
    }
    
    window.currentUser = null;
    window.currentUserId = null;
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
                    <button id="loginTab" class="btn" onclick="window.switchLoginTab('login')" 
                            style="flex: 1; border-radius: 0; background: #e94560;">
                        Iniciar Sesión
                    </button>
                    <button id="registerTab" class="btn" onclick="window.switchLoginTab('register')" 
                            style="flex: 1; border-radius: 0; background: rgba(233, 69, 96, 0.3);">
                        Registrarse
                    </button>
                </div>

                <!-- Formulario de Login -->
                <div id="loginForm" style="display: block;">
                    <div style="margin-bottom: 15px; text-align: left;">
                        <label style="display: block; margin-bottom: 5px; color: #e94560;">Email:</label>
                        <input type="email" id="loginEmail" placeholder="correo@ejemplo.com" 
                               style="width: 100%; padding: 12px;">
                    </div>
                    <div style="margin-bottom: 20px; text-align: left;">
                        <label style="display: block; margin-bottom: 5px; color: #e94560;">Contraseña:</label>
                        <input type="password" id="loginPassword" placeholder="••••••••" 
                               style="width: 100%; padding: 12px;">
                    </div>
                    <button class="btn" onclick="window.handleLogin()" style="width: 100%; padding: 15px; font-size: 1.1em;">
                        🔓 Entrar
                    </button>
                    <p style="margin-top: 15px; color: #999; font-size: 0.9em;">
                        Admin: tonaco92@gmail.com / 12345678
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
                    <button class="btn" onclick="window.handleRegister()" style="width: 100%; padding: 15px; font-size: 1.1em;">
                        ✍️ Crear Cuenta
                    </button>
                    <p style="margin-top: 10px; color: #999; font-size: 0.85em;">
                        Las cuentas registradas son de usuario normal (no admin)
                    </p>
                </div>

                <div id="loginMessage" style="margin-top: 15px; padding: 10px; border-radius: 5px; display: none;"></div>
            </div>
        `;
        document.body.appendChild(modal);
        console.log('✅ Modal de login creado');
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
window.handleLogin = async function() {
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

    // Mostrar mensaje de "Iniciando sesión..."
    messageDiv.style.display = 'block';
    messageDiv.style.background = 'rgba(255, 255, 0, 0.2)';
    messageDiv.style.color = 'yellow';
    messageDiv.textContent = '⏳ Iniciando sesión...';

    try {
        const result = await window.loginUser(email, password); // ← AWAIT aquí
        
        if (result.success) {
            messageDiv.style.display = 'block';
            messageDiv.style.background = 'rgba(0, 255, 0, 0.2)';
            messageDiv.style.color = '#00ff00';
            messageDiv.textContent = '✅ Bienvenido, ' + result.user.name;

            console.log(`✅ Login exitoso: ${result.user.email} (${result.user.role})`);

            // Cerrar modal después de 1 segundo
            setTimeout(() => {
                document.getElementById('loginModal').classList.remove('active');
                addUserButtons(result.user);
            }, 1000);
        } else {
            messageDiv.style.display = 'block';
            messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';
            messageDiv.style.color = 'red';
            messageDiv.textContent = '❌ ' + result.message;
        }
    } catch (error) {
        console.error('❌ Error en handleLogin:', error);
        messageDiv.style.display = 'block';
        messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';
        messageDiv.style.color = 'red';
        messageDiv.textContent = '❌ Error: ' + error.message;
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

    // Mostrar mensaje de "Registrando..."
    messageDiv.style.display = 'block';
    messageDiv.style.background = 'rgba(255, 255, 0, 0.2)';
    messageDiv.style.color = 'yellow';
    messageDiv.textContent = '⏳ Registrando usuario...';

    try {
        const result = await window.registerUser(email, password, name); // ← AWAIT aquí
        
        if (result.success) {
            messageDiv.style.display = 'block';
            messageDiv.style.background = 'rgba(0, 255, 0, 0.2)';
            messageDiv.style.color = '#00ff00';
            messageDiv.textContent = '✅ Cuenta creada. Puedes iniciar sesión ahora';

            console.log(`✅ Usuario registrado: ${email}`);

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
            messageDiv.textContent = '❌ ' + result.message;
        }
    } catch (error) {
        console.error('❌ Error en handleRegister:', error);
        messageDiv.style.display = 'block';
        messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';
        messageDiv.style.color = 'red';
        messageDiv.textContent = '❌ Error: ' + error.message;
    }
};

    // Añadir botones de usuario al header
    function addUserButtons(user) {
        const headerInfo = document.querySelector('.header-info');
        if (!headerInfo) {
            console.warn('⚠️ No se encontró .header-info');
            return;
        }

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
            console.log('✅ Botón de Admin añadido');
        }

        // Añadir botón de logout
        if (!document.getElementById('logoutButton')) {
            const logoutBtn = document.createElement('button');
            logoutBtn.id = 'logoutButton';
            logoutBtn.className = 'btn btn-sm';
            logoutBtn.innerHTML = '🚪 Salir';
            logoutBtn.onclick = window.logoutUser;
            logoutBtn.style.background = '#c73446';
            headerInfo.appendChild(logoutBtn);
            console.log('✅ Botón de Logout añadido');
        }

        // Añadir indicador de usuario
        if (!document.getElementById('userIndicator')) {
            const userIndicator = document.createElement('div');
            userIndicator.id = 'userIndicator';
            userIndicator.className = 'info-box';
            userIndicator.innerHTML = `👤 ${user.name}`;
            headerInfo.insertBefore(userIndicator, headerInfo.firstChild);
            console.log('✅ Indicador de usuario añadido');
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
        console.log('🔐 Inicializando sistema de login...');
        
        // Verificar si hay sesión guardada
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                window.currentUser = JSON.parse(savedUser);
                console.log(`✅ Sesión restaurada: ${window.currentUser.email} (${window.currentUser.role})`);
                
                // Esperar a que el DOM esté completamente cargado
                setTimeout(() => {
                    addUserButtons(window.currentUser);
                }, 1000);
            } catch (error) {
                console.error('❌ Error restaurando sesión:', error);
                localStorage.removeItem('currentUser');
                createLoginModal();
            }
        } else {
            // No hay sesión, mostrar modal de login
            console.log('⚠️ No hay sesión activa, mostrando modal de login');
            createLoginModal();
        }
    });

    console.log('✅ Login UI Injector cargado correctamente');
})();
