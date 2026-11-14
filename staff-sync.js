// staff-sync.js — Reunión semanal del cuerpo técnico: los empleados se pasan la información entre sí.
//   Segundo entrenador → detecta huecos de plantilla (poca profundidad, lesionados, bajo nivel)
//   Entrenador de juveniles → mira si la cantera ya tiene a alguien para ese puesto
//   Ojeador → si no, busca en el mercado (y, con buen nivel, vía cláusula)
//   Secretario técnico → dice si se puede pagar y avisa de contratos que terminan
//   Médico / fisio / preparador → fatiga y bajas largas, que a su vez agravan el hueco
// Cada eslabón solo habla si ese empleado está contratado. Todo es determinista (sin azar): mismo estado → misma reunión.
const DISP = { segundoEntrenador: 'Segundo Entrenador', entrenadorJuveniles: 'Entrenador de Juveniles', scout: 'Ojeador', secretario: 'Secretario Técnico',
    medico: 'Médico', fisio: 'Fisioterapeuta', entrenador: 'Entrenador Físico', entrenadorPorteros: 'Entrenador de Porteros', analista: 'Analista de Vídeo' };
export const roleLabel = r => DISP[r] || r;
const fmt = n => Math.round(n || 0).toLocaleString('es-ES');
const POS_NAME = { POR: 'portero', DFC: 'central', LI: 'lateral izquierdo', LD: 'lateral derecho', MC: 'mediocentro', MCO: 'mediapunta', MI: 'interior izquierdo', MD: 'interior derecho', EXT: 'extremo', DC: 'delantero centro' };
const has = (s, r) => !!(s.staff && s.staff[r]);
const lvl = (s, r) => (s.staff && s.staff[r] && s.staff[r].level) || 0;
const ok = p => p && !p.isInjured && !p.isSuspended && p.contractType !== 'loaned_out' && !p.rebel;
const avail = (p, s) => ok(p);               // «apto»: ni lesionado, ni sancionado, ni convocado (los convocados van marcados como sancionados)
const MAX_SQUAD = 25;

// Plantilla mínima por puesto: los titulares de la formación + 1 de relevo (2 porteros)
export function requirements(layout) {
    const need = {};
    for (const slot of layout) need[slot.pos] = (need[slot.pos] || 0) + 1;
    const out = {};
    for (const [pos, n] of Object.entries(need)) out[pos] = { starters: n, min: pos === 'POR' ? 2 : n + 1 };
    return out;
}

function academyCover(s, pos, compat, floor) {
    const cand = (s.academy || []).filter(y => y && !y.isInjured && (y.age || 18) >= 16)
        .filter(y => y.position === pos || (compat[pos] || []).includes(y.position) && pos !== 'POR' && y.position !== 'POR')
        .map(y => ({ y, score: (y.overall || 0) + (y.position === pos ? 4 : 0) + Math.max(0, (y.potential || 0) - (y.overall || 0)) * (has(s, 'entrenadorJuveniles') ? 0.25 : 0) }))
        .filter(x => x.y.overall >= floor - (has(s, 'entrenadorJuveniles') ? 12 : 4))
        .sort((a, b) => b.score - a.score || String(a.y.name).localeCompare(String(b.y.name)));
    return cand.length ? cand[0].y : null;
}

