// injector-login-ui.js
(function() {
    console.log('🔐 Login UI Injector cargando...');

    // Función de login CON FIREBASE (para todos los usuarios)
    window.loginUser = async function(email, password) {
        // Usar Firebase para TODOS los usuarios (incluido admin)
        if (window.firebaseAuth && window.firebaseConfig && window.firebaseConfig.enabled) {
            try {
                const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
                const userCredential = await signInWithEmailAndPassword(window.firebaseAuth, email, password);
                const user = userCredential.user;
                
                // Determinar si es admin basándose en el email
                const isAdmin = email === 'tonaco92@gmail.com';

                // Comprobar si el usuario está suspendido (solo para no-admin)
                if (!isAdmin) {
                    try {
                        const { getFirestore, doc, getDoc, setDoc, serverTimestamp } =
                            await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                        const firestore = getFirestore();
                        const userDoc = await getDoc(doc(firestore, 'game_users', user.uid));
                        if (userDoc.exists() && userDoc.data().suspended === true) {
                            // Cerrar sesión inmediatamente en Firebase Auth
                            const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
                            await signOut(window.firebaseAuth);
                            return { success: false, message: '🚫 Tu cuenta ha sido suspendida. Contacta con el administrador.' };
                        }
                        // Actualizar lastLogin
                        await setDoc(doc(firestore, 'game_users', user.uid), {
                            email: user.email,
                            name: user.displayName || user.email.split('@')[0],
                            lastLogin: serverTimestamp()
                        }, { merge: true });
                    } catch(e) {
                        console.warn('No se pudo comprobar game_users:', e);
                    }
                }
                
                const userData = {
                    email: user.email,
                    uid: user.uid,
                    role: isAdmin ? 'admin' : 'user',
                    name: user.displayName || (isAdmin ? 'Tonaco92 (Admin)' : email.split('@')[0])
                };
                
                window.currentUser = userData;
                window.currentUserId = userData.uid;
                localStorage.setItem('currentUser', JSON.stringify(userData));
                
                console.log('✅ Login exitoso en Firebase:', user.email, '- Role:', userData.role);
                return { success: true, user: userData };
                
            } catch (error) {
                console.error('❌ Error de Firebase Auth:', error);
                let message = 'Error de autenticación';
                if (error.code === 'auth/user-not-found') message = 'Usuario no encontrado';
                if (error.code === 'auth/wrong-password') message = 'Contraseña incorrecta';
                if (error.code === 'auth/invalid-email') message = 'Email inválido';
                if (error.code === 'auth/invalid-credential') message = 'Credenciales inválidas';
                return { success: false, message };
            }
        }
        
        return { success: false, message: 'Firebase no está disponible' };
    };

    // Función de registro (solo para usuarios normales)
    window.registerUser = async function(email, password, name) {
        // No permitir registrar el email de admin
        if (email === 'tonaco92@gmail.com') {
            return { success: false, message: 'Este email está reservado' };
        }
        
        if (window.firebaseAuth && window.firebaseConfig && window.firebaseConfig.enabled) {
            try {
                const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
                const userCredential = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
                const user = userCredential.user;
                
                // Actualizar perfil con el nombre
                // Actualizar perfil con el nombre
                if (name) {
                    await updateProfile(user, { displayName: name });
                }

                // Guardar en Firestore para que aparezca en el panel de admin
                try {
                    const { getFirestore, doc, setDoc, serverTimestamp } =
                        await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                    const firestore = getFirestore();
                    await setDoc(doc(firestore, 'game_users', user.uid), {
                        email,
                        name: name || email.split('@')[0],
                        suspended: false,
                        createdAt: serverTimestamp()
                    });
                    console.log('✅ Perfil guardado en Firestore para:', email);
                } catch (fsErr) {
                    console.warn('⚠️ No se pudo guardar en Firestore:', fsErr);
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

    // Función de logout CON FIREBASE
    window.logoutUser = async function() {
        if (!await window.pcfConfirmText('¿Seguro que quieres cerrar sesión?')) {
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
                        ¿No tienes cuenta? Regístrate arriba
                    </p>
                    <p style="margin-top: 8px;">
                        <button onclick="window.handleForgotPassword()" 
                                style="background: none; border: none; color: #e94560; cursor: pointer; font-size: 0.9em; text-decoration: underline; padding: 0;">
                            🔑 ¿Olvidaste tu contraseña?
                        </button>
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
                        <input type="password" id="registerPassword" placeholder="Mínimo 6 caracteres" 
                               style="width: 100%; padding: 12px;">
                    </div>
                    <div style="margin-bottom: 20px; text-align: left;">
                        <label style="display: block; margin-bottom: 5px; color: #e94560;">Confirmar Contraseña:</label>
                        <input type="password" id="registerPasswordConfirm" placeholder="Repite la contraseña" 
                               style="width: 100%; padding: 12px;">
                    </div>
                    <button class="btn" onclick="window.handleRegister()" style="width: 100%; padding: 15px; font-size: 1.1em;">
                        📝 Crear Cuenta
                    </button>
                </div>

                <!-- Mensaje de estado -->
                <div id="loginMessage" style="display: none; margin-top: 15px; padding: 10px; border-radius: 5px;"></div>
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
        const messageDiv = document.getElementById('loginMessage');

        messageDiv.style.display = 'none';

        if (tab === 'login') {
            loginTab.style.background = '#e94560';
            registerTab.style.background = 'rgba(233, 69, 96, 0.3)';
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        } else {
            registerTab.style.background = '#e94560';
            loginTab.style.background = 'rgba(233, 69, 96, 0.3)';
            registerForm.style.display = 'block';
            loginForm.style.display = 'none';
        }
    };

    // Manejar recuperación de contraseña
    window.handleForgotPassword = async function() {
        const email = document.getElementById('loginEmail').value.trim();
        const messageDiv = document.getElementById('loginMessage');

        if (!email) {
            messageDiv.style.display = 'block';
            messageDiv.style.background = 'rgba(255, 200, 0, 0.2)';
            messageDiv.style.color = 'orange';
            messageDiv.textContent = '⚠️ Introduce tu email arriba y pulsa el botón';
            return;
        }

        messageDiv.style.display = 'block';
        messageDiv.style.background = 'rgba(255, 255, 0, 0.2)';
        messageDiv.style.color = 'yellow';
        messageDiv.textContent = '⏳ Enviando email de recuperación...';

        try {
            const { sendPasswordResetEmail } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            await sendPasswordResetEmail(window.firebaseAuth, email);
            messageDiv.style.background = 'rgba(0, 255, 0, 0.2)';
            messageDiv.style.color = '#00ff00';
            messageDiv.textContent = '✅ Email enviado. Revisa tu bandeja de entrada';
        } catch (error) {
            messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';
            messageDiv.style.color = 'red';
            if (error.code === 'auth/user-not-found') {
                messageDiv.textContent = '❌ No existe ninguna cuenta con ese email';
            } else if (error.code === 'auth/invalid-email') {
                messageDiv.textContent = '❌ Email inválido';
            } else {
                messageDiv.textContent = '❌ Error: ' + error.message;
            }
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
            messageDiv.textContent = '❌ Por favor, ingresa email y contraseña';
            return;
        }

        // Mostrar mensaje de "Iniciando sesión..."
        messageDiv.style.display = 'block';
        messageDiv.style.background = 'rgba(255, 255, 0, 0.2)';
        messageDiv.style.color = 'yellow';
        messageDiv.textContent = '⏳ Iniciando sesión...';

        try {
            const result = await window.loginUser(email, password);
            
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
            const result = await window.registerUser(email, password, name);
            
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
            adminBtn.innerHTML = '<img class="pcf-ui-icon" src="assets/iconos/ui/boton-admin.webp" alt="" aria-hidden="true">Admin';
            adminBtn.onclick = () => {
                if (window.openAdminPanel) {
                    window.openAdminPanel();
                } else {
                    alert('El panel de administración aún no está cargado');
                }
            };
            // Estilo en pcf6-theme.css (#adminButton)
            headerInfo.insertBefore(adminBtn, headerInfo.firstChild);
            console.log('✅ Botón de Admin añadido');
        }

        // Añadir botón de logout
        if (!document.getElementById('logoutButton')) {
            const logoutBtn = document.createElement('button');
            logoutBtn.id = 'logoutButton';
            logoutBtn.className = 'btn btn-sm';
            logoutBtn.innerHTML = '<img class="pcf-ui-icon" src="assets/iconos/ui/boton-salir.webp" alt="" aria-hidden="true">Salir';
            logoutBtn.onclick = window.logoutUser;
            // Estilo en pcf6-theme.css (#logoutButton)
            headerInfo.appendChild(logoutBtn);
            console.log('✅ Botón de Logout añadido');
        }

        // Añadir indicador de usuario
        if (!document.getElementById('userIndicator')) {
            const userIndicator = document.createElement('div');
            userIndicator.id = 'userIndicator';
            userIndicator.className = 'info-box';
            userIndicator.innerHTML = `${user.name}`;
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

    // Inicializar - Escuchar cambios de autenticación de Firebase
    window.addEventListener('DOMContentLoaded', () => {
        console.log('🔐 Inicializando sistema de login...');
        
        // Esperar a que Firebase Auth esté listo
        if (window.authReadyPromise) {
            window.authReadyPromise.then(() => {
                // Verificar si hay usuario autenticado en Firebase
                const auth = window.firebaseAuth;
                if (auth && auth.currentUser) {
                    const user = auth.currentUser;
                    const isAdmin = user.email === 'tonaco92@gmail.com';
                    
                    const userData = {
                        email: user.email,
                        uid: user.uid,
                        role: isAdmin ? 'admin' : 'user',
                        name: user.displayName || (isAdmin ? 'Tonaco92 (Admin)' : user.email.split('@')[0])
                    };
                    
                    window.currentUser = userData;
                    window.currentUserId = userData.uid;
                    localStorage.setItem('currentUser', JSON.stringify(userData));
                    
                    console.log(`✅ Sesión restaurada desde Firebase: ${userData.email} (${userData.role})`);
                    
                    setTimeout(() => {
                        addUserButtons(userData);
                    }, 1000);
                } else {
                    // No hay sesión, mostrar modal de login
                    console.log('⚠️ No hay sesión activa, mostrando modal de login');
                    createLoginModal();
                }
            });
        } else {
            // Firebase no disponible, mostrar modal
            createLoginModal();
        }
    });

    console.log('✅ Login UI Injector cargado correctamente');
})();
