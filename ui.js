// ===============================
// Renderizado de Plantilla (Squad)
// ===============================
function renderSquadList(squad, currentTeam) {
    const list = document.getElementById('squadList');
    if (!list) return;

    if (!squad || squad.length === 0) {
        list.innerHTML = '<tr><td colspan="20">❌ No hay jugadores en plantilla. ¡Ficha algunos para comenzar!</td></tr>';
        return;
    }

    let headerHtml = `
        <thead>
            <tr>
                <th>#</th>
                <th>JUGADOR</th>
                <th>OVR</th>
                <th>POT</th>
                <th>EDAD</th>
                <th>POS</th>
                <th>PIE</th>
                ${ATTRIBUTES.map(a => `<th>${a}</th>`).join('')}
                <th>FORMA</th>
                <th>ESTADO</th>
                <th>SALARIO</th>
                <th>VALOR</th>
                <th>ACCIONES</th>
            </tr>
        </thead>
        <tbody>
            ${squad
                .sort((a,b) => b.overall - a.overall)
                .map((p, idx) => {
                    const statusText = p.isInjured ? `Lesionado (${p.weeksOut} sem)` : 'Apto';
                    return `
                    <tr>
                        <td>${idx+1}</td>
                        <td>${p.name}</td>
                        <td><strong>${p.overall}</strong></td>
                        <td>${p.potential || '-'}</td>
                        <td>${p.age}</td>
                        <td>${p.position || 'N/A'}</td>
                        <td>${p.foot || 'N/A'}</td>
                        ${ATTRIBUTES.map(a => `<td>${p[a] || 0}</td>`).join('')}
                        <td>${p.form || 0}</td>
                        <td>${statusText}</td>
                        <td>${p.salary.toLocaleString('es-ES')}€</td>
                        <td>${p.value.toLocaleString('es-ES')}€</td>
                        <td>
                            <button class="btn btn-sm" onclick="window.openTrainingModal(${idx})">Entrenar</button>
                            <button class="btn btn-sm btn-danger" onclick="window.sellPlayer('${p.name}')">Vender</button>
                        </td>
                    </tr>`;
                }).join('')}
        </tbody>
    `;

    list.innerHTML = headerHtml;
}

// ===============================
// Renderizado de Cantera (Academy)
// ===============================
function renderAcademyList(academy) {
    const list = document.getElementById('academyList');
    if (!list) return;

    if (!academy || academy.length === 0) {
        list.innerHTML = '<tr><td colspan="20">❌ No hay jóvenes en cantera. ¡Contrata talentos para desarrollarlos!</td></tr>';
        return;
    }

    let headerHtml = `
        <thead>
            <tr>
                <th>#</th>
                <th>JUGADOR</th>
                <th>OVR</th>
                <th>POT</th>
                <th>EDAD</th>
                <th>POS</th>
                <th>PIE</th>
                ${ATTRIBUTES.map(a => `<th>${a}</th>`).join('')}
                <th>FORMA</th>
                <th>ESTADO</th>
                <th>PART.</th>
                <th>SALARIO</th>
                <th>VALOR</th>
                <th>ACCIONES</th>
            </tr>
        </thead>
        <tbody>
            ${academy
                .sort((a,b) => b.overall - a.overall)
                .map((p, idx) => {
                    const statusText = p.isInjured ? `Lesionado (${p.weeksOut} sem)` : 'Apto';
                    return `
                    <tr>
                        <td>${idx+1}</td>
                        <td>${p.name}</td>
                        <td><strong>${p.overall}</strong></td>
                        <td>${p.potential || '-'}</td>
                        <td>${p.age}</td>
                        <td>${p.position || 'N/A'}</td>
                        <td>${p.foot || 'N/A'}</td>
                        ${ATTRIBUTES.map(a => `<td>${p[a] || 0}</td>`).join('')}
                        <td>${p.form || 0}</td>
                        <td>${statusText}</td>
                        <td>${p.matches || 0}</td>
                        <td>${p.salary.toLocaleString('es-ES')}€</td>
                        <td>${p.value.toLocaleString('es-ES')}€</td>
                        <td>
                            <button class="btn btn-sm" onclick="window.promoteYoungster('${p.name}')">Ascender</button>
                        </td>
                    </tr>`;
                }).join('')}
        </tbody>
    `;

    list.innerHTML = headerHtml;
}

// ===============================
// Renderizado de Mercado de Jugadores
// ===============================
function renderPlayerMarketList(players) {
    const list = document.getElementById('availablePlayersSearchResult');
    if (!list) return;

    if (!players || players.length === 0) {
        list.innerHTML = '<tr><td colspan="20">No se encontraron jugadores que coincidan con los criterios.</td></tr>';
        return;
    }

    let headerHtml = `
        <thead>
            <tr>
                <th>JUGADOR</th>
                <th>OVR</th>
                <th>POT</th>
                <th>EDAD</th>
                <th>POS</th>
                <th>PIE</th>
                ${ATTRIBUTES.map(a => `<th>${a}</th>`).join('')}
                <th>CLUB</th>
                <th>SALARIO</th>
                <th>VALOR</th>
                <th>PRECIO P.</th>
                <th>ESTADO</th>
                <th>ACCIONES</th>
            </tr>
        </thead>
        <tbody>
            ${players
                .map((p, idx) => {
                    const estado = p.loanListed ? 'Cedible' : (p.transferListed ? 'Transferible' : 'No Disponible');
                    const askingPrice = p.transferListed ? p.askingPrice.toLocaleString('es-ES') + '€' : '-';
                    return `
                    <tr>
                        <td>${p.name}</td>
                        <td><strong>${p.overall}</strong></td>
                        <td>${p.potential || '-'}</td>
                        <td>${p.age}</td>
                        <td>${p.position || 'N/A'}</td>
                        <td>${p.foot || 'N/A'}</td>
                        ${ATTRIBUTES.map(a => `<td>${p[a] || 0}</td>`).join('')}
                        <td>${p.club}</td>
                        <td>${p.salary.toLocaleString('es-ES')}€</td>
                        <td>${p.value.toLocaleString('es-ES')}€</td>
                        <td>${askingPrice}</td>
                        <td>${estado}</td>
                        <td>
                            <button class="btn btn-sm btn-primary" onclick="window.startPlayerNegotiation(${JSON.stringify(p).replace(/"/g,'&quot;')})">Negociar</button>
                        </td>
                    </tr>`;
                }).join('')}
        </tbody>
    `;

    list.innerHTML = headerHtml;
}