// ctx = { layout, compat, market: [jugadores del mercado], clauseTargets(pos, minOverall, maxClause) => [...], nextWindowIn }
export function buildBriefing(s, ctx) {
    const layout = ctx.layout || [], compat = ctx.compat || {}, req = requirements(layout);
    const squad = (s.squad || []).filter(p => p && p.contractType !== 'loaned_out');
    const lineupNames = new Set((s.lineup || []).filter(Boolean).map(p => p.name));
    const needs = [], medical = [], contracts = [];
    const balance = Number(s.balance) || 0;
    const sorted = [...squad].sort((a, b) => (b.overall || 0) - (a.overall || 0));
    const teamLevel = sorted.slice(0, 14).reduce((a, p) => a + (p.overall || 0), 0) / Math.max(1, Math.min(14, sorted.length));

    // ── 1) Segundo entrenador: huecos de plantilla ──────────
    if (has(s, 'segundoEntrenador')) {
        for (const [pos, r] of Object.entries(req)) {
            const all = squad.filter(p => p.position === pos), aptos = all.filter(p => avail(p, s));
            const injuredLong = all.filter(p => p.isInjured && (p.weeksOut || 0) >= 3);
            let level = null, cause = null;
            if (aptos.length < r.starters) { level = 'crit'; cause = injuredLong.length ? 'injury' : 'depth'; }
            else if (aptos.length < r.min) { level = 'warn'; cause = injuredLong.length ? 'injury' : 'depth'; }
            if (!level) continue;
            const floor = Math.max(60, Math.round((aptos.length ? Math.min(...aptos.map(p => p.overall || 0)) : teamLevel - 6)));
            const n = aptos.length, who = POS_NAME[pos] || pos;
            const chain = [{ role: 'segundoEntrenador', text: n === 0 ? `No tenemos ningún ${who} apto.` : n === 1 ? `Solo tenemos un ${pos} apto (${aptos[0].name}).` : `Tenemos pocos ${pos} aptos (${n}) y hacen falta ${r.min}.` }];
            // médico: ¿hay bajas largas en ese puesto?
            if (injuredLong.length && has(s, 'medico')) {
                const w = Math.max(...injuredLong.map(p => p.weeksOut || 0));
                chain.push({ role: 'medico', text: `${injuredLong.map(p => p.name).join(' y ')} ${injuredLong.length > 1 ? 'estarán' : 'estará'} de baja unas ${w} semanas: el hueco no se cubre solo.` });
            }
            const need = { id: `${pos}|${level}`, pos, level, cause, have: n, min: r.min, chain, cover: { kind: 'none' }, actions: [] };
            // ── 2) Entrenador de juveniles: ¿hay alguien en la cantera? ──
            const y = academyCover(s, pos, compat, floor);
            if (y) {
                const room = (s.squad || []).length < MAX_SQUAD;
                if (has(s, 'entrenadorJuveniles')) chain.push({ role: 'entrenadorJuveniles', text: `En la cantera tenemos a ${y.name} (${y.position}, ${y.overall}/${y.potential || '?'}, ${y.age || '?'} años). Puede cubrir ese hueco.` });
                else chain.push({ role: 'segundoEntrenador', text: `En la cantera hay un ${y.position} aprovechable: ${y.name} (${y.overall}). Sin entrenador de juveniles no puedo valorar mejor su potencial.` });
                if (has(s, 'secretario')) chain.push({ role: 'secretario', text: room ? 'Hay ficha libre en la plantilla: subirlo no cuesta fichar a nadie y ahorra dinero.' : 'La plantilla está completa (25): habría que dar salida a alguien antes de subirlo.' });
                need.cover = { kind: 'academy', name: y.name, position: y.position, overall: y.overall, potential: y.potential, room };
                if (room) need.actions.push({ type: 'promote', name: y.name, label: `Subir a ${y.name}` });
            } else {
                // ── 3) Ojeador: busca en el mercado y, si es bueno, por cláusula ──
                const sl = lvl(s, 'scout');
                const minOvr = Math.max(floor, Math.round(teamLevel - 8));
                const pool = (ctx.marketFor ? ctx.marketFor(pos, minOvr) : (ctx.market || [])).filter(p => p.position === pos && (p.overall || 0) >= minOvr && !(s.squad || []).some(q => q.name === p.name))
                    .map(p => ({ p, price: p.isFreeAgent ? 0 : (p.askingPrice || p.value || 0) }))
                    .filter(x => x.price <= balance * 0.6 || x.p.loanListed)
                    .sort((a, b) => (b.p.overall - a.p.overall) || (a.price - b.price) || String(a.p.name).localeCompare(String(b.p.name)));
                const take = sl >= 5 ? 3 : sl >= 3 ? 2 : 1;
                const targets = pool.slice(0, take);
                if (has(s, 'scout')) {
                    if (targets.length) {
                        chain.push({ role: 'scout', text: `Me pongo con ello. Para ${pos} he visto: ${targets.map(x => `${x.p.name} (${x.p.club || 'libre'}, media ${x.p.overall}, ${x.price ? fmt(x.price) + '€' : 'libre'})`).join(' · ')}.` });
                        need.cover = { kind: 'market', targets: targets.map(x => ({ name: x.p.name, club: x.p.club, overall: x.p.overall, price: x.price, player: x.p })) };
                        targets.forEach(x => need.actions.push({ type: 'negotiate', name: x.p.name, label: `Negociar con ${x.p.name}`, player: x.p }));
                    } else chain.push({ role: 'scout', text: `Entiendo el hueco, pero ahora mismo no veo en el mercado ningún ${pos} que mejore lo que tenemos y entre en presupuesto.` });
                    if (sl >= 4 && ctx.clauseTargets) {
                        const maxClause = balance * 0.7, cl = ctx.clauseTargets(pos, minOvr, maxClause).slice(0, sl >= 5 ? 2 : 1);
                        if (cl.length) {
                            chain.push({ role: 'scout', text: `Y por cláusula: ${cl.map(c => `${c.name} (${c.club}, media ${c.overall}, cláusula ${fmt(c.clause)}€)`).join(' · ')}.` });
                            if (need.cover.kind === 'none') need.cover = { kind: 'clause', targets: cl };
                            cl.forEach(c => need.actions.push({ type: 'clause', club: c.club, id: c.id, name: c.name, label: `Ofertar por cláusula a ${c.name}` }));
                        }
                    }
                } else chain.push({ role: 'segundoEntrenador', text: 'No tenemos ojeador: habrá que mirar el mercado nosotros. Un ojeador buscaría el recambio por ti.' });
                // ── 4) Secretario: ¿se puede pagar? ──
                const best = targets[0] || (need.cover.kind === 'clause' ? { price: need.cover.targets[0].clause, p: { name: need.cover.targets[0].name } } : null);
                if (has(s, 'secretario') && best) {
                    const price = best.price, p = best.p;
                    if (price <= balance * 0.6) chain.push({ role: 'secretario', text: `${p.name} es asumible: ${price ? fmt(price) + '€' : 'sin traspaso'} con ${fmt(balance)}€ en caja. Puedo cerrar la negociación con ventaja.` });
                    else if (p.loanListed) chain.push({ role: 'secretario', text: `${p.name} es caro, pero está en el mercado de cesiones: sale mucho más barato.` });
                    else chain.push({ role: 'secretario', text: `Ahora no llegamos a ${p.name}: faltan ${fmt(Math.max(0, price - balance))}€.` });
                    if ((s.squad || []).length >= MAX_SQUAD) chain.push({ role: 'secretario', text: 'Ojo: la plantilla está completa (25). Habría que dar salida a alguien antes.' });
                }
            }
            if (pos === 'POR' && has(s, 'entrenadorPorteros') && n < 2) chain.push({ role: 'entrenadorPorteros', text: 'Sin segundo portero no puedo trabajar con garantías. Es prioritario.' });
            needs.push(need);
        }
    }

    // ── 5) Médico, fisio y preparador: fatiga y riesgo ──────
    const tired = squad.filter(p => ok(p) && (p.condition ?? 100) < 65 && (lineupNames.has(p.name) || (p.overall || 0) >= teamLevel));
    if (tired.length) {
        const names = tired.slice(0, 4).map(p => `${p.name} (${Math.round(p.condition)}%)`).join(', ');
        if (has(s, 'medico')) medical.push({ role: 'medico', text: `Riesgo de lesión alto por fatiga: ${names}. Si siguen jugando sin descanso, aumentan las lesiones.` });
        if (has(s, 'entrenador')) medical.push({ role: 'entrenador', text: tired.length >= 4 ? 'Hay demasiada gente cargada: propongo una semana de entrenamiento suave.' : 'Bajo la carga de trabajo de los que están al límite.' });
        if (has(s, 'fisio')) medical.push({ role: 'fisio', text: `Doy prioridad a la recuperación de ${tired[0].name}.` });
        if (has(s, 'segundoEntrenador')) medical.push({ role: 'segundoEntrenador', text: `Teniendo en cuenta lo que dice el cuerpo médico, conviene rotar: ${tired.slice(0, 3).map(p => p.name).join(', ')}.` });
    }
    const longInj = squad.filter(p => p.isInjured && (p.weeksOut || 0) >= 4 && !needs.some(n => n.pos === p.position && n.cause === 'injury'));
    if (longInj.length && has(s, 'medico')) medical.push({ role: 'medico', text: `Bajas largas: ${longInj.slice(0, 3).map(p => `${p.name} (${p.weeksOut} sem)`).join(', ')}.` + (has(s, 'fisio') ? ' El fisio ya trabaja en su recuperación.' : '') });

    // ── 6) Secretario: contratos que se acaban en puestos importantes ──
    if (has(s, 'secretario')) {
        const ending = squad.filter(p => (p.contractYears ?? 9) <= 1 && p.contractType === 'owned' && (p.overall || 0) >= teamLevel - 2)
            .sort((a, b) => (b.overall || 0) - (a.overall || 0)).slice(0, 3);
        if (ending.length) contracts.push({ role: 'secretario', text: `Acaban contrato: ${ending.map(p => `${p.name} (${p.position}, ${p.overall})`).join(', ')}. Renovarlos ahora es más barato que reemplazarlos.` });
    }

    return { key: `${s.currentSeason}|${s.seasonType}|${s.week}`, week: s.week, needs, medical, contracts,
        targetNames: needs.flatMap(n => (n.cover.targets || []).map(t => t.name)), coverNames: needs.filter(n => n.cover.kind === 'academy').map(n => n.cover.name) };
}

