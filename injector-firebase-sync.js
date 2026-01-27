// injector-firebase-sync.js  
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';  
  
(function() {  
    console.log('🔥 Firebase Sync Injector cargando...');  
  
    const defaultTeamData = {  
        logo: null,  
        stadiumImage: null,  
        stadiumCapacity: 10000,  
        initialBudget: 5000000,  
        stadiumName: 'Estadio Municipal'  
    };  
  
    // =============================  
    // FUNCIONES EQUIPOS MEJORADAS  
    // =============================  
  
    async function getTeamDataFromFirebaseSafe(teamName) {  
        const isFirebaseEnabled = window.firebaseConfig && window.firebaseConfig.enabled;
        
        if (!isFirebaseEnabled || !window.firebaseDB) {
            return { success: false, data: null };
        }
        
        try {  
            // Esperar a que la autenticación esté lista
            if (window.authReadyPromise) {
                await window.authReadyPromise;
            }

            const result = await window.getTeamDataFromFirebase(teamName);   
            if (result.success && result.data) {
                return result;
            }
  
            // Si no hay datos en Firebase, inicializar con defaultTeamData
            if (!result.data) {  
                console.log(`📝 Inicializando datos por defecto para ${teamName}`);
                await window.saveTeamDataToFirebase(teamName, defaultTeamData);  
                return { success: true, data: defaultTeamData };  
            }
            
            return { success: false, data: null };  
  
        } catch (error) {  
            console.error('❌ Error accediendo a Firebase para equipo:', error);  
            return { success: false, data: null };  
        }  
    }  
  
    // Función global para obtener datos del equipo
    window.getTeamData = async function(teamName) {  
        console.log(`📥 Cargando datos para ${teamName}...`);  
        
        // Primero intentar cargar desde Firebase
        const firebaseResult = await getTeamDataFromFirebaseSafe(teamName);  
        if (firebaseResult.success && firebaseResult.data) {  
            console.log(`✅ Datos cargados desde Firebase para ${teamName}`);  
            localStorage.setItem(`team_data_${teamName}`, JSON.stringify(firebaseResult.data));  
            return firebaseResult.data;  
        }  
  
        // Fallback a localStorage
        const localData = localStorage.getItem(`team_data_${teamName}`);  
        if (localData) {  
            console.log(`📦 Datos cargados desde localStorage para ${teamName}`);  
            const parsedData = JSON.parse(localData);
            
            // Intentar subir a Firebase para sincronización (sin esperar)
            if (window.firebaseConfig && window.firebaseConfig.enabled) {
                window.saveTeamDataToFirebase(teamName, parsedData)
                    .then(() => console.log(`✅ Datos de ${teamName} sincronizados con Firebase`))
                    .catch(err => console.warn(`⚠️ No se pudieron sincronizar datos de ${teamName}:`, err));
            }
            
            return parsedData;
        }  
  
        // Si no hay datos en ningún sitio, usar defaults
        console.log(`⚠️ No hay datos para ${teamName}, usando valores por defecto`);  
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(defaultTeamData));  
        
        // Intentar guardar en Firebase (sin esperar)
        if (window.firebaseConfig && window.firebaseConfig.enabled) {
            window.saveTeamDataToFirebase(teamName, defaultTeamData)
                .then(() => console.log(`✅ Datos por defecto de ${teamName} guardados en Firebase`))
                .catch(err => console.warn(`⚠️ No se pudieron guardar datos por defecto de ${teamName}:`, err));
        }
        
        return defaultTeamData;  
    };  
  
    // Función global para guardar datos del equipo
    window.saveTeamData = async function(teamName, teamData) {  
        // Siempre guardar en localStorage primero (sincrónico)
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData));  
        console.log(`💾 Datos guardados en localStorage para ${teamName}`);  
  
        const isFirebaseEnabled = window.firebaseConfig && window.firebaseConfig.enabled;
        
        if (isFirebaseEnabled && window.firebaseDB) {  
            try {
                // Esperar a que la autenticación esté lista
                if (window.authReadyPromise) {
                    await window.authReadyPromise;
                }

                const result = await window.saveTeamDataToFirebase(teamName, teamData);  
                if (result.success) {  
                    console.log(`✅ Datos guardados en Firebase para ${teamName}`);  
                    return { success: true };  
                } else {  
                    console.warn('⚠️ Error guardando en Firebase, datos guardados solo localmente', result.error);  
                    return { success: false, error: result.error };  
                }
            } catch (error) {
                console.warn('⚠️ Error guardando en Firebase:', error);
                return { success: false, error: error.message };
            }
        }  
        
        return { success: true, message: 'Guardado en localStorage (Firebase deshabilitado)' };  
    };  
  
    // =============================  
    // PRECARGA DE EQUIPOS DESDE FIREBASE  
    // =============================  
    async function preloadTeamsFromFirebase() {
        const isFirebaseEnabled = window.firebaseConfig && window.firebaseConfig.enabled;
        
        if (!isFirebaseEnabled || !window.firebaseDB) {
            console.log('⚠️ Firebase no disponible para precarga de equipos');
            return;
        }

        try {
            // Esperar a que la autenticación esté lista
            if (window.authReadyPromise) {
                console.log('⏳ Esperando autenticación para precargar equipos...');
                await window.authReadyPromise;
            }

            console.log('📥 Precargando equipos desde Firebase...');
            const querySnapshot = await getDocs(collection(window.firebaseDB, 'teams_data'));  
            
            let count = 0;
            querySnapshot.forEach(docSnap => {  
                const teamData = docSnap.data();
                localStorage.setItem(`team_data_${docSnap.id}`, JSON.stringify(teamData));  
                count++;
            });  
            
            console.log(`✅ ${count} equipos precargados desde Firebase`);  
        } catch (error) {  
            console.warn('⚠️ Error precargando equipos desde Firebase:', error);  
        }  
    }

    // =============================  
    // AUTENTICACIÓN Y LISTENERS  
    // =============================  
    const isFirebaseEnabled = window.firebaseConfig && window.firebaseConfig.enabled;

    if (isFirebaseEnabled && window.firebaseAuth) {  
        window.firebaseAuth.onAuthStateChanged(async (user) => {  
            if (user) {  
                console.log('👤 Usuario activo con UID:', user.uid);  
                window.currentUserId = user.uid;  

                // Precargar equipos cuando el usuario esté autenticado
                await preloadTeamsFromFirebase();

                // Habilitar botón Guardar  
                const saveBtn = document.querySelector('button[onclick="window.saveCurrentGame()"]');  
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.style.opacity = '1';
                }
            } else {  
                console.log('⚠️ Usuario no autenticado');  
                window.currentUserId = null;  
                
                const saveBtn = document.querySelector('button[onclick="window.saveCurrentGame()"]');  
                if (saveBtn) {
                    saveBtn.disabled = true;
                    saveBtn.style.opacity = '0.5';
                }
            }  
        });  
    } else if (isFirebaseEnabled) {  
        console.warn('⚠️ window.firebaseAuth no disponible');  
    }  
  
    // =============================  
    // INICIALIZACIÓN  
    // =============================  
    window.addEventListener('DOMContentLoaded', () => {  
        const saveBtn = document.querySelector('button[onclick="window.saveCurrentGame()"]');  
        if (saveBtn) {  
            // Inicialmente deshabilitado hasta que haya usuario autenticado  
            saveBtn.disabled = !window.currentUserId;  
            saveBtn.style.opacity = window.currentUserId ? '1' : '0.5';
        }  
    });  
  
    console.log('✓ Firebase Sync Injector cargado correctamente');  
})();
