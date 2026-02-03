// injector-login-ui.js  
// Importar funciones de autenticación de Firebase  
import {   
    getAuth,   
    signInWithEmailAndPassword,   
    createUserWithEmailAndPassword,  
    signOut // También necesitaremos signOut para el logout  
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';  
  
(function() {  
    console.log('🔐 Login UI Injector cargando...');  
  
    // NOTA IMPORTANTE: Los usuarios por defecto en localStorage ya no son necesarios  
    // si usas Firebase Authentication. Firebase gestiona las cuentas.  
    // Este bloque podría eliminarse si quieres que los usuarios solo se registren en Firebase.  
    // Si aún quieres un "admin" local, tendrías que registrarlo manualmente en Firebase Auth  
    // o tener una lógica específica para reconocerlo.  
    /*  
    const DEFAULT_USERS = {  
        'tonaco92@gmail.com': {   
            email: 'tonaco92@gmail.com',   
            password: '12345678',   
            role: 'admin',  
            name: 'Antonio (Admin)'  
        }  
    };  
    Object.values(DEFAULT_USERS).forEach(user => {  
        if (!localStorage.getItem('user_' + user.email)) {  
            localStorage.setItem('user_' + user.email, JSON.stringify(user));  
            console.log(`✅ Usuario por defecto creado: ${user.email}`);  
        }  
    });  
    */  
  
    // Referencia al objeto de autenticación de Firebase  
    let auth;  
    if (window.firebaseAuth) { // Asegúrate de que Firebase Auth esté inicializado en firebase-config.js  
        auth = window.firebaseAuth;  
    } else {  
        console.error('❌ Firebase Auth no está disponible. Asegúrate de que firebase-config.js se cargue primero.');  
        // Fallback o manejo de error. El login no funcionará sin Firebase Auth.  
        return;   
    }  
  
    // --- Función para obtener el rol del usuario (Firebase no guarda roles directamente) ---  
    // Tendrás que decidir cómo gestionas los roles. O bien:  
    // 1. Guardas los roles en Firestore junto con el UID del usuario (recomendado).  
    // 2. Tienes una lista predefinida de admins (menos escalable).  
    // Por ahora, asumiré que solo hay roles 'admin' o 'user'.  
    async function getUserRole(user) {  
        // Ejemplo simple: si el email coincide con un admin predefinido, es admin.  
        // O podrías buscar en Firestore: await getDoc(doc(window.firebaseDB, 'user_roles', user.uid));  
        if (user && user.email === 'tonaco92@gmail.com') {  
            return 'admin';  
        }  
        return 'user';  
    }  
  
  
    // Función de login (AHORA CON FIREBASE)  
    window.loginUser = async function(email, password) {  
        try {  
            const userCredential = await signInWithEmailAndPassword(auth, email, password);  
            const user = userCredential.user;  
              
            // Obtener el rol del usuario  
            const role = await getUserRole(user);  
              
            // Establecer el currentUser global (ya no se guarda en localStorage)  
            window.currentUser = {  
                email: user.email,  
                uid: user.uid, // ¡Importante! El UID de Firebase  
                name: user.displayName || user.email, // displayName puede no estar establecido  
                role: role  
            };  
              
            console.log(`✅ Login exitoso en Firebase: ${user.email}`);  
            return { success: true, user: window.currentUser };  
  
        } catch (error) {  
            console.error('❌ Error de login en Firebase:', error.code, error.message);  
            let errorMessage = 'Error al iniciar sesión.';  
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {  
                errorMessage = 'Credenciales incorrectas.';  
            } else if (error.code === 'auth/invalid-email') {  
                errorMessage = 'Email inválido.';  
            }  
            return { success: false, message: errorMessage };  
        }  
    };  
  
    // Función de registro (AHORA CON FIREBASE)  
    window.registerUser = async function(email, password, name) {  
        try {  
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);  
            const user = userCredential.user;  
  
            // Actualizar el perfil del usuario con el nombre si se desea (opcional)  
            // await updateProfile(user, { displayName: name }); // Necesitaría importar updateProfile  
  
            // Por defecto, los usuarios registrados son 'user'  
            window.currentUser = {  
                email: user.email,  
                uid: user.uid,  
                name: name || user.email,  
                role: 'user'  
            };  
  
            // Aquí podrías guardar el rol en Firestore si lo gestionas allí  
            // await setDoc(doc(window.firebaseDB, 'user_roles', user.uid), { role: 'user' });  
  
            console.log(`✅ Registro exitoso en Firebase: ${user.email}`);  
            return { success: true, user: window.currentUser, message: 'Usuario registrado correctamente' };  
  
        } catch (error) {  
            console.error('❌ Error de registro en Firebase:', error.code, error.message);  
            let errorMessage = 'Error al registrar usuario.';  
            if (error.code === 'auth/email-already-in-use') {  
                errorMessage = 'El email ya está en uso.';  
            } else if (error.code === 'auth/weak-password') {  
                errorMessage = 'La contraseña es demasiado débil.';  
            } else if (error.code === 'auth/invalid-email') {  
                errorMessage = 'Email inválido.';  
            }  
            return { success: false, message: errorMessage };  
        }  
    };  
  
    // Función de logout (AHORA CON FIREBASE)  
    window.logoutUser = async function() {  
        if (!confirm('¿Seguro que quieres cerrar sesión?')) {  
            return;  
        }  
          
        try {  
            await signOut(auth);  
            window.currentUser = null;  
            // Ya no es necesario limpiar localStorage. La recarga de la página y onAuthStateChanged  
            // manejarán el estado correctamente.  
            console.log('✅ Sesión cerrada en Firebase.');  
            location.reload(); // Recargar la página para limpiar el estado y mostrar el modal de login  
        } catch (error) {  
            console.error('❌ Error al cerrar sesión en Firebase:', error);  
            alert('Error al cerrar sesión: ' + error.message);  
        }  
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
                        Admin: tonaco92@gmail.com / 12345678 (Registrar en Firebase Auth)  
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
  
    // Manejar login (AHORA USA window.loginUser CON FIREBASE)  
    window.handleLogin = async function() { // Marcar como async  
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
  
        const result = await window.loginUser(email, password); // Esperar el resultado  
          
        if (result.success) {  
            messageDiv.style.display = 'block';  
            messageDiv.style.background = 'rgba(0, 255, 0, 0.2)';  
            messageDiv.style.color = '#00ff00';  
            messageDiv.textContent = '✅ Bienvenido, ' + result.user.name;  
  
            // No es necesario llamar a addUserButtons aquí, ya que onAuthStateChanged en firebase-config.js  
            // se encargará de actualizar window.currentUser y luego este script lo usará.  
            console.log(`✅ Login exitoso: ${result.user.email} (${result.user.role})`);  
  
            // Cerrar modal después de 1 segundo  
            setTimeout(() => {  
                document.getElementById('loginModal').classList.remove('active');  
                // La UI se actualizará automáticamente con onAuthStateChanged y las comprobaciones de currentUser  
            }, 1000);  
        } else {  
            messageDiv.style.display = 'block';  
            messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';  
            messageDiv.style.color = 'red';  
            messageDiv.textContent = '❌ ' + result.message;  
        }  
    };  
  
    // Manejar registro (AHORA USA window.registerUser CON FIREBASE)  
    window.handleRegister = async function() { // Marcar como async  
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
  
        const result = await window.registerUser(email, password, name); // Esperar el resultado  
          
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
    };  
  
    // Añadir botones de usuario al header  
    function addUserButtons(user) {  
        const headerInfo = document.querySelector('.header-info');  
        if (!headerInfo) {  
            console.warn('⚠️ No se encontró .header-info');  
            return;  
        }  
  
        // Limpiar botones existentes si los hay (para evitar duplicados al refrescar el usuario)  
        const existingAdminBtn = document.getElementById('adminButton');  
        const existingLogoutBtn = document.getElementById('logoutButton');  
        const existingUserIndicator = document.getElementById('userIndicator');  
        if (existingAdminBtn) existingAdminBtn.remove();  
        if (existingLogoutBtn) existingLogoutBtn.remove();  
        if (existingUserIndicator) existingUserIndicator.remove();  
  
        // Añadir botón de admin si es admin  
        if (user.role === 'admin') {  
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
        const logoutBtn = document.createElement('button');  
        logoutBtn.id = 'logoutButton';  
        logoutBtn.className = 'btn btn-sm';  
        logoutBtn.innerHTML = '🚪 Salir';  
        logoutBtn.onclick = window.logoutUser;  
        logoutBtn.style.background = '#c73446';  
        headerInfo.appendChild(logoutBtn);  
        console.log('✅ Botón de Logout añadido');  
  
        // Añadir indicador de usuario  
        const userIndicator = document.createElement('div');  
        userIndicator.id = 'userIndicator';  
        userIndicator.className = 'info-box';  
        userIndicator.innerHTML = `👤 ${user.name || user.email}`; // Usar nombre o email si no hay nombre  
        headerInfo.insertBefore(userIndicator, headerInfo.firstChild);  
        console.log('✅ Indicador de usuario añadido');  
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
  
    // Inicialización al cargar el DOM  
    window.addEventListener('DOMContentLoaded', () => {  
        console.log('🔐 Inicializando sistema de login...');  
          
        // Listener de autenticación de Firebase (definido en firebase-config.js)  
        // Usamos el listener de firebase-config.js para centralizar el estado de autenticación  
        window.firebaseAuth.onAuthStateChanged(async (user) => {  
            const loginModal = document.getElementById('loginModal');  
            if (user) {  
                // Usuario logueado en Firebase  
                const role = await getUserRole(user);  
                window.currentUser = {  
                    email: user.email,  
                    uid: user.uid,  
                    name: user.displayName || user.email,  
                    role: role  
                };  
                console.log(`✅ Sesión Firebase restaurada para: ${user.email} (UID: ${user.uid})`);  
                  
                if (loginModal) {  
                    loginModal.classList.remove('active'); // Cerrar modal si está abierto  
                }  
                addUserButtons(window.currentUser);  
            } else {  
                // No hay usuario logueado en Firebase  
                window.currentUser = null;  
                // Eliminar botones de usuario si existen  
                const existingAdminBtn = document.getElementById('adminButton');  
                const existingLogoutBtn = document.getElementById('logoutButton');  
                const existingUserIndicator = document.getElementById('userIndicator');  
                if (existingAdminBtn) existingAdminBtn.remove();  
                if (existingLogoutBtn) existingLogoutBtn.remove();  
                if (existingUserIndicator) existingUserIndicator.remove();  
  
                // Si no hay sesión activa, mostrar el modal de login  
                if (!loginModal) { // Solo crear si no existe  
                    createLoginModal();  
                } else if (!loginModal.classList.contains('active')) { // Mostrar si existe pero no está activo  
                    loginModal.classList.add('active');  
                }  
                console.log('⚠️ No hay sesión activa de Firebase, mostrando modal de login');  
            }  
        });  
    });  
  
    console.log('✅ Login UI Injector cargado correctamente');  
})();  