// Qué se cuenta en las noticias: solo lo nuevo (cada aviso se repite como mucho cada 6 semanas) y un máximo por semana
export function newsFor(brief, prev, absWeek, max = 3) {
    const said = { ...(prev?.said || {}) }, lines = [];
    const emit = (id, items) => {
        if (lines.length >= max * 2) return;
        if (said[id] != null && absWeek - said[id] < 6) return;
        said[id] = absWeek; items.forEach(it => lines.push({ role: it.role, text: it.text }));
    };
    brief.needs.filter(n => n.level === 'crit').concat(brief.needs.filter(n => n.level !== 'crit')).slice(0, max)
        .forEach(n => emit(`need|${n.pos}|${n.level}|${n.cover.kind}|${n.cover.name || (n.cover.targets?.[0]?.name) || ''}`, n.chain));
    if (brief.medical.length) emit(`med|${brief.medical[0].text.slice(0, 48)}`, brief.medical.slice(0, 2));
    if (brief.contracts.length) emit(`con|${brief.contracts[0].text.slice(0, 48)}`, brief.contracts);
    for (const k of Object.keys(said)) if (absWeek - said[k] > 30) delete said[k];
    return { lines, said };
}

// Sinergias entre empleados (efectos reales, pequeños y deterministas)
export function synergies(s) {
    return {
        recovery: has(s, 'medico') && has(s, 'fisio'),                       // médico + fisio: protocolo de recuperación (una semana menos cada 3 en bajas largas)
        scoutDeal: has(s, 'scout') && has(s, 'secretario'),                  // ojeador + secretario: ventaja al negociar un objetivo recomendado
        youthPlan: has(s, 'entrenadorJuveniles') && has(s, 'segundoEntrenador') // juveniles + segundo: el canterano recomendado llega con confianza
    };
}
