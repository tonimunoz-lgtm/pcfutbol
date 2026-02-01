// firebase-config.js  
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';  
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';  
// Asegurarse de que signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut están importados  
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';   
  
// Configuración directa de Firebase (sin cambios)  
const firebaseConfig = {  
    enabled: true,   
    apiKey: "AIzaSyD9bNZkBzcB5__dpdn152WrsJ_HTl54xqs",  
    authDomain: "cuentacuentos-57631.firebaseapp.com",  
    projectId: "cuentacuentos-57631",  
    storageBucket: "cuentacuentos-57631.firebasestorage.app",  
    messagingSenderId: "654911737232",  
    appId: "1:654911737232:web:e87ecaea12351dd3d5b715"  
};  
  
let app = null;  
let db = null;  
let auth = null;  
let currentUserId = null;  
let authReady = false;  
  
let resolveAuthReady;  
const authReadyPromise = new Promise((resolve) => { resolveAuthReady = resolve; });  
window.authReadyPromise = authReadyPromise;   
  
if (firebaseConfig.enabled) {  
    try {  
        console.log('🔥 Inicializando Firebase...');  
        app = initializeApp(firebaseConfig);  
        db = getFirestore(app);  
        auth = getAuth(app);  
  
        window.firebaseApp = app;  
        window.firebaseDB = db;  
        window.firebaseAuth = auth;  
        window.firebaseConfig = firebaseConfig;  
  
        // *** CAMBIO CLAVE 1: ELIMINAR ESTE BLOQUE COMPLETO DE signInAnonymously ***  
        // Al deshabilitar la autenticación anónima en Firebase Console, este código no tendría efecto  
        // o generaría un error, así que lo eliminamos.  
        // signInAnonymously(auth)   
        //     .then(() => { console.log('✅ Autenticación anónima iniciada'); })  
        //     .catch(error => {   
        //         console.error('❌ Error en autenticación anónima:', error);   
        //         if (resolveAuthReady) { resolveAuthReady(null); resolveAuthReady = null; }  
        //     });  
  
        // Listener de cambios de autenticación  
        onAuthStateChanged(auth, async (user) => {   
            if (user) {  
                // Si el usuario es nulo o un usuario anónimo y no hay otra autenticación,  
                // no lo consideramos un usuario "válido" para guardar partidas.  
                // Firebase ahora solo nos dará un 'user' si está logueado con email/password.  
                if (user.isAnonymous) { // Esto es una verificación adicional, aunque la anterior línea debería evitarlo.  
                    currentUserId = null;  
                    window.currentUserId = null;  
                    authReady = false;  
                    window.currentUser = null;  
                    console.log('⚪ Usuario anónimo detectado y no permitido.');  
                    if (resolveAuthReady) { resolveAuthReady(null); resolveAuthReady = null; }  
                    if (window.updateFirebaseStatusIndicator) window.updateFirebaseStatusIndicator();  
                    if (window.removeUserButtons) { window.removeUserButtons(); }  
                    return; // SALIR si es anónimo  
                }  
  
                currentUserId = user.uid;  
                window.currentUserId = user.uid;  
                authReady = true;  
                console.log('✅ Usuario autenticado con UID:', user.uid);  
  
                // Cargar metadatos del usuario (nombre, rol) desde Firestore  
                let userData = {   
                    email: user.email || 'unknown@example.com',   
                    uid: user.uid,   
                    role: 'user',   
                    name: user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario')   
                };  
                  
                if (db) {   
                    const userDocRef = doc(db, 'users_metadata', user.uid);  
                    const userDocSnap = await getDoc(userDocRef);  
                    if (userDocSnap.exists()) {  
                        userData = { ...userDocSnap.data(), uid: user.uid, email: user.email };  
                        if (user.displayName && userData.name !== user.displayName) {  
                             userData.name = user.displayName;  
                             await setDoc(userDocRef, { name: user.displayName }, { merge: true });  
                        }  
                    } else {  
                        await setDoc(userDocRef, {   
                            email: user.email,   
                            name: user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario'),   
                            role: 'user'   
                        });  
                    }  
                }  
                window.currentUser = userData;   
  
                if (resolveAuthReady) {  
                    resolveAuthReady(user.uid);  
                    // Para evitar que se resuelva múltiples veces en el ciclo de vida de la app,  
                    // especialmente si se loguea y desloguea varias veces sin recargar.  
                    // Podríamos crear una nueva promesa cada vez que se espera.  
                    // Por ahora, para simplificar, se mantiene la resolución única.  
                    resolveAuthReady = null;   
                    window.authReadyPromise = new Promise((resolve) => { resolveAuthReady = resolve; }); // Crear nueva promesa  
                }  
  
                const saveBtn = document.querySelector('button[onclick="window.saveCurrentGame()"]');  
                if (saveBtn) { saveBtn.disabled = false; saveBtn.style.opacity = '1'; }  
                if (window.updateFirebaseStatusIndicator) window.updateFirebaseStatusIndicator();  
  
                if (window.addUserButtons && window.currentUser) {  
                    window.addUserButtons(window.currentUser);  
                }  
  
            } else { // No hay usuario autenticado (email/password)  
                currentUserId = null;  
                window.currentUserId = null;  
                authReady = false;  
                window.currentUser = null;  
                console.log('⚪ Usuario no autenticado (email/password).');  
  
                const saveBtn = document.querySelector('button[onclick="window.saveCurrentGame()"]');  
                if (saveBtn) { saveBtn.disabled = true; saveBtn.style.opacity = '0.5'; }  
  
                if (resolveAuthReady) {  
                    resolveAuthReady(null);  
                    resolveAuthReady = null;  
                    window.authReadyPromise = new Promise((resolve) => { resolveAuthReady = resolve; }); // Crear nueva promesa  
                }  
                if (window.updateFirebaseStatusIndicator) window.updateFirebaseStatusIndicator();  
  
                if (window.removeUserButtons) {  
                    window.removeUserButtons();  
                }  
            }  
        });  
        console.log('✅ Firebase inicializado correctamente');  
    } catch (error) {  
        console.error('❌ Error inicializando Firebase:', error);  
        window.firebaseConfig = { enabled: false };  
        if (resolveAuthReady) {   
            resolveAuthReady(null);   
            resolveAuthReady = null;   
            window.authReadyPromise = new Promise((resolve) => { resolveAuthReady = resolve; }); // Crear nueva promesa  
        }  
    }  
} else {  
    console.log('⚪ Firebase deshabilitado en la configuración');  
    window.firebaseConfig = { enabled: false };  
    if (resolveAuthReady) {   
        resolveAuthReady(null);   
        resolveAuthReady = null;   
        window.authReadyPromise = new Promise((resolve) => { resolveAuthReady = resolve; }); // Crear nueva promesa  
    }  
}  
  
// ... Resto de funciones (firebaseLoginWithEmailPassword, firebaseRegisterWithEmailPassword, firebaseLogout,  
// saveTeamDataToFirebase, getTeamDataFromFirebase, etc.) se mantienen como en la solución anterior.  
// El import de signInAnonymously se debe eliminar si ya no se usa.  
// import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';  
// Cambiar a:  
// import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';   
