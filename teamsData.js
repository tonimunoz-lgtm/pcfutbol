// teamsData.js
import { TEAM_CUSTOM_DATA } from './teamData.js';

// Crear TEAMS_DATA por divisiones
export const TEAMS_DATA = {
    primera: ['Real Madrid', 'FC Barcelona', 'Atlético Madrid'], // Añade más equipos de Primera
    segunda: [], // Añade equipos de Segunda
    rfef_grupo1: [], // Añade equipos de Primera RFEF grupo 1
    rfef_grupo2: []  // Añade equipos de Primera RFEF grupo 2
};

// Función de ayuda para obtener datos de un equipo
export function getTeamDataByName(teamName) {
    return TEAM_CUSTOM_DATA[teamName] || {
        logo: null,
        stadiumImage: null,
        stadiumCapacity: 10000,
        initialBudget: 5000000,
        stadiumName: 'Estadio Municipal'
    };
}
