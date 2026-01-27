// firebase-config.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Tu configuración de Firebase (obtenerla desde Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyD9bNZkBzcB5__dpdn152WrsJ_HTl54xqs",
  authDomain: "cuentacuentos-57631.firebaseapp.com",
  projectId: "cuentacuentos-57631",
  storageBucket: "cuentacuentos-57631.firebasestorage.app",
  messagingSenderId: "654911737232",
  appId: "1:654911737232:web:e87ecaea12351dd3d5b715"

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Funciones para Teams Data
async function saveTeamDataToFirebase(teamName, teamData) {
    try {
        await setDoc(doc(db, 'teams_data', teamName), teamData);
        console.log(`✅ Datos del equipo ${teamName} guardados en Firebase`);
        return { success: true };
    } catch (error) {
        console.error('Error guardando en Firebase:', error);
        return { success: false, error: error.message };
    }
}

async function getTeamDataFromFirebase(teamName) {
    try {
        const docRef = doc(db, 'teams_data', teamName);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            console.log(`✅ Datos del equipo ${teamName} cargados desde Firebase`);
            return { success: true, data: docSnap.data() };
        } else {
            console.log(`⚠️ No hay datos en Firebase para ${teamName}`);
            return { success: false, data: null };
        }
    } catch (error) {
        console.error('Error cargando desde Firebase:', error);
        return { success: false, error: error.message };
    }
}

async function getAllTeamsDataFromFirebase() {
    try {
        const querySnapshot = await getDocs(collection(db, 'teams_data'));
        const allData = {};
        querySnapshot.forEach((doc) => {
            allData[doc.id] = doc.data();
        });
        console.log(`✅ ${Object.keys(allData).length} equipos cargados desde Firebase`);
        return { success: true, data: allData };
    } catch (error) {
        console.error('Error cargando todos los equipos:', error);
        return { success: false, error: error.message };
    }
}

// Exportar funciones
export {
    auth,
    db,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    saveTeamDataToFirebase,
    getTeamDataFromFirebase,
    getAllTeamsDataFromFirebase
};
