// ============================================================
// injector-legacy.js — Leyendas, dorsales y museo del club
//  · Dorsales: cada jugador tiene uno (se ve y se cambia en su ficha); los retirados no se pueden asignar.
//  · Leyendas del club: al retirarse un veterano con mucha historia → portada, ceremonia con decisiones
//    (retirar dorsal, rol en el club, partido homenaje) y entrada en el museo.
//  · Despedidas: un veterano que se va sin retirarse.
//  · Leyendas de la liga: estrellas de la IA que se retiran (portada y tributo opcional).
//  · Eventos: un jugador (fichaje reciente, crack, descontento) pide un dorsal concreto.
// Estado: gameState.legacy = { retired:[{number,...}], legends:[], leagueLegends:[], roles:{ambassador,scout,youth},
//   tributes:[], vets:{}, done:{}, ceremonies:[], ambSeason }, y p.shirt / p.peakOvr en los jugadores.
// ============================================================
(function () {
    'use strict';
    const gl = () => window.gameLogic;
    const gs = () => gl()?.getViewState?.();   // sin el mundo completo: se consulta cada pocos segundos
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const fmt = n => Math.round(n || 0).toLocaleString('es-ES');
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const key = p => p.id ?? p.name;
    const BLOCKERS = '#pcfGala,#matchSummaryModal,#cupResModal,#cupAnnModal,#fd-modal,.pcf-dlg-back,#offersModal.active,#pcfIntro,#pcfPress,#gameSelectionModal.active';
    const busy = () => [...document.querySelectorAll(BLOCKERS)].some(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden'; });
    const EMPTY = () => ({ retired: [], legends: [], leagueLegends: [], roles: {}, tributes: [], vets: {}, done: {}, ceremonies: [] });
    const L = s => ({ ...EMPTY(), ...(s?.legacy || {}) });
    const setLegacy = lg => gl().updateGameState({ legacy: lg });
    const api = { rnd: Math.random };

    // ── Dorsales ────────────────────────────────────────────
    const PREF = { POR: [1, 13, 25, 30, 12], DFC: [4, 5, 3, 15, 23, 24, 2, 6], LI: [3, 15, 18, 23], LD: [2, 12, 22, 20], MC: [8, 6, 14, 16, 5, 18, 21],
        MCD: [6, 5, 4, 14, 16], MCO: [10, 8, 14, 17, 20, 21], MI: [17, 11, 21, 20], MD: [8, 16, 20, 21], EXT: [7, 11, 19, 17, 21, 20], DC: [9, 19, 22, 18, 10, 23] };
    const STAR_NUMBERS = [7, 9, 10, 11];
    const retiredNums = s => new Set((L(s).retired || []).map(r => r.number));
    const pref = p => PREF[p.position] || PREF.MC;
    function freeNumber(p, taken, retired, avoid = []) {
        for (const n of pref(p)) if (!taken.has(n) && !retired.has(n) && !avoid.includes(n)) return n;
        for (let n = 2; n <= 99; n++) if (!taken.has(n) && !retired.has(n) && !avoid.includes(n)) return n;
        return 99;
    }
    // Asigna dorsal a quien no lo tiene (o lo tiene repetido/retirado) y apunta la media máxima. Quien llega con un dorsal
    // pactado en la negociación (shirtClaim) tiene prioridad: si otro lo lleva, ese pasa a otro número. Devuelve la plantilla nueva o null.
    function ensureShirts(s) {
        const squad = s.squad || [];
        if (!squad.length) return null;
        const retired = retiredNums(s), taken = new Set(), keep = new Map(), displaced = [];
        const order = [...squad].sort((a, b) => (b.shirtClaim ? 1 : 0) - (a.shirtClaim ? 1 : 0) || (b.overall || 0) - (a.overall || 0));
        const claimed = new Map();
        for (const p of order) {
            if (p.shirt && !retired.has(p.shirt)) {
                if (!taken.has(p.shirt)) { taken.add(p.shirt); keep.set(key(p), p.shirt); if (p.shirtClaim) claimed.set(p.shirt, p); }
                else if (claimed.has(p.shirt) && !p.shirtClaim) displaced.push({ p, by: claimed.get(p.shirt), n: p.shirt });
            }
        }
        let changed = false; const news = [];
        const out = squad.map(p => {
            let np = p;
            const peak = Math.max(p.peakOvr || 0, p.overall || 0);
            if (peak !== p.peakOvr) { np = { ...np, peakOvr: peak }; changed = true; }
            if (p.shirtClaim) { np = { ...np, shirtClaim: false }; changed = true; }
            if (!keep.has(key(p))) {
                const n = freeNumber(p, taken, retired); taken.add(n);
                np = { ...np, shirt: n }; changed = true;
                const d = displaced.find(x => key(x.p) === key(p));
                if (d) { np = { ...np, moodMod: clamp((Number(np.moodMod) || 0) - ((p.age || 25) >= 30 ? 4 : 2), -40, 40) }; news.push(`👕 ${d.by.name} luce el ${d.n} pactado en su fichaje; ${p.name} pasa al ${n}.`); }
            }
            return np;
        });
        if (news.length) setTimeout(() => news.forEach(n => gl().addNews?.(n, 'info')), 0);
        return changed ? out : null;
    }

    // ── Dorsal exigido por el agente al fichar ──────────────
    function hashName(n) { let h = 7; for (const c of String(n)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
    // Devuelve { number, retired, holder } si el agente exige un dorsal concreto (determinista por jugador), o null.
    function demandFor(player) {
        const s = gs(); if (!s || !player) return null;
        const h = hashName(player.name), ovr = player.overall || 0;
        const chance = ovr >= 80 ? 100 : ovr >= 72 ? 50 : 20;
        if (h % 100 >= chance) return null;
        const pool = (ovr >= 80 && player.position !== 'POR' ? [...STAR_NUMBERS, ...pref(player)] : pref(player)).filter((n, i, a) => a.indexOf(n) === i);
        const number = pool[Math.floor(h / 100) % Math.min(3, pool.length)];
        const ret = (L(s).retired || []).find(r => r.number === number);
        const holder = (s.squad || []).find(p => p.shirt === number);
        return { number, retired: ret ? ret.name : null, holder: holder ? holder.name : null };
    }
    function negotiationUI() {
        const modal = document.getElementById('negotiationModal');
        if (!modal || !modal.classList.contains('active')) { document.getElementById('pcfShirtOffer')?.remove(); return; }
        const host = modal.querySelector('.negotiation-incentives'); const s = gs(); const pl = s?.negotiatingPlayer;
        if (!host || !pl) { document.getElementById('pcfShirtOffer')?.remove(); return; }
        const dem = demandFor(pl);
        let box = document.getElementById('pcfShirtOffer');
        if (!dem) { box?.remove(); return; }
        const sig = `${pl.name}|${dem.number}|${(L(s).retired || []).length}|${(s.squad || []).map(p => p.shirt).join(',')}`;
        if (box && box.dataset.sig === sig && host.contains(box)) return;
        box?.remove();
        const retired = retiredNums(s), taken = new Set((s.squad || []).map(p => p.shirt));
        const alts = []; for (const n of [...pref(pl), 7, 8, 14, 17, 20, 21, 22, 23]) if (!alts.includes(n) && n !== dem.number && !retired.has(n) && !taken.has(n)) alts.push(n);
        const opts = [];
        if (dem.retired) opts.push(`<option value="${dem.number}" disabled>${dem.number} — retirado (${esc(dem.retired)})</option>`);
        else opts.push(`<option value="${dem.number}">Concederle el ${dem.number}${dem.holder ? ` (lo lleva ${esc(dem.holder)}, pasará a otro)` : ' (libre)'}</option>`);
        alts.slice(0, 6).forEach(n => opts.push(`<option value="${n}">Ofrecerle el ${n} (libre)</option>`));
        opts.push('<option value="0">No ofrecer dorsal</option>');
        box = document.createElement('div'); box.id = 'pcfShirtOffer'; box.dataset.sig = sig;
        box.innerHTML = `<label for="offeredShirt">👕 Dorsal — su agente pide el <strong>${dem.number}</strong>${dem.retired ? ` (retirado en honor a ${esc(dem.retired)})` : ''}</label><select id="offeredShirt">${opts.join('')}</select>`;
        const first = box.querySelector('option:not([disabled])'); if (first) box.querySelector('select').value = first.value;
        host.appendChild(box);
    }
    (function watchNegotiation() {
        const modal = document.getElementById('negotiationModal');
        if (!modal) { setTimeout(watchNegotiation, 700); return; }
        let t = 0;
        new MutationObserver(() => { if (t) return; t = setTimeout(() => { t = 0; try { negotiationUI(); } catch (e) { /* */ } }, 60); })
            .observe(modal, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    })();

    // ── Análisis de carrera ─────────────────────────────────
    // Una temporada vale según la categoría en la que se jugó (en Promesas los jugadores son críos de 13-15 años y pueden
    // pasar 15 temporadas en el mismo club sin que eso signifique nada), y para ser leyenda hace falta además un nivel
    // mínimo de calidad propio de esa categoría.
    const DIV_WEIGHT = { primera: 1, segunda: 0.9, rfef_grupo1: 0.75, rfef_grupo2: 0.75, rfef: 0.75, promesas: 0.5 };
    const LEVEL_PEAK = { primera: 80, segunda: 74, rfef_grupo1: 68, rfef_grupo2: 68, rfef: 68, promesas: 65 };
    const wOf = d => DIV_WEIGHT[d] ?? 1;
    function analyze(snap, s) {
        const career = snap.career || [];
        const mine = career.filter(e => e.club === snap.club);
        const seasons = new Set(mine.map(e => e.season));
        let nSeasons = seasons.size;
        const divNow = s.division || 'primera';
        if (!nSeasons && snap.joinedSeason) {
            const a = parseInt(String(snap.joinedSeason).split('/')[0], 10), b = parseInt(String(snap.season || s.currentSeason).split('/')[0], 10);
            if (a && b) nSeasons = Math.max(1, b - a + 1);
        }
        // Sumas ponderadas por categoría
        let ws = 0, wa = 0, wg = 0; const wByDiv = {};
        for (const e of mine) { const w = wOf(e.division); ws += w; wa += (e.matches || 0) * w; wg += (e.goals || 0) * w; wByDiv[e.division || divNow] = (wByDiv[e.division || divNow] || 0) + w; }
        if (!mine.length && nSeasons) { ws = nSeasons * wOf(divNow); wByDiv[divNow] = ws; }
        const main = Object.entries(wByDiv).sort((x, y) => y[1] - x[1])[0]?.[0] || divNow;
        const apps = mine.reduce((n, e) => n + (e.matches || 0), 0), goals = mine.reduce((n, e) => n + (e.goals || 0), 0);
        let titles = 0, wt = 0;
        for (const t of (s.trophies || [])) {
            if (t.kind === 'ascenso') continue;
            const e = mine.find(x => x.season === t.season);
            if (e && (e.matches || 0) >= 8) { titles++; wt += wOf(e.division); }
        }
        return { seasons: nSeasons, apps, goals, titles, ws, wa, wg, wt, main, peak: snap.peak || snap.overall || 0,
            clubs: [...new Set(career.map(e => e.club))], leagueSeasons: new Set(career.map(e => e.season)).size };
    }
    function isClubLegend(a) {
        const need = LEVEL_PEAK[a.main] ?? 80;
        if ((a.peak || 0) < need) return false;                       // nivel mínimo de la categoría donde jugó
        return a.ws >= 8 || (a.ws >= 5 && a.wt >= 1 && a.peak >= need + 5) || a.wa >= 250 || (a.ws >= 6 && a.wg >= 100);
    }
    const isLeagueLegend = a => a.peak >= 90 || (a.leagueSeasons >= 12 && a.peak >= 84);
    // «Hijo de la cantera»: se formó en tu club (2+ temporadas) y triunfó en otro sitio (media máxima 85+)
    function ownCanteraSeasons(snap, s) { return (snap.career || []).filter(e => e.club === s.team).length; }
    const isCanteraStar = (a, seasonsHere) => seasonsHere >= 2 && a.peak >= 85;

    // ── Retiradas pendientes (las deja gameLogic al rodar la temporada) ──
    function processPending(s) {
        const list = s.legacyPending || [];
        if (!list.length) return false;
        const lg = L(s), news = [], press = [], queueCeremony = [], tributes = [];
        for (const snap of list) {
            if (lg.done[snap.id]) continue;
            lg.done = { ...lg.done, [snap.id]: true };
            const a = analyze(snap, s);
            if (snap.club === s.team) {
                if (isClubLegend(a)) {
                    queueCeremony.push({ ...snap, ...a });
                    press.push({ kind: 'leyenda_club', playerName: snap.name, number: snap.shirt, seasons: a.seasons, apps: a.apps, goals: a.goals, titles: a.titles, position: snap.position, peak: a.peak });
                    news.push(`🕊️ ${snap.name} se retira tras ${a.seasons} temporadas en el club. ¡Una leyenda!`);
                }
            } else if (isCanteraStar(a, ownCanteraSeasons(snap, s))) {
                const here = ownCanteraSeasons(snap, s);
                lg.canteraStars = [...(lg.canteraStars || []), { name: snap.name, position: snap.position, club: snap.club, peak: a.peak, seasonsHere: here, retiredSeason: snap.season }].slice(-30);
                tributes.push({ name: snap.name, club: snap.club, cantera: true });
                press.push({ kind: 'leyenda_liga', playerName: snap.name, clubs: a.clubs, seasons: a.leagueSeasons, peak: a.peak, position: snap.position, fromClub: s.team });
                news.push(`🌱 Se retira ${snap.name}, formado en tu cantera (${here} temporadas en el club, media máxima ${a.peak}).`);
            } else if (isLeagueLegend(a)) {
                lg.leagueLegends = [...lg.leagueLegends, { name: snap.name, position: snap.position, club: snap.club, peak: a.peak, seasons: a.leagueSeasons, clubs: a.clubs, retiredSeason: snap.season }].slice(-30);
                tributes.push({ name: snap.name, club: snap.club });
                press.push({ kind: 'leyenda_liga', playerName: snap.name, clubs: a.clubs, seasons: a.leagueSeasons, peak: a.peak, position: snap.position });
                news.push(`🌟 Se retira ${snap.name}, leyenda de la liga (${a.leagueSeasons} temporadas, media máxima ${a.peak}).`);
            }
        }
        lg.ceremonies = [...lg.ceremonies, ...queueCeremony];
        lg.tributes = [...lg.tributes, ...tributes];
        gl().updateGameState({ legacy: lg, legacyPending: [] });
        news.forEach(n => gl().addNews?.(n, 'info'));
        press.forEach(p => window.pcfQueuePress?.(p));
        return true;
    }

    // ── Despedidas: veteranos que se van sin retirarse ──────
    function trackVeterans(s) {
        const squad = s.squad || [];
        if (squad.length < 8 || !s.seasonType) return;
        const lg = L(s), cur = new Set(squad.map(p => String(key(p)))), pend = new Set((s.legacyPending || []).map(x => String(x.id)));
        const vets = { ...lg.vets }; let changed = false; const press = [], news = [];
        for (const p of squad) {
            if (p.contractType !== 'owned') continue;
            const a = analyze({ career: p.career, club: s.team, joinedSeason: p.joinedSeason, peak: p.peakOvr, season: s.currentSeason }, s);
            if (a.ws >= 6) {
                const prev = vets[key(p)];
                if (!prev || prev.seasons !== a.seasons) { vets[key(p)] = { name: p.name, position: p.position, seasons: a.seasons, apps: a.apps, goals: a.goals, titles: a.titles, shirt: p.shirt || null }; changed = true; }
            }
        }
        for (const id of Object.keys(vets)) {
            if (cur.has(String(id)) || pend.has(String(id)) || lg.done[id]) continue;
            const v = vets[id];
            press.push({ kind: 'despedida', playerName: v.name, seasons: v.seasons, apps: v.apps, goals: v.goals, titles: v.titles });
            news.push(`👋 ${v.name} deja el club tras ${v.seasons} temporadas.`);
            lg.done = { ...lg.done, [id]: true }; delete vets[id]; changed = true;
        }
        if (changed) { setLegacy({ ...lg, vets }); }
        news.forEach(n => gl().addNews?.(n, 'info'));
        press.forEach(p => window.pcfQueuePress?.(p));
    }

    // ── Ceremonia de retirada ───────────────────────────────
    const ROLES = { ambassador: { icon: '🤝', label: 'Embajador del club', desc: '+1 de popularidad y +1,5 % de afición al empezar cada temporada' },
        scout: { icon: '🔭', label: 'Ojeador', desc: 'tus búsquedas de promesas cuentan con +1 nivel de ojeador' },
        youth: { icon: '🌱', label: 'Entrenador de cantera', desc: 'la cantera progresa un 15 % más rápido (y cuenta como entrenador si no tienes)' },
        coach: { icon: '🧢', label: 'Segundo entrenador', desc: 'ocupa el puesto de segundo entrenador (nivel 3, sin sueldo) mientras no contrates a otro' } };
    function showCeremony(c) {
        return new Promise(resolve => {
            document.getElementById('pcfCeremony')?.remove();
            window.pcfEnsureDialogStyles?.();
            const s = gs(), lg = L(s), retired = retiredNums(s), roles = lg.roles || {};
            const canRetire = !!c.shirt && !retired.has(c.shirt);
            const back = document.createElement('div');
            back.id = 'pcfCeremony'; back.className = 'pcf-dlg-back';
            if (!document.getElementById('pcfCeremonyStyles')) {
                const st = document.createElement('style'); st.id = 'pcfCeremonyStyles';
                // Los input del juego son de ancho completo: aquí las casillas y los botones de opción van pequeños y en línea
                st.textContent = `#pcfCeremony label{display:flex;align-items:flex-start;gap:8px;margin:4px 0;line-height:1.3;cursor:pointer}
                #pcfCeremony input[type="radio"],#pcfCeremony input[type="checkbox"]{width:20px !important;height:20px !important;min-height:0 !important;padding:0 !important;margin:2px 0 0 !important;flex:0 0 20px;accent-color:#ffd24a}
                #pcfCeremony .pcf-dlg{max-height:92vh;overflow-y:auto}
                #pcfCeremony .cer-foot{position:sticky;bottom:0;background:linear-gradient(180deg,transparent,#0b1f40 35%);padding:12px 0 2px;margin-top:8px}`;
                document.head.appendChild(st);
            }
            back.innerHTML = `<div class="pcf-dlg" role="dialog" aria-modal="true"><h3>🕊️ Homenaje a ${esc(c.name)}</h3><div class="pcf-dlg-body" style="white-space:normal">
                <p style="margin:0 0 8px">${esc(c.seasons)} temporadas · ${esc(c.apps)} partidos${c.goals ? ` · ${esc(c.goals)} goles` : ''}${c.titles ? ` · ${esc(c.titles)} título${c.titles === 1 ? '' : 's'}` : ''}${c.shirt ? ` · dorsal ${esc(c.shirt)}` : ''}.<br>El club le prepara la despedida que merece. ¿Qué decides?</p>
                ${canRetire ? `<p style="margin:10px 0 4px"><strong>Dorsal</strong></p>
                <label><input type="radio" name="cDorsal" value="1" checked><span>Retirar el dorsal ${esc(c.shirt)} (para siempre, al museo)</span></label>
                <label><input type="radio" name="cDorsal" value="0"><span>No retirarlo</span></label>` : `<p style="margin:10px 0 4px;opacity:.75">${c.shirt ? `El dorsal ${esc(c.shirt)} ya está retirado.` : 'No tenía dorsal asignado.'}</p>`}
                <p style="margin:10px 0 4px"><strong>Su futuro en el club</strong></p>
                ${Object.entries(ROLES).map(([k, r]) => { const busyCoach = k === 'coach' && s.staff?.segundoEntrenador && !s.staff.segundoEntrenador.legend; const off = !!roles[k] || busyCoach; return `<label style="${off ? 'opacity:.55' : ''}"><input type="radio" name="cRole" value="${k}" ${off ? 'disabled' : ''}><span>${r.icon} ${esc(r.label)} <small>— ${esc(r.desc)}${roles[k] ? ` (ocupado: ${esc(roles[k].name)})` : busyCoach ? ` (ocupado: ${esc(s.staff.segundoEntrenador.name)})` : ''}</small></span></label>`; }).join('')}
                <label><input type="radio" name="cRole" value="" checked><span>Que disfrute de su retiro</span></label>
                <p style="margin:10px 0 4px"><strong>Despedida</strong></p>
                <label><input type="checkbox" id="cMatch"><span>Organizar un partido homenaje <small>— taquilla extra, el equipo llega más cansado</small></span></label>
                <div class="cer-foot"><button type="button" class="btn" id="cOk" style="display:block;width:100%;min-height:44px">Confirmar</button></div></div></div>`;
            back.querySelector('#cOk').onclick = () => {
                const retire = canRetire && back.querySelector('input[name="cDorsal"]:checked')?.value === '1';
                const role = back.querySelector('input[name="cRole"]:checked')?.value || '';
                const match = back.querySelector('#cMatch').checked;
                back.remove(); document.removeEventListener('keydown', onKey, true);
                resolve({ retire, role, match });
            };
            const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); back.querySelector('#cOk').click(); } };
            document.addEventListener('keydown', onKey, true);
            document.body.appendChild(back);
        });
    }
    async function runCeremony(s) {
        const lg0 = L(s), c = lg0.ceremonies[0];
        const choice = await showCeremony(c);
        const cur = gs(), lg = L(cur);
        const rest = lg.ceremonies.slice(1);
        let upd = {}, notes = [];
        const legend = { id: c.id, name: c.name, position: c.position, seasons: c.seasons, apps: c.apps, goals: c.goals, titles: c.titles, peak: c.peak, shirt: c.shirt, retiredSeason: c.season, numberRetired: false, role: null };
        let pop = cur.popularity || 0, squad = cur.squad, balance = cur.balance, movs = cur.seasonMovements, fan = cur.fanbase;
        const moodAll = d => (squad || []).map(p => p.contractType === 'loaned_out' ? p : { ...p, moodMod: clamp((Number(p.moodMod) || 0) + d, -40, 40), satisfaction: p.satisfaction === undefined ? p.satisfaction : clamp(p.satisfaction + d, 0, 100) });
        if (choice.retire) {
            legend.numberRetired = true;
            lg.retired = [...lg.retired, { number: c.shirt, name: c.name, id: c.id, position: c.position, seasons: c.seasons, apps: c.apps, goals: c.goals, titles: c.titles, retiredSeason: c.season }];
            pop = clamp(pop + 3, 0, 100); squad = moodAll(6);
            notes.push(`👕 El club retira el dorsal ${c.shirt} en honor a ${c.name}.`);
            window.pcfQueuePress?.({ kind: 'dorsal_retirado', playerName: c.name, number: c.shirt, seasons: c.seasons });
        }
        if (choice.role) {
            legend.role = choice.role; lg.roles = { ...lg.roles, [choice.role]: { id: c.id, name: c.name, since: c.season } };
            if (choice.role === 'ambassador') pop = clamp(pop + 2, 0, 100);
            if (choice.role === 'coach') { upd.staff = legendCoachStaff(cur, c.name); }
            notes.push(`${ROLES[choice.role].icon} ${c.name} pasa a ser ${ROLES[choice.role].label.toLowerCase()} del club.`);
        }
        if (choice.match) {
            const cash = Math.round(clamp((Number(cur.weeklyExpenses) || 0) * 3, 40000, 6e6) / 1000) * 1000;
            balance += cash; pop = clamp(pop + 2, 0, 100);
            squad = (squad || []).map(p => p.contractType === 'loaned_out' ? p : { ...p, condition: clamp((p.condition ?? 100) - 8, 1, 100) });
            movs = [...(movs || []), { week: cur.week, type: 'income', description: `Ayuda: partido homenaje a ${c.name}`, amount: cash }];
            notes.push(`🏟️ Partido homenaje a ${c.name}: ${fmt(cash)} € de recaudación.`);
        }
        lg.legends = [...lg.legends, legend]; lg.ceremonies = rest;
        gl().updateGameState({ legacy: lg, popularity: pop, squad, balance, seasonMovements: movs, fanbase: fan, ...(upd.staff ? { staff: upd.staff } : {}) });
        notes.forEach(n => gl().addNews?.(n, 'success'));
        window.ui?.refreshUI?.(gl().getViewState());
    }

    // ── Leyenda como segundo entrenador ─────────────────────
    function legendCoachStaff(s, name) {
        return { ...(s.staff || {}), segundoEntrenador: { name, level: 3, salary: 0, clausula: 0, role: 'segundoEntrenador', displayName: 'Segundo Entrenador', legend: true } };
    }
    // Si el puesto lo ocupa otra persona (o queda vacío), el rol de la leyenda termina
    function syncLegendCoach(s) {
        const lg = L(s), c = lg.roles?.coach;
        if (!c) return;
        const slot = s.staff?.segundoEntrenador;
        if (slot && slot.legend) return;
        const roles = { ...lg.roles }; delete roles.coach;
        setLegacy({ ...lg, roles, legends: lg.legends.map(l => l.id === c.id ? { ...l, role: null } : l) });
        gl().addNews?.(`🧢 ${c.name} deja el puesto de segundo entrenador.`, 'info');
    }

    // ── Efecto estacional del embajador ─────────────────────
    function ambassadorTick(s) {
        const lg = L(s);
        if (!lg.roles?.ambassador || s.seasonType !== 'regular' || lg.ambSeason === s.currentSeason) return;
        setLegacy({ ...lg, ambSeason: s.currentSeason });
        gl().updateGameState({ popularity: clamp((s.popularity || 0) + 1, 0, 100), fanbase: Math.round((s.fanbase || 0) * 1.015) });
        gl().addNews?.(`🤝 ${lg.roles.ambassador.name}, embajador del club, atrae nuevos aficionados esta temporada.`, 'info');
    }

    // ── Cambio de dorsal (ficha del jugador) ────────────────
    function holderOf(s, n, exceptKey) { return (s.squad || []).find(p => p.shirt === n && key(p) !== exceptKey); }
    async function changeShirt(playerKey, n, via = 'ficha') {
        const s = gs(); const p = (s.squad || []).find(x => String(key(x)) === String(playerKey));
        if (!p) return false;
        n = Math.round(Number(n));
        if (!(n >= 1 && n <= 99)) { window.pcfToast?.('El dorsal debe estar entre 1 y 99.', { type: 'warn' }); return false; }
        const ret = (L(s).retired || []).find(r => r.number === n);
        if (ret) { window.pcfToast?.(`El ${n} está retirado en honor a ${String(ret.name).replace(/\.$/, '')}`, { type: 'error' }); return false; }
        if (n === p.shirt) return true;
        const other = holderOf(s, n, key(p));
        if (other) {
            const ok = await window.pcfConfirm('Intercambiar dorsales', `${other.name} lleva el ${n}. ¿Intercambiar dorsales con ${p.name}?`, { okLabel: 'Intercambiar', cancelLabel: 'Cancelar' });
            if (!ok) return false;
        }
        const cur = gs();
        const squad = (cur.squad || []).map(x => {
            if (String(key(x)) === String(playerKey)) return { ...x, shirt: n, moodMod: clamp((Number(x.moodMod) || 0) + (x._shirtWish === n ? 10 : 2), -40, 40) };
            if (other && key(x) === key(other)) return { ...x, shirt: p.shirt, moodMod: clamp((Number(x.moodMod) || 0) - (x.age >= 30 ? 4 : 2), -40, 40) };
            return x;
        });
        gl().updateGameState({ squad });
        window.pcfToast?.(`${p.name} lleva ahora el ${n}${other ? ` (${other.name} pasa al ${p.shirt})` : ''}.`, { type: 'success' });
        window.ui?.refreshUI?.(gl().getViewState());
        return true;
    }
    function openShirtDialog(playerKey) {
        const s = gs(); const p = (s.squad || []).find(x => String(key(x)) === String(playerKey)); if (!p) return;
        window.pcfEnsureDialogStyles?.();
        document.getElementById('pcfShirtDlg')?.remove();
        const retired = L(s).retired || [];
        const back = document.createElement('div'); back.id = 'pcfShirtDlg'; back.className = 'pcf-dlg-back';
        back.innerHTML = `<div class="pcf-dlg" role="dialog" aria-modal="true"><h3>👕 Dorsal de ${esc(p.name)}</h3><div class="pcf-dlg-body" style="white-space:normal">
            <p style="margin:0 0 8px">Dorsal actual: <strong>${esc(p.shirt)}</strong>. Si el nuevo lo lleva otro jugador, se intercambian.</p>
            <input type="number" id="shNew" min="1" max="99" placeholder="Nuevo dorsal (1-99)" style="width:100%;margin-bottom:8px">
            ${retired.length ? `<p style="margin:0 0 8px;font-size:.85em;opacity:.8">Retirados: ${retired.map(r => `${r.number} (${esc(r.name)})`).join(', ')}</p>` : ''}
            <div style="display:flex;gap:8px"><button type="button" class="btn" id="shOk" style="flex:1;min-height:42px">Cambiar</button><button type="button" class="btn" id="shCancel" style="flex:1;min-height:42px">Cancelar</button></div></div></div>`;
        const close = () => back.remove();
        back.querySelector('#shCancel').onclick = close;
        back.querySelector('#shOk').onclick = async () => { const v = back.querySelector('#shNew').value; close(); if (v) await changeShirt(playerKey, v); };
        document.body.appendChild(back);
        setTimeout(() => back.querySelector('#shNew')?.focus(), 50);
    }
    function injectCardRow() {
        const modal = document.getElementById('playerModal');
        if (!modal || getComputedStyle(modal).display === 'none') return;
        const content = modal.querySelector('.player-modal-content'); if (!content) return;
        const name = (content.querySelector('.pcf-card-title h2') || content.querySelector('#modalPlayerName') || content.querySelector('h2'))?.textContent?.trim();
        const s = gs(); if (!name || !s) return;
        const p = (s.squad || []).find(x => x.name === name);
        let box = document.getElementById('pcfShirtBox');
        if (!p || !p.shirt) { box?.remove(); return; }
        const retired = (L(s).retired || []).length;
        const html = `<span style="display:inline-flex;align-items:center;gap:6px"><span style="font-size:1.4rem">👕</span> Dorsal <strong style="font-size:1.25rem;color:#ffd24a">${esc(p.shirt)}</strong></span><button type="button" class="btn" data-shirt-change="${esc(key(p))}" style="margin-left:auto;min-height:32px;padding:4px 12px">Cambiar</button>`;
        if (box && box.dataset.sig === `${name}|${p.shirt}|${retired}`) return;
        if (!box) { box = document.createElement('div'); box.id = 'pcfShirtBox'; box.style.cssText = 'display:flex;align-items:center;gap:10px;margin:8px 0;padding:8px 12px;border:1px solid #3d6aa8;border-radius:4px;background:rgba(255,210,74,.07)'; }
        box.dataset.sig = `${name}|${p.shirt}|${retired}`; box.innerHTML = html;
        const head = content.querySelector('.pcf-card-head') || content.querySelector('.modal-header');
        if (head && box.previousElementSibling !== head) head.after(box); else if (!head && !box.parentNode) content.prepend(box);
    }
    document.addEventListener('click', e => { const b = e.target.closest?.('[data-shirt-change]'); if (b) openShirtDialog(b.dataset.shirtChange); });
    (function watchCard() {
        const modal = document.getElementById('playerModal');
        if (!modal) { setTimeout(watchCard, 600); return; }
        let t = 0;
        new MutationObserver(() => { if (t) return; t = setTimeout(() => { t = 0; try { injectCardRow(); } catch (e) { /* */ } }, 40); })
            .observe(modal, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    })();

    // ── Museo (HTML para la Sala de trofeos) ────────────────
    function shirtSvg(n) {
        return `<svg viewBox="0 0 100 110" width="84" height="92" aria-hidden="true"><path d="M30 8 L10 22 L2 48 L18 54 L22 40 L22 104 L78 104 L78 40 L82 54 L98 48 L90 22 L70 8 C64 18 36 18 30 8Z" fill="#1e3f7a" stroke="#ffd24a" stroke-width="3"/>
            <text x="50" y="72" font-size="${String(n).length > 1 ? 36 : 44}" text-anchor="middle" fill="#fff" font-weight="900" font-family="Arial,sans-serif">${esc(n)}</text></svg>`;
    }
    function injectStyles() {
        if (document.getElementById('pcfLegacyStyles')) return;
        const st = document.createElement('style'); st.id = 'pcfLegacyStyles';
        st.textContent = `#museum .ac-cat{margin:14px 0 6px;font-size:.8rem;letter-spacing:.1em;text-transform:uppercase;color:#a9c0e6}
        #museum .tr-empty{color:#6f86ad;font-style:italic;font-size:.85rem}
        #museum .tr-career{background:#0e2549;border:1px solid #2a4a7c;border-radius:4px;padding:10px 12px;font-size:.9rem;line-height:1.7;color:#e6eefb}
        #museumContent{padding:4px 6px 20px}
        #museum .mu-banner{height:130px;border:1px solid #3d6aa8;border-radius:4px;margin:6px 0 10px;overflow:hidden;background:linear-gradient(135deg,#1b2a46,#3a3322 60%,#7b6a3c);display:flex;align-items:center;justify-content:center;font-size:2.6rem;position:relative}
        #museum .mu-banner img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:sepia(.25)}
        #museum .mu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
        #museum .mu-card{background:#0e2549;border:1px solid #2a4a7c;border-radius:4px;padding:8px;text-align:center;font-size:.8rem;line-height:1.25;color:#cfe0fb}
        #museum .mu-card b{display:block;color:#fff;font-size:.9rem;margin-top:2px}
        #museum .mu-card.gold{border-color:#ffd24a;background:linear-gradient(180deg,rgba(255,210,74,.12),#0e2549)}
        #museum .mu-chip{display:inline-block;margin:3px 2px 0;padding:1px 7px;border-radius:10px;background:#1a3763;font-size:.72rem}`;
        document.head.appendChild(st);
    }
    function html(s) {
        injectStyles();
        const lg = L(s);
        let out = '<div class="mu-banner"><span>🏛️</span><img src="assets/museo/banner.webp" alt="" onerror="this.remove()"></div>';
        out += '<div class="ac-cat">Dorsales retirados</div>';
        out += lg.retired.length ? `<div class="mu-grid">${lg.retired.map(r => `<div class="mu-card gold">${shirtSvg(r.number)}<b>${esc(r.name)}</b>${esc(r.seasons)} temp. · ${esc(r.apps)} partidos${r.goals ? ` · ${esc(r.goals)} goles` : ''}<br><small>Retirado en ${esc(r.retiredSeason)}</small></div>`).join('')}</div>`
            : '<p class="tr-empty">Todavía no hay dorsales retirados. Cuando una leyenda se retire, podrás homenajearla aquí.</p>';
        out += '<div class="ac-cat">Salón de leyendas del club</div>';
        out += lg.legends.length ? `<div class="mu-grid">${lg.legends.map(l => `<div class="mu-card">🕊️<b>${esc(l.name)}</b>${esc(l.seasons)} temp. · ${esc(l.apps)} partidos${l.goals ? ` · ${esc(l.goals)} goles` : ''}${l.titles ? ` · ${esc(l.titles)} título${l.titles === 1 ? '' : 's'}` : ''}<br>
            ${l.numberRetired ? `<span class="mu-chip">👕 dorsal ${esc(l.shirt)} retirado</span>` : ''}${l.role ? `<span class="mu-chip">${esc(ROLES[l.role]?.icon || '')} ${esc(ROLES[l.role]?.label || l.role)}</span>` : ''}</div>`).join('')}</div>`
            : '<p class="tr-empty">Aquí aparecerán los grandes nombres de tu club cuando cuelguen las botas.</p>';
        if (lg.leagueLegends.length) out += '<div class="ac-cat">Leyendas de la liga</div><div class="mu-grid">' + lg.leagueLegends.map(l => `<div class="mu-card">🌟<b>${esc(l.name)}</b>${esc(l.seasons)} temporadas · media máx. ${esc(l.peak)}<br><small>${esc((l.clubs || []).slice(0, 3).join(' · '))}</small><br><small>Retirado en ${esc(l.retiredSeason)}</small></div>`).join('') + '</div>';
        if ((lg.canteraStars || []).length) out += '<div class="ac-cat">Hijos de la cantera</div><div class="mu-grid">' + lg.canteraStars.map(l => `<div class="mu-card">🌱<b>${esc(l.name)}</b>Formado en el club (${esc(l.seasonsHere)} temp.) · media máx. ${esc(l.peak)}<br><small>Se retiró en el ${esc(l.club)} · ${esc(l.retiredSeason)}</small></div>`).join('') + '</div>';
        const roles = Object.entries(lg.roles || {});
        if (roles.length) out += '<div class="ac-cat">Leyendas con función en el club</div><div class="tr-career">' + roles.map(([k, r]) => `${esc(ROLES[k]?.icon || '')} <strong>${esc(r.name)}</strong> — ${esc(ROLES[k]?.label || k)} (desde ${esc(r.since)})`).join('<br>') + '</div>';
        // Hitos: primera vez de cada título
        const first = {}; (s.trophies || []).forEach(t => { if (!first[t.kind]) first[t.kind] = t; });
        const LBL = { liga: 'Primera liga', copa: 'Primera Copa', champions: 'Primera Champions League', europaLeague: 'Primera Europa League', conferenceLague: 'Primera Conference League', ascenso: 'Primer ascenso' };
        const hitos = Object.entries(first).filter(([k]) => LBL[k]).map(([k, t]) => `${LBL[k]}: ${t.season}`);
        if (hitos.length) out += '<div class="ac-cat">Hitos del club</div><div class="tr-career">' + hitos.map(esc).join('<br>') + '</div>';
        return out;
    }

    // ── Página «Museo del club» (pantalla aparte; se abre desde Noticias) ──
    function createMuseumPage() {
        if (document.getElementById('museum')) return;
        injectStyles();
        const page = document.createElement('div');
        page.id = 'museum'; page.className = 'page';
        page.innerHTML = `<div class="page-header"><h1>🏛️ Museo del club</h1>
            <button class="page-close-btn" onclick="closePage('museum')">✖ CERRAR</button></div><div id="museumContent"></div>`;
        document.body.appendChild(page);
    }
    function renderMuseum() { const s = gs(), root = document.getElementById('museumContent'); if (s && root) root.innerHTML = html(s); }
    (function hookMuseumOpen() {
        if (typeof window.openPage !== 'function') { setTimeout(hookMuseumOpen, 300); return; }
        createMuseumPage();
        const orig = window.openPage;
        if (orig._pcfMuseum) return;
        const wrapped = function (id, ...rest) {
            const r = orig.call(this, id, ...rest);
            if (id === 'museum') { try { renderMuseum(); } catch (e) { console.warn('Museo:', e.message); } }
            return r;
        };
        // conservar las marcas de otros ganchos (p. ej. el de trofeos)
        Object.keys(orig).forEach(k => { wrapped[k] = orig[k]; });
        wrapped._pcfMuseum = true;
        window.openPage = wrapped;
    })();

    // ── Eventos de dorsal y tributo ─────────────────────────
    function wantedNumber(s, p) {
        const retired = retiredNums(s);
        const recent = p.joinedSeason === s.currentSeason && !p._shirtAsked;
        const star = p.overall >= 80 && p.shirt > 20 && !p._shirtAsked && (p.age || 30) <= 28;
        const unhappy = (p.satisfaction ?? 70) < 60 && !p._shirtAsked && p.overall >= 70;
        if (!recent && !star && !unhappy) return null;
        const list = (star ? [...STAR_NUMBERS.filter(n => n !== p.shirt && (p.position === 'POR' ? false : true)), ...pref(p)] : pref(p)).filter(n => n !== p.shirt);
        // preferencia: uno que otro lleve o esté retirado (más «apetecible»), si no, el primero
        const withStakes = list.find(n => retired.has(n) || holderOf(s, n, key(p)));
        return withStakes ?? list[0] ?? null;
    }
    function installEvents() {
        const ev = window.pcfEvents;
        if (!ev?.EVENTS) { setTimeout(installEvents, 800); return; }
        if (ev.EVENTS.some(e => e.id === 'shirt_request')) return;
        const patchSquad = (s, k, fn) => (s.squad || []).map(p => String(key(p)) === String(k) ? fn(p) : p);
        const mood = (p, d) => ({ ...p, moodMod: clamp((Number(p.moodMod) || 0) + d, -40, 40), satisfaction: p.satisfaction === undefined ? p.satisfaction : clamp(p.satisfaction + d, 0, 100) });
        ev.EVENTS.push({
            id: 'shirt_request', w: 3, cd: 14, icon: '👕', title: 'Un jugador pide un dorsal',
            eligible(s) {
                const c = (s.squad || []).filter(p => p.contractType === 'owned' && p.shirt).map(p => ({ p, want: wantedNumber(s, p) })).filter(x => x.want);
                if (!c.length) return null;
                const x = c[Math.floor(api.rnd() * c.length)], retired = (L(s).retired || []).find(r => r.number === x.want), holder = holderOf(s, x.want, key(x.p));
                return { k: key(x.p), name: x.p.name, want: x.want, cur: x.p.shirt, holder: holder ? { k: key(holder), name: holder.name } : null, legend: retired ? retired.name : null };
            },
            text: e => `El agente de ${e.name} te pide el dorsal ${e.want} para su representado (ahora lleva el ${e.cur}).${e.legend ? ` Es el dorsal retirado en honor a ${e.legend}: la afición no lo vería con buenos ojos.` : e.holder ? ` Ahora lo lleva ${e.holder.name}.` : ' Está libre.'}`,
            choices: [
                { label: 'Concederle el dorsal (si está retirado, se rompe el homenaje)', tags: '🎭 📣', run: (s, e) => {
                    const lg = L(s); let extra = {};
                    if (e.legend) { lg.retired = lg.retired.filter(r => r.number !== e.want); lg.legends = lg.legends.map(l => l.shirt === e.want ? { ...l, numberRetired: false } : l); extra = { popularity: clamp((s.popularity || 0) - 3, 0, 100), boardConfidence: clamp((s.boardConfidence ?? 65) - 2, 0, 100) }; }
                    const squad = (s.squad || []).map(p => {
                        if (String(key(p)) === String(e.k)) return mood({ ...p, shirt: e.want, _shirtAsked: true }, 20);
                        if (e.holder && String(key(p)) === String(e.holder.k)) return mood({ ...p, shirt: e.cur }, p.age >= 30 ? -4 : -2);
                        return p;
                    });
                    return { patch: { squad, legacy: lg, ...extra }, result: `${e.name} lucirá el ${e.want}${e.holder ? ` y ${e.holder.name} pasa al ${e.cur}` : ''}.${e.legend ? ` La afición lamenta que se rompa el homenaje a ${e.legend}.` : ' Está encantado.'}` };
                } },
                { label: 'Ofrecerle otro número parecido', tags: '🎭', run: (s, e) => {
                    const retired = retiredNums(s), taken = new Set((s.squad || []).map(p => p.shirt));
                    const me = (s.squad || []).find(p => String(key(p)) === String(e.k));
                    const alt = freeNumber(me, taken, retired, [e.want, e.cur]);
                    const ok = api.rnd() < 0.55;
                    return { patch: { squad: patchSquad(s, e.k, p => mood({ ...p, shirt: ok ? alt : p.shirt, _shirtAsked: true }, ok ? 6 : -6)) }, result: ok ? `${e.name} acepta el ${alt} como alternativa.` : `${e.name} no se conforma y se siente poco valorado.` };
                } },
                { label: 'Negarse', tags: '🎭', run: (s, e) => ({ patch: { squad: patchSquad(s, e.k, p => mood({ ...p, _shirtAsked: true }, e.legend ? -6 : -10)) }, result: `${e.name} se va resignado, pero molesto.` }) }
            ]
        });
        ev.EVENTS.push({
            id: 'legend_return', w: 3, cd: 40, icon: '🧢', title: 'Una leyenda quiere volver',
            eligible(s) {
                const yr = parseInt(String(s.currentSeason).split('/')[0], 10), slot = s.staff?.segundoEntrenador;
                if (slot) return null;
                const l = (L(s).legends || []).find(x => !x.role && !x.returnAsked && yr - parseInt(String(x.retiredSeason).split('/')[0], 10) >= 3);
                return l ? { id: l.id, name: l.name, years: yr - parseInt(String(l.retiredSeason).split('/')[0], 10) } : null;
            },
            text: e => `${e.name}, retirado hace ${e.years} temporadas, se ha puesto en contacto con el club: le gustaría volver como segundo entrenador y devolverle a la afición lo que recibió.`,
            choices: [
                { label: 'Aceptar: vuelve al banquillo', tags: '📣 🎭', run: (s, e) => {
                    const lg = L(s); lg.roles = { ...lg.roles, coach: { id: e.id, name: e.name, since: s.currentSeason } };
                    lg.legends = lg.legends.map(l => l.id === e.id ? { ...l, role: 'coach', returnAsked: true } : l);
                    return { patch: { legacy: lg, staff: legendCoachStaff(s, e.name), popularity: clamp((s.popularity || 0) + 2, 0, 100), squad: (s.squad || []).map(p => mood(p, 3)) }, result: `${e.name} regresa como segundo entrenador (nivel 3, sin sueldo). La afición lo celebra.` };
                } },
                { label: 'Agradecérselo pero declinar', tags: '', run: (s, e) => { const lg = L(s); lg.legends = lg.legends.map(l => l.id === e.id ? { ...l, returnAsked: true } : l); return { patch: { legacy: lg }, result: `${e.name} lo entiende. Las puertas del club seguirán abiertas.` }; } }
            ]
        });
        ev.EVENTS.push({
            id: 'league_tribute', w: 8, cd: 4, priority: true, icon: '🌟', title: 'Homenaje a una leyenda de la liga',
            eligible(s) { const t = (L(s).tributes || [])[0]; return t ? { name: t.name, club: t.club, cantera: !!t.cantera } : null; },
            text: e => e.cantera ? `${e.name}, formado en tu cantera y ahora retirado tras triunfar en el ${e.club}, será despedido por la afición. ¿Qué gesto tiene el club con su hijo pródigo?` : `${e.name}, leyenda de la liga y símbolo del ${e.club}, se ha retirado. La competición propone un homenaje en todos los estadios.`,
            choices: [
                { label: 'Minuto de aplausos y vídeo homenaje', tags: '📣 🎭', run: (s, e) => { const lg = L(s); lg.tributes = lg.tributes.slice(1); return { patch: { legacy: lg, popularity: clamp((s.popularity || 0) + 1, 0, 100), squad: (s.squad || []).map(p => mood(p, 2)) }, result: `El estadio se pone en pie para despedir a ${e.name}.` }; } },
                { label: 'Invitarle como invitado de honor (cuesta dinero)', tags: '💶 📣', run: (s, e) => { const lg = L(s); lg.tributes = lg.tributes.slice(1); const cost = Math.round(clamp((Number(s.weeklyExpenses) || 0) * 0.4, 10000, 600000) / 1000) * 1000; return { patch: { legacy: lg, balance: s.balance - cost, popularity: clamp((s.popularity || 0) + 3, 0, 100) }, result: `${e.name} acepta la invitación y la afición lo agradece (${fmt(cost)} € de gastos).` }; } },
                { label: 'No hacer nada', tags: '', run: (s) => { const lg = L(s); lg.tributes = lg.tributes.slice(1); return { patch: { legacy: lg }, result: 'Prefieres no sumarte al homenaje.' }; } }
            ]
        });
    }

    // ── Bucle ───────────────────────────────────────────────
    let running = false, lastKey = '';
    async function tick() {
        if (running) return;
        const s = gs(); if (!s || !s.team) return;
        const k = [s.currentSeason, s.week, s.seasonType, (s.squad || []).length, (s.legacyPending || []).length, (L(s).ceremonies || []).length, (L(s).retired || []).length].join('|');
        if (k === lastKey && !(L(s).ceremonies || []).length) return;
        running = true;
        try {
            const sq = ensureShirts(s); if (sq) gl().updateGameState({ squad: sq });
            let cur = gs();
            if (processPending(cur)) cur = gs();
            trackVeterans(cur); ambassadorTick(gs()); syncLegendCoach(gs());
            lastKey = k;
            // La ceremonia espera a que las portadas se hayan visto
            cur = gs();
            if ((L(cur).ceremonies || []).length && !busy() && !(cur.pendingPress || []).length) await runCeremony(cur);
        } catch (e) { console.warn('Leyendas:', e.message); }
        finally { running = false; }
    }
    Object.assign(api, { renderMuseum, demandFor, negotiationUI, analyze, isClubLegend, isLeagueLegend, ensureShirts, changeShirt, openShirtDialog, html, tick: () => { lastKey = ''; return tick(); }, processPending, runCeremony, ROLES });
    window.pcfLegacy = api;
    installEvents();
    pcfEvery(() => { tick(); }, 2000);
})();
