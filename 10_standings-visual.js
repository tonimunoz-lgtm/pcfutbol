// standings-visual-system.js
// Sistema de clasificación con colores según posiciones importantes

(function() {
    'use strict';
    
    console.log('📊 Sistema de Clasificación Visual: Iniciando...');

    // ===========================================
    // CONFIGURACIÓN DE COLORES
    // ===========================================
    
    const STANDINGS_CONFIG = {
        // Primera División
        primera: {
            positions: {
                champions: { 
                    range: [1, 1], 
                    label: 'Campeón',
                    color: '#FFD700',
                    gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                    icon: '🏆'
                },
                championsLeague: { 
                    range: [2, 4], 
                    label: 'Champions League',
                    color: '#0066CC',
                    gradient: 'linear-gradient(135deg, #0066CC 0%, #004499 100%)',
                    icon: '🔵'
                },
                europaLeague: { 
                    range: [5, 5], 
                    label: 'Europa League',
                    color: '#FF6600',
                    gradient: 'linear-gradient(135deg, #FF6600 0%, #CC5200 100%)',
                    icon: '🟠'
                },
                conferenceLeague: { 
                    range: [6, 6], 
                    label: 'Conference League',
                    color: '#00AA44',
                    gradient: 'linear-gradient(135deg, #00AA44 0%, #008833 100%)',
                    icon: '🟢'
                },
                safe: { 
                    range: [7, 17], 
                    label: 'Permanencia',
                    color: 'transparent',
                    gradient: 'transparent',
                    icon: ''
                },
                relegation: { 
                    range: [18, 20], 
                    label: 'Descenso',
                    color: '#CC0000',
                    gradient: 'linear-gradient(135deg, #CC0000 0%, #990000 100%)',
                    icon: '🔴'
                }
            }
        },
        
        // Segunda División
        segunda: {
            positions: {
                promotion: { 
                    range: [1, 2], 
                    label: 'Ascenso Directo',
                    color: '#00FF00',
                    gradient: 'linear-gradient(135deg, #00FF00 0%, #00CC00 100%)',
                    icon: '⬆️'
                },
                playoff: { 
                    range: [3, 6], 
                    label: 'Playoff de Ascenso',
                    color: '#FFAA00',
                    gradient: 'linear-gradient(135deg, #FFAA00 0%, #FF8800 100%)',
                    icon: '🟡'
                },
                safe: { 
                    range: [7, 18], 
                    label: 'Permanencia',
                    color: 'transparent',
                    gradient: 'transparent',
                    icon: ''
                },
                relegation: { 
                    range: [19, 22], 
                    label: 'Descenso',
                    color: '#CC0000',
                    gradient: 'linear-gradient(135deg, #CC0000 0%, #990000 100%)',
                    icon: '🔴'
                }
            }
        },
        
        // Primera RFEF
        rfef: {
            positions: {
                promotion: { 
                    range: [1, 2], 
                    label: 'Ascenso',
                    color: '#00FF00',
                    gradient: 'linear-gradient(135deg, #00FF00 0%, #00CC00 100%)',
                    icon: '⬆️'
                },
                playoff: { 
                    range: [3, 5], 
                    label: 'Playoff',
                    color: '#FFAA00',
                    gradient: 'linear-gradient(135deg, #FFAA00 0%, #FF8800 100%)',
                    icon: '🟡'
                },
                safe: { 
                    range: [6, 16], 
                    label: 'Permanencia',
                    color: 'transparent',
                    gradient: 'transparent',
                    icon: ''
                },
                relegation: { 
                    range: [17, 20], 
                    label: 'Descenso',
                    color: '#CC0000',
                    gradient: 'linear-gradient(135deg, #CC0000 0%, #990000 100%)',
                    icon: '🔴'
                }
            }
        }
    };

    // ===========================================
    // FUNCIONES DE CLASIFICACIÓN
    // ===========================================
    
    /**
     * Obtiene la configuración de color para una posición
     */
    function getPositionConfig(position, division) {
        const divisionKey = division === 'primera' ? 'primera' : 
                          division === 'segunda' ? 'segunda' : 'rfef';
        
        const config = STANDINGS_CONFIG[divisionKey];
        if (!config) return null;
        
        for (const [key, posConfig] of Object.entries(config.positions)) {
            const [min, max] = posConfig.range;
            if (position >= min && position <= max) {
                return posConfig;
            }
        }
        
        return null;
    }
    
    /**
     * Genera la tabla de clasificación con colores
     */
    function generateStandingsTable(standings, division, userTeam) {
        // Convertir objeto de clasificación a array
        const standingsArray = Object.entries(standings).map(([team, stats]) => ({
            team,
            ...stats
        }));
        
        // Ordenar por puntos, diferencia de goles, goles a favor
        standingsArray.sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            const dgA = (a.gf || 0) - (a.gc || 0);
            const dgB = (b.gf || 0) - (b.gc || 0);
            if (dgB !== dgA) return dgB - dgA;
            return (b.gf || 0) - (a.gf || 0);
        });
        
        // Generar HTML
        let html = `
            <div class="standings-container" style="margin: 20px 0;">
                <h2>📊 Clasificación - ${getDivisionName(division)}</h2>
                <table class="standings-table" style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                    <thead>
                        <tr style="background: rgba(233, 69, 96, 0.2); border-bottom: 2px solid #e94560;">
                            <th style="padding: 10px; text-align: center; width: 50px;">#</th>
                            <th style="padding: 10px; text-align: left;">Equipo</th>
                            <th style="padding: 10px; text-align: center; width: 60px;">PJ</th>
                            <th style="padding: 10px; text-align: center; width: 60px;">G</th>
                            <th style="padding: 10px; text-align: center; width: 60px;">E</th>
                            <th style="padding: 10px; text-align: center; width: 60px;">P</th>
                            <th style="padding: 10px; text-align: center; width: 60px;">GF</th>
                            <th style="padding: 10px; text-align: center; width: 60px;">GC</th>
                            <th style="padding: 10px; text-align: center; width: 60px;">DG</th>
                            <th style="padding: 10px; text-align: center; width: 70px;">PTS</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        standingsArray.forEach((teamStats, index) => {
            const position = index + 1;
            const posConfig = getPositionConfig(position, division);
            const isUserTeam = teamStats.team === userTeam;
            const dg = (teamStats.gf || 0) - (teamStats.gc || 0);
            
            // Estilos de la fila
            let rowStyle = 'border-bottom: 1px solid rgba(255,255,255,0.1);';
            
            if (posConfig && posConfig.gradient !== 'transparent') {
                rowStyle += `background: ${posConfig.gradient}; color: white; font-weight: bold;`;
            } else if (isUserTeam) {
                rowStyle += 'background: rgba(233, 69, 96, 0.2);';
            }
            
            html += `
                <tr class="standings-row" data-position="${position}" style="${rowStyle}">
                    <td style="padding: 10px; text-align: center;">
                        <span style="font-weight: bold;">${position}</span>
                        ${posConfig && posConfig.icon ? posConfig.icon : ''}
                    </td>
                    <td style="padding: 10px;">
                        <strong>${teamStats.team}</strong>
                        ${isUserTeam ? ' <span style="color: #00ff00;">★</span>' : ''}
                    </td>
                    <td style="padding: 10px; text-align: center;">${teamStats.pj || 0}</td>
                    <td style="padding: 10px; text-align: center;">${teamStats.g || 0}</td>
                    <td style="padding: 10px; text-align: center;">${teamStats.e || 0}</td>
                    <td style="padding: 10px; text-align: center;">${teamStats.p || 0}</td>
                    <td style="padding: 10px; text-align: center;">${teamStats.gf || 0}</td>
                    <td style="padding: 10px; text-align: center;">${teamStats.gc || 0}</td>
                    <td style="padding: 10px; text-align: center; ${dg > 0 ? 'color: #00ff00;' : dg < 0 ? 'color: #ff4444;' : ''}">${dg > 0 ? '+' : ''}${dg}</td>
                    <td style="padding: 10px; text-align: center; font-weight: bold; font-size: 1.1em;">${teamStats.pts || 0}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
                ${generateLegend(division)}
            </div>
        `;
        
        return html;
    }
    
    /**
     * Genera la leyenda de colores
     */
    function generateLegend(division) {
        const divisionKey = division === 'primera' ? 'primera' : 
                          division === 'segunda' ? 'segunda' : 'rfef';
        
        const config = STANDINGS_CONFIG[divisionKey];
        if (!config) return '';
        
        let html = '<div class="standings-legend" style="margin-top: 20px; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 5px;">';
        html += '<h3 style="margin: 0 0 10px 0; font-size: 0.9em;">Leyenda:</h3>';
        html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">';
        
        for (const [key, posConfig] of Object.entries(config.positions)) {
            if (posConfig.gradient === 'transparent') continue;
            
            const [min, max] = posConfig.range;
            const positions = min === max ? `${min}º` : `${min}º-${max}º`;
            
            html += `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="
                        width: 30px;
                        height: 20px;
                        background: ${posConfig.gradient};
                        border-radius: 3px;
                        flex-shrink: 0;
                    "></div>
                    <div>
                        <strong>${posConfig.icon} ${posConfig.label}</strong>
                        <div style="font-size: 0.85em; color: #999;">${positions}</div>
                    </div>
                </div>
            `;
        }
        
        html += '</div></div>';
        
        return html;
    }
    
    /**
     * Obtiene el nombre completo de la división
     */
    function getDivisionName(division) {
        const names = {
            'primera': 'Primera División',
            'segunda': 'Segunda División',
            'rfef_grupo1': 'Primera RFEF Grupo 1',
            'rfef_grupo2': 'Primera RFEF Grupo 2'
        };
        
        return names[division] || division;
    }

    // ===========================================
    // FUNCIONES DE UTILIDAD
    // ===========================================
    
    /**
     * Obtiene la posición de un equipo
     */
    function getTeamPosition(standings, teamName) {
        const standingsArray = Object.entries(standings).map(([team, stats]) => ({
            team,
            ...stats
        }));
        
        standingsArray.sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            const dgA = (a.gf || 0) - (a.gc || 0);
            const dgB = (b.gf || 0) - (b.gc || 0);
            if (dgB !== dgA) return dgB - dgA;
            return (b.gf || 0) - (a.gf || 0);
        });
        
        const index = standingsArray.findIndex(t => t.team === teamName);
        return index >= 0 ? index + 1 : -1;
    }
    
    /**
     * Obtiene información de la posición del equipo
     */
    function getPositionInfo(position, division) {
        const config = getPositionConfig(position, division);
        
        if (!config) {
            return {
                position,
                label: 'Sin clasificar',
                color: 'transparent',
                icon: '',
                message: 'Posición en la tabla'
            };
        }
        
        return {
            position,
            label: config.label,
            color: config.color,
            icon: config.icon,
            gradient: config.gradient,
            message: generatePositionMessage(position, division, config)
        };
    }
    
    /**
     * Genera un mensaje descriptivo de la posición
     */
    function generatePositionMessage(position, division, config) {
        const messages = {
            champions: '¡Vas líder! 🏆 Mantén el ritmo para ser campeón.',
            championsLeague: 'En puestos de Champions League. ¡Sigue así!',
            europaLeague: 'Clasificado para Europa League. ¡Buen trabajo!',
            conferenceLeague: 'En puesto de Conference League.',
            promotion: '¡En puestos de ascenso directo! ⬆️',
            playoff: 'En playoff de ascenso. ¡Estás cerca!',
            safe: 'En zona tranquila. Posición segura.',
            relegation: '⚠️ ¡PELIGRO! En puestos de descenso.'
        };
        
        // Buscar el tipo de posición
        for (const [key, posConfig] of Object.entries(STANDINGS_CONFIG[division === 'primera' ? 'primera' : division === 'segunda' ? 'segunda' : 'rfef'].positions)) {
            if (config.label === posConfig.label) {
                return messages[key] || config.label;
            }
        }
        
        return config.label;
    }
    
    /**
     * Calcula puntos necesarios para objetivo
     */
    function calculatePointsToTarget(currentPosition, currentPoints, standings, division, target) {
        const standingsArray = Object.entries(standings).map(([team, stats]) => ({
            team,
            ...stats
        }));
        
        standingsArray.sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            const dgA = (a.gf || 0) - (a.gc || 0);
            const dgB = (b.gf || 0) - (b.gc || 0);
            if (dgB !== dgA) return dgB - dgA;
            return (b.gf || 0) - (a.gf || 0);
        });
        
        let targetPosition;
        
        // Determinar posición objetivo
        if (target === 'champions') targetPosition = 1;
        else if (target === 'championsLeague') targetPosition = 4;
        else if (target === 'europaLeague') targetPosition = 5;
        else if (target === 'promotion') targetPosition = 2;
        else if (target === 'playoff') targetPosition = 6;
        else if (target === 'safety') targetPosition = division === 'segunda' ? 18 : 17;
        
        if (!targetPosition || targetPosition >= currentPosition) {
            return { achieved: true, points: 0 };
        }
        
        const targetTeam = standingsArray[targetPosition - 1];
        const pointsDifference = targetTeam.pts - currentPoints;
        
        return {
            achieved: false,
            points: Math.max(1, pointsDifference + 1),
            targetTeam: targetTeam.team,
            targetPoints: targetTeam.pts
        };
    }

    // ===========================================
    // WIDGET DE POSICIÓN
    // ===========================================
    
    /**
     * Crea un widget de posición para el dashboard
     */
    function createPositionWidget(standings, userTeam, division) {
        const position = getTeamPosition(standings, userTeam);
        const posInfo = getPositionInfo(position, division);
        
        return `
            <div class="position-widget" style="
                background: ${posInfo.gradient};
                padding: 20px;
                border-radius: 10px;
                text-align: center;
                color: white;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            ">
                <div style="font-size: 3em; margin-bottom: 10px;">
                    ${posInfo.icon || '📊'}
                </div>
                <div style="font-size: 2.5em; font-weight: bold; margin-bottom: 5px;">
                    ${position}º
                </div>
                <div style="font-size: 1.2em; margin-bottom: 10px;">
                    ${posInfo.label}
                </div>
                <div style="font-size: 0.9em; opacity: 0.9;">
                    ${posInfo.message}
                </div>
            </div>
        `;
    }

    // ===========================================
    // INTEGRACIÓN CON LA UI
    // ===========================================
    
    /**
     * Actualiza la tabla de clasificación en la UI
     */
 function updateStandingsUI(standings, division, userTeam) {
    const standingsContainer = document.getElementById('standingsTable'); // Cambiar aquí
    if (!standingsContainer) {
        console.warn('⚠️ Contenedor de clasificación no encontrado (es normal si no estás en esa página)');
        return;
    }
    
    // Usar el método de ui.js existente primero
    if (window.ui && window.ui.renderStandingsTable) {
        window.ui.renderStandingsTable({ standings, team: userTeam, division });
    }
    
    // Luego añadir colores
    const rows = standingsContainer.querySelectorAll('tbody tr');
    rows.forEach((row, index) => {
        const position = index + 1;
        const config = getPositionConfig(position, division);
        
        if (config && config.gradient !== 'transparent') {
            row.style.background = config.gradient;
            row.style.color = 'white';
            row.style.fontWeight = 'bold';
        }
    });
}
    
    /**
     * Actualiza el widget de posición en el dashboard
     */
    function updatePositionWidget(standings, userTeam, division) {
        const widgetContainer = document.getElementById('positionWidget');
        if (!widgetContainer) {
            console.warn('Contenedor de widget de posición no encontrado');
            return;
        }
        
        widgetContainer.innerHTML = createPositionWidget(standings, userTeam, division);
    }

    // ===========================================
    // EXPORTAR FUNCIONES GLOBALES
    // ===========================================
    
    window.StandingsVisual = {
        // Generación
        generateTable: generateStandingsTable,
        generateLegend: generateLegend,
        
        // Utilidades
        getTeamPosition,
        getPositionInfo,
        getPositionConfig,
        calculatePointsToTarget,
        
        // Widgets
        createPositionWidget,
        
        // UI
        updateUI: updateStandingsUI,
        updateWidget: updatePositionWidget,
        
        // Configuración
        CONFIG: STANDINGS_CONFIG
    };
    
    console.log('✅ Sistema de Clasificación Visual: Cargado correctamente');
    
})();
