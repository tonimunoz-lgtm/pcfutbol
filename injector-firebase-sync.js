// injector-firebase-sync.js  
// Este archivo ahora es mucho más simple porque teamData.js maneja toda la lógica
(function() {  
    console.log('🔥 Firebase Sync Injector cargando...');  
  
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
            
            console.log('🔥 Precargando equipos desde Firebase...');  
            // Usar la función global que ya existe en teamData.js
            if (window.loadAllTeamData) {
                const allData = await window.loadAllTeamData();
                const count = Object.keys(allData).length;
                console.log(`✅ ${count} equipos precargados desde Firebase`);
            }
        } catch (error) {  
            console.warn('⚠️ Error precargando equipos desde Firebase:', error);  
        }  
    }  
  
    // =============================  
    // INICIALIZACIÓN  
    // =============================  
    window.addEventListener('DOMContentLoaded', () => {  
        // Esperar a que Firebase esté listo antes de precargar
        if (window.authReadyPromise) {
            window.authReadyPromise.then(() => {
                preloadTeamsFromFirebase();
            }).catch(err => {
                console.warn('⚠️ Error en autenticación, no se precargarán equipos:', err);
            });
        } else {
            // Si no hay promesa de autenticación, intentar precargar de todos modos
            setTimeout(() => {
                preloadTeamsFromFirebase();
            }, 2000);
        }
        
        console.log('✅ Firebase Sync Injector cargado correctamente');  
    });  
})();
