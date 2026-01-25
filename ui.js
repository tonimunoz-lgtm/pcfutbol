// ui.js - Utilidades de interfaz y renderizado

/**
 * Renderiza la tabla de clasificación
 */
function renderStandingsTable(standings, currentTeam) {
    const tbody = document.getElementById('standingsTable');
    const sorted = Object.entries(standings).sort((a, b) => {
        if (b[1].pts !== a[1].pts) return b[1].pts - a[1].pts;
        return (b[1].gf - b[1].gc) - (a[1].gf - a[1].gc);
    });
    
    tbody.innerHTML = sorted.map(([team, stats], i) => `
        <tr style="${team === currentTeam ? 'background: rgba(233, 69, 96, 0.2);' : ''}">
            <td><strong>${i + 1}</strong></td>
            <td><strong>${team}</strong></td>
            <td>${stats.pj}</td>
            <td>${stats.g}</td>
            <td>${stats.e}</td>
            <td>${stats.p}</td>
            <td>${stats.gf}</td>
            <td>${stats.gc}</td>
            <td>${stats.gf - stats.gc}</td>
            <td style="color: #00ff00; font-weight: bold;">${stats.pts}</td>
        </tr>
    `).join('');
}

/**
 * Renderiza la plantilla
 */
function renderSquadList(squad, currentTeam) {
    const list = document.getElementById('squadList');
    if (!squad || squad.length === 0) {
        list.innerHTML = '<div class="alert alert-info">❌ No hay jugadores en plantilla. ¡Ficha algunos para comenzar!</div>';
        return;
    }
    
    const sorted = squad.sort((a, b) => b.overall - a.overall);
    list.innerHTML = sorted.map((p, idx) => `
        <div class="player-card">
            <div style="flex: 1;">
                <div style="color: #e94560; font-weight: bold; margin-bottom: 5px;">${idx + 1}. ${p.name}</div>
                <div style="font-size: 0.85em; color: #999;">
                    <span>${p.position}</span> | 
                    <span>${p.age} años</span> | 
                    <span>Nivel ${p.overall}/100</span> | 
                    <span>${p.salary}€/sem</span> |
                    <span>${p.matches || 0} partidos</span>
                </div>
            </div>
            <div style="display: flex; gap: 5px;">
                <button class="btn btn-sm" onclick="window.negotiatePlayer('${p.name}')">Negociar</button>
                <button class="btn btn-sm" onclick="window.sellPlayerConfirm('${p.name}')" style="background: #c73446;">Vender</button>
            </div>
        </div>
    `).join('');
}

/**
 * Renderiza la cantera
 */
function renderAcademyList(academy) {
    const list = document.getElementById('academyList');
    if (!academy || academy.length === 0) {
        list.innerHTML = '<div class="alert alert-info">❌ No hay jóvenes en cantera. ¡Contrata talentos para desarrollarlos!</div>';
        return;
    }
    
    list.innerHTML = academy.map((p, idx) => `
        <div class="player-card">
            <div style="flex: 1;">
                <div style="color: #e94560; font-weight: bold; margin-bottom: 5px;">${idx + 1}. ${p.name}</div>
                <div style="font-size: 0.85em; color: #999;">
                    Edad ${p.age} | 
                    Nivel ${p.overall}/100 | 
                    Potencial ${p.potential}/100 | 
                    ${p.matches || 0} partidos | 
                    Progreso: ${Math.floor((p.matches || 0) / 25 * 100)}%
                </div>
            </div>
            <div style="display: flex; gap: 5px;">
                <button class="btn btn-sm" onclick="window.promoteConfirm('${p.name}')">Ascender</button>
            </div>
        </div>
    `).join('');
}

/**
 * Renderiza jugadores disponibles para fichar
 */
function renderAvailablePlayersMarket(players) {
    const list = document.getElementById('availablePlayersList');
    list.innerHTML = players.map(p => `
        <div class="player-card">
            <div style="flex: 1;">
                <div style="color: #e94560; font-weight: bold; margin-bottom: 5px;">
                    ${p.name} ${p.loan ? '(📋 Cesión)' : ''}
                </div>
                <div style="font-size: 0.85em; color: #999;">
                    ${p.position} | ${p.age} años | Nivel ${p.overall}/100 | 
                    Salario: ${p.salary}€/sem | ${p.loan ? 'Gratis' : 'Coste: ' + p.cost + '€'}
                </div>
            </div>
            <button class="btn btn-sm" onclick="window.fichPlayerConfirm('${p.name}|${p.overall}|${p.salary}|${p.position}|${p.age}|${p.cost}|${p.loan ? 1 : 0}')">
                Fichar${p.loan ? ' (Préstamo)' : ''}
            </button>
        </div>
    `).join('');
}

/**
 * Renderiza jóvenes disponibles
 */
function renderAvailableYoungstersMarket(youngsters) {
    const list = document.getElementById('availableYoungstersList');
    list.innerHTML = youngsters.map(y => `
        <div class="player-card">
            <div style="flex: 1;">
                <div style="color: #e94560; font-weight: bold; margin-bottom: 5px;">${y.name}</div>
                <div style="font-size: 0.85em; color: #999;">
                    Edad ${y.age} | 
                    Nivel actual ${y.overall}/100 | 
                    Potencial ${y.potential}/100 | 
                    Coste: ${y.cost}€
                </div>
            </div>
            <button class="btn btn-sm" onclick="window.fichYoungsterConfirm('${y.name}|${y.age}|${y.overall}|${y.potential}|${y.cost}')">Contratar</button>
        </div>
    `).join('');
}

/**
 * Renderiza próximo partido
 */
function renderNextMatchCard(homeTeam, awayTeam, week) {
    const matchInfo = document.getElementById('matchInfo');
    matchInfo.innerHTML = `
        <div style="text-align: center; background: rgba(233, 69, 96, 0.1
