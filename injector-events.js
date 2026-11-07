// ============================================================
// injector-events.js — Eventos del vestuario y del club
// De vez en cuando (máx. uno cada 3 semanas, en temporada regular) surge una situación con 2-3 decisiones. Cada una
// tiene consecuencias reales: ánimo de jugadores (moodMod, que se desvanece), dinero, popularidad, confianza de la
// directiva, lesiones, condición física. Hay alguna promesa que se comprueba semanas después.
// Estado: gameState.events = { lastAny, last:{id:semanaAbs}, log:[], promises:[] }
// ============================================================
(function () {
    'use strict';
    const gl = () => window.gameLogic;
    const gs = () => gl()?.getGameState?.();
    const fmt = n => Math.round(n || 0).toLocaleString('es-ES');
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const api = { rnd: Math.random };
    const key = p => p.id ?? p.name;
    const tidy = t => String(t).replace(/\.\.(?!\.)/g, '.');   // nombres que acaban en punto («Ramírez A.») + punto final
    const BLOCKERS = '#pcfGala,#matchSummaryModal,#cupResModal,#cupAnnModal,#fd-modal,.pcf-dlg-back,#offersModal.active,#pcfIntro,#pcfPress,#gameSelectionModal.active';
    const busy = () => [...document.querySelectorAll(BLOCKERS)].some(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden'; });
    function absWeek(s) { const y = parseInt(String(s.currentSeason).split('/')[0], 10) || 2026; return (y - 2000) * 50 + (s.seasonType === 'preseason' ? 0 : (s.week || 0)); }

    // ── Utilidades de efectos ───────────────────────────────
    const mood = (p, d) => ({ ...p, moodMod: clamp((Number(p.moodMod) || 0) + d, -40, 40), satisfaction: p.satisfaction === undefined ? p.satisfaction : clamp(p.satisfaction + d, 0, 100) });
    const mapSquad = (s, pred, fn) => (s.squad || []).map(p => pred(p) ? fn(p) : p);
    const byKey = k => p => key(p) === k;
    const allOwned = p => p.contractType !== 'loaned_out';
    const moodAll = (s, d) => mapSquad(s, allOwned, p => mood(p, d));
    const money = (s, k, lo, hi) => Math.round(clamp((Number(s.weeklyExpenses) || 0) * k, lo, hi) / 1000) * 1000 || 1000;
    function stats(s) {
        const mine = (s.matchHistory || []).filter(m => !m.playoff && !m.administrative && (m.home === s.team || m.away === s.team)).slice(-8);
        const res = mine.map(m => { const [h, a] = String(m.score || '0-0').split('-').map(Number); const my = m.home === s.team ? h : a, op = m.home === s.team ? a : h; return my > op ? 'W' : my === op ? 'D' : 'L'; });
        let loss = 0, win = 0;
        for (let i = res.length - 1; i >= 0 && res[i] === 'L'; i--) loss++;
        for (let i = res.length - 1; i >= 0 && res[i] === 'W'; i--) win++;
        return { loss, win, winless: res.length >= 6 && !res.slice(-6).includes('W') };
    }
    const lineup = s => (s.lineup || []).map(l => (s.squad || []).find(p => key(p) === key(l)) || l);
    const avgOvr = arr => arr.length ? arr.reduce((n, p) => n + (p.overall || 0), 0) / arr.length : 0;
    const pick = arr => arr[Math.floor(api.rnd() * arr.length)];
    const val = p => (window.pcfEconomy?.marketValue ? window.pcfEconomy.marketValue(p) : (p.value || 1e6));

    // ── Catálogo de eventos ─────────────────────────────────
    // eligible(s) → parámetros del evento o null · text(params) · choices[]{label, tags, run(s, params) → {patch, result}}
    const EVENTS = [
        { id: 'raise_demand', w: 3, cd: 20, icon: '💶', title: 'Un titular pide una mejora de contrato',
          eligible(s) { const xi = lineup(s).filter(p => p.contractType === 'owned' && (p.satisfaction ?? 70) < 60 && p.salary > 0); const lim = avgOvr(lineup(s)) - 1; const c = xi.filter(p => p.overall >= lim); return c.length ? (() => { const p = pick(c); return { k: key(p), name: p.name, salary: p.salary, nw: Math.round(p.salary * 1.25) }; })() : null; },
          text: e => `${e.name} se ha presentado en tu despacho: considera que su sueldo (${fmt(e.salary)} €/sem) no refleja su rendimiento y pide una mejora, o empezará a escuchar ofertas.`,
          choices: [
              { label: 'Subirle el sueldo un 25 %', tags: '💶 🎭', run: (s, e) => ({ patch: { squad: mapSquad(s, byKey(e.k), p => mood({ ...p, salary: e.nw }, 25)) }, result: `${e.name} firma encantado su nueva ficha de ${fmt(e.nw)} €/sem. El vestuario ve que se premia el rendimiento.` }) },
              { label: 'Pedirle paciencia', tags: '🎭', run: (s, e) => { const ok = api.rnd() < 0.55; return { patch: { squad: mapSquad(s, byKey(e.k), p => mood(p, ok ? 12 : -8)) }, result: ok ? `${e.name} lo entiende: «Confío en el proyecto, míster».` : `${e.name} sale molesto del despacho. «Llevo tiempo esperando una respuesta».` }; } },
              { label: 'No ceder', tags: '🎭', run: (s, e) => ({ patch: { squad: mapSquad(s, byKey(e.k), p => mood(p, -15)) }, result: `${e.name} se va sin decir palabra. Su ánimo se resiente.` }) }
          ] },
        { id: 'bench_minutes', w: 3, cd: 18, icon: '😤', title: 'Un suplente reclama minutos',
          eligible(s) { const xi = new Set(lineup(s).map(key)); const lim = avgOvr(lineup(s)) - 6; const c = (s.squad || []).filter(p => p.contractType === 'owned' && !xi.has(key(p)) && !p.isInjured && p.overall >= lim && p.overall > 50); return c.length ? (() => { const p = pick(c); return { k: key(p), name: p.name }; })() : null; },
          text: e => `${e.name} no entiende por qué apenas juega: «Estoy para jugar y no me da oportunidades». Quiere una respuesta clara.`,
          choices: [
              { label: 'Prometerle minutos', tags: '🎭 🤝', run: (s, e) => ({ patch: { squad: mapSquad(s, byKey(e.k), p => mood(p, 15)), events: addPromise(s, { k: e.k, name: e.name }) }, result: `${e.name} se va contento. Has dado tu palabra: si en 4 semanas no ha entrado en el once, lo recordará.` }) },
              { label: 'Que se lo gane en los entrenamientos', tags: '🎭', run: (s, e) => { const ok = api.rnd() < 0.3; return { patch: { squad: mapSquad(s, byKey(e.k), p => mood(p, ok ? 8 : -8)) }, result: ok ? `${e.name} acepta el reto y se vuelca en los entrenamientos.` : `${e.name} lo vive como un desprecio.` }; } },
              { label: 'Ofrecerlo al mercado', tags: '💶', run: (s, e) => ({ patch: { squad: mapSquad(s, byKey(e.k), p => listPlayer(p, 1.1)) }, result: `${e.name} queda en el mercado de traspasos. Su representante empezará a mover el asunto.` }) }
          ] },
        { id: 'locker_clash', w: 2, cd: 25, icon: '🥊', title: 'Pelea en el vestuario',
          eligible(s) { const xi = lineup(s).filter(p => p.contractType === 'owned'); if (xi.length < 4) return null; const a = pick(xi); const b = pick(xi.filter(p => key(p) !== key(a))); return { ka: key(a), na: a.name, kb: key(b), nb: b.name, fine: Math.round((a.salary + b.salary) * 0.5) }; },
          text: e => `${e.na} y ${e.nb} han discutido con dureza tras el entrenamiento. Los demás jugadores esperan que el míster actúe.`,
          choices: [
              { label: 'Mediar entre los dos', tags: '🎭', run: (s, e) => { const ok = api.rnd() < 0.6; const d = ok ? 6 : -6; return { patch: { squad: mapSquad(s, p => [e.ka, e.kb].includes(key(p)), p => mood(p, d)) }, result: ok ? 'Tu mediación funciona: se dan la mano y el ambiente mejora.' : 'La mediación no funciona: siguen sin hablarse.' }; } },
              { label: 'Multar a ambos', tags: '💶 🎭', run: (s, e) => ({ patch: { balance: s.balance + e.fine, squad: mapSquad(s, p => [e.ka, e.kb].includes(key(p)), p => mood(p, -10)) }, result: `Multa de ${fmt(e.fine)} € para el club, pero los dos se sienten castigados.` }) },
              { label: 'Mirar hacia otro lado', tags: '🎭', run: (s, e) => ({ patch: { squad: mapSquad(s, allOwned, p => mood(p, [e.ka, e.kb].includes(key(p)) ? -12 : -2)) }, result: 'El conflicto se enquista y todo el vestuario lo nota.' }) }
          ] },
        { id: 'star_rumor', w: 2, cd: 30, icon: '📰', title: 'Un grande se interesa por tu estrella',
          eligible(s) { const c = (s.squad || []).filter(p => p.contractType === 'owned' && p.overall >= 76 && !p.transferListed); if (!c.length) return null; const p = c.sort((x, y) => y.overall - x.overall)[0]; return { k: key(p), name: p.name }; },
          text: e => `La prensa asegura que un gran club sigue de cerca a ${e.name}. El jugador no ha desmentido nada y los periodistas esperan tu respuesta.`,
          choices: [
              { label: 'Declararlo intransferible', tags: '🎭 📣', run: (s, e) => ({ patch: { squad: mapSquad(s, byKey(e.k), p => mood(p, 10)), popularity: clamp((s.popularity || 0) + 1, 0, 100) }, result: `${e.name} agradece el gesto y la afición aplaude la firmeza del club.` }) },
              { label: 'Escuchar ofertas', tags: '💶', run: (s, e) => ({ patch: { squad: mapSquad(s, byKey(e.k), p => listPlayer(p, 1.25)) }, result: `${e.name} queda en el mercado: llegarán ofertas en las próximas semanas.` }) },
              { label: 'Sin comentarios', tags: '🎭', run: (s, e) => { const bad = api.rnd() < 0.4; return { patch: { squad: mapSquad(s, byKey(e.k), p => mood(p, bad ? -10 : 0)) }, result: bad ? `El silencio inquieta a ${e.name}, que empieza a sentirse ya fuera del proyecto.` : 'El runrún se apaga solo.' }; } }
          ] },
        { id: 'press_bad', w: 3, cd: 14, icon: '🎙️', title: 'Rueda de prensa tras la mala racha',
          eligible(s) { const m = stats(s); return (m.loss >= 2 || m.winless) ? { loss: m.loss } : null; },
          text: e => `Los resultados no llegan${e.loss >= 2 ? ` (${e.loss} derrotas seguidas)` : ''} y la sala de prensa está llena. Todos esperan tu primera frase.`,
          choices: [
              { label: 'Asumir la responsabilidad', tags: '🏛️ 🎭', run: (s) => ({ patch: { boardConfidence: clamp((s.boardConfidence ?? 65) + 2, 0, 100), squad: moodAll(s, 4) }, result: 'Das la cara por el equipo. La directiva lo valora y el vestuario se siente protegido.' }) },
              { label: 'Quejarte del arbitraje', tags: '📣 🎭 🏛️', run: (s) => ({ patch: { popularity: clamp((s.popularity || 0) - 2, 0, 100), boardConfidence: clamp((s.boardConfidence ?? 65) - 2, 0, 100), squad: moodAll(s, 6) }, result: 'Los jugadores se sienten respaldados, pero la prensa te acusa de buscar excusas y la directiva frunce el ceño.' }) },
              { label: 'Elogiar al rival y mirar al futuro', tags: '📣 🏛️', run: (s) => ({ patch: { popularity: clamp((s.popularity || 0) + 1, 0, 100), boardConfidence: clamp((s.boardConfidence ?? 65) + 1, 0, 100) }, result: 'Una comparecencia elegante: nadie puede reprocharte nada.' }) }
          ] },
        { id: 'press_good', w: 2, cd: 14, icon: '🎙️', title: 'Rueda de prensa tras la racha ganadora',
          eligible(s) { const m = stats(s); return m.win >= 4 ? { win: m.win } : null; },
          text: e => `${e.win} victorias seguidas: el equipo vuela y todos quieren saber el secreto. ¿Qué mensaje lanzas?`,
          choices: [
              { label: 'Elogiar al grupo', tags: '🎭', run: (s) => ({ patch: { squad: moodAll(s, 6) }, result: 'El vestuario se siente valorado. «Aquí ganamos todos juntos».' }) },
              { label: 'Pedir calma', tags: '🏛️', run: (s) => ({ patch: { boardConfidence: clamp((s.boardConfidence ?? 65) + 2, 0, 100) }, result: 'La directiva aprecia tu prudencia: la temporada es larga.' }) },
              { label: 'Presumir de equipo', tags: '📣 🏛️', run: (s) => ({ patch: { popularity: clamp((s.popularity || 0) + 3, 0, 100), boardConfidence: clamp((s.boardConfidence ?? 65) - 1, 0, 100) }, result: 'Titulares espectaculares y afición entregada, aunque algunos te acusan de arrogante.' }) }
          ] },
        { id: 'fan_tribute', w: 2, cd: 28, icon: '📣', title: 'La peña organiza un homenaje',
          eligible(s) { return (s.popularity || 0) >= 55 ? { gift: money(s, 1.2, 20000, 3e6) } : null; },
          text: () => 'Una peña de aficionados quiere organizar un acto de homenaje al equipo antes de un entrenamiento abierto.',
          choices: [
              { label: 'Aceptar el acto', tags: '📣 🎭', run: (s) => ({ patch: { popularity: clamp((s.popularity || 0) + 2, 0, 100), squad: moodAll(s, 4) }, result: 'Una tarde emotiva: la plantilla se siente querida.' }) },
              { label: 'Pedir una colecta para el club', tags: '💶 📣', run: (s, e) => ({ patch: { balance: s.balance + e.gift, popularity: clamp((s.popularity || 0) - 1, 0, 100), seasonMovements: [...(s.seasonMovements || []), { week: s.week, type: 'income', description: 'Ayuda: colecta de la peña de aficionados', amount: e.gift }] }, result: `La peña recauda ${fmt(e.gift)} € para el club, aunque a algunos les parece oportunista.` }) },
              { label: 'Declinar con educación', tags: '', run: () => ({ patch: {}, result: 'La peña lo entiende. No pasa nada.' }) }
          ] },
        { id: 'charity_match', w: 2, cd: 30, icon: '🤝', title: 'Partido benéfico',
          eligible(s) { return (s.week || 0) >= 8 ? { cash: money(s, 2, 30000, 4e6) } : null; },
          text: () => 'Una asociación de la ciudad te propone un partido benéfico contra un equipo de leyendas. Habrá taquilla y repercusión, pero los jugadores llegarán más cansados.',
          choices: [
              { label: 'Aceptar', tags: '💶 📣', run: (s, e) => ({ patch: { balance: s.balance + e.cash, popularity: clamp((s.popularity || 0) + 2, 0, 100), squad: mapSquad(s, allOwned, p => ({ ...p, condition: clamp((p.condition ?? 100) - 10, 1, 100) })), seasonMovements: [...(s.seasonMovements || []), { week: s.week, type: 'income', description: 'Ayuda: taquilla del partido benéfico', amount: e.cash }] }, result: `Gran ambiente y ${fmt(e.cash)} € de recaudación. La plantilla acaba un poco fundida.` }) },
              { label: 'Declinar', tags: '', run: () => ({ patch: {}, result: 'Declinas la invitación para no sobrecargar al equipo.' }) }
          ] },
        { id: 'exp_treatment', w: 2, cd: 18, icon: '🩺', title: 'Tratamiento experimental',
          eligible(s) { const c = (s.squad || []).filter(p => p.isInjured && (p.weeksOut || 0) >= 4 && p.overall >= avgOvr(s.squad || []) - 1); if (!c.length) return null; const p = pick(c); return { k: key(p), name: p.name, weeks: p.weeksOut, fee: money(s, 0.5, 40000, 1.5e6) }; },
          text: e => `${e.name} estará ${e.weeks} semanas de baja. El médico del club conoce un tratamiento experimental que podría acortar la recuperación… o complicarla.`,
          choices: [
              { label: 'Probar el tratamiento (cuesta dinero)', tags: '💶 🩺', run: (s, e) => { const r = api.rnd(); const d = r < 0.5 ? -3 : r < 0.75 ? 2 : 0; return { patch: { balance: s.balance - e.fee, squad: mapSquad(s, byKey(e.k), p => { const w = Math.max(1, (p.weeksOut || 0) + d); return { ...p, weeksOut: w, isInjured: true }; }) }, result: (d < 0 ? `¡Funciona! ${e.name} recuperará antes de lo previsto (−3 semanas).` : d > 0 ? `Sale mal: la lesión se complica (+2 semanas).` : 'El tratamiento no cambia nada.') + ` Coste: ${fmt(e.fee)} €.` }; } },
              { label: 'Tratamiento convencional', tags: '', run: (s, e) => ({ patch: {}, result: `${e.name} seguirá el plan habitual de recuperación.` }) }
          ] },
        { id: 'tired_squad', w: 3, cd: 14, icon: '😮‍💨', title: 'El equipo llega exhausto',
          eligible(s) { const xi = lineup(s); return xi.length && xi.reduce((n, p) => n + (p.condition ?? 100), 0) / xi.length < 65 ? { avg: Math.round(xi.reduce((n, p) => n + (p.condition ?? 100), 0) / xi.length) } : null; },
          text: e => `El preparador físico avisa: la condición media del once es del ${e.avg} %. Hay que decidir cómo gestionar la semana.`,
          choices: [
              { label: 'Dar un día libre', tags: '🎭 💪', run: (s) => ({ patch: { squad: mapSquad(s, allOwned, p => mood({ ...p, condition: clamp((p.condition ?? 100) + 12, 1, 100) }, 3)) }, result: 'El grupo recupera piernas y agradece el detalle (+12 de condición).' }) },
              { label: 'Entrenamiento suave', tags: '💪', run: (s) => ({ patch: { squad: mapSquad(s, allOwned, p => ({ ...p, condition: clamp((p.condition ?? 100) + 6, 1, 100) })) }, result: 'Una semana de carga ligera: se recupera algo (+6 de condición).' }) },
              { label: 'Mantener el ritmo', tags: '🎭', run: (s) => ({ patch: { squad: moodAll(s, -3) }, result: 'Sigues con la misma carga. Algunos jugadores murmuran.' }) }
          ] },
        { id: 'veteran_mentor', w: 2, cd: 35, icon: '🧓', title: 'El veterano quiere ser mentor',
          eligible(s) { const vet = (s.squad || []).filter(p => p.age >= 32 && p.contractType === 'owned'); const yo = (s.squad || []).filter(p => p.age <= 21); if (!vet.length || yo.length < 2) return null; const v = pick(vet); return { k: key(v), name: v.name, n: yo.length }; },
          text: e => `${e.name}, uno de los veteranos, se ofrece a ocuparse de los jóvenes de la plantilla (${e.n}): «Me gustaría devolver al club lo que me ha dado».`,
          choices: [
              { label: 'Aceptar', tags: '🎭', run: (s, e) => ({ patch: { squad: mapSquad(s, p => p.age <= 21 || key(p) === e.k, p => mood(p, key(p) === e.k ? 10 : 8)) }, result: `${e.name} se convierte en el referente de los jóvenes. Se nota en el ambiente.` }) },
              { label: 'Agradecérselo pero declinar', tags: '', run: () => ({ patch: {}, result: 'Prefieres que cada uno se centre en lo suyo.' }) }
          ] },
        { id: 'sponsor_dinner', w: 2, cd: 30, icon: '🍽️', title: 'Cena con un patrocinador',
          eligible(s) { return (s.popularity || 0) < 85 ? { cash: money(s, 1.5, 20000, 3e6) } : null; },
          text: () => 'Un empresario local quiere invitarte a cenar para hablar de colaborar con el club.',
          choices: [
              { label: 'Asistir', tags: '💶 📣', run: (s, e) => ({ patch: { balance: s.balance + e.cash, popularity: clamp((s.popularity || 0) + 1, 0, 100), seasonMovements: [...(s.seasonMovements || []), { week: s.week, type: 'income', description: 'Ayuda: aportación de un patrocinador local', amount: e.cash }] }, result: `La cena sale redonda: el empresario aporta ${fmt(e.cash)} € al club.` }) },
              { label: 'Delegar en la directiva', tags: '', run: () => ({ patch: {}, result: 'La directiva se encarga del asunto. No pasa nada.' }) }
          ] }
    ];

    // ── Promesas y mercado ──────────────────────────────────
    function addPromise(s, p) { const ev = s.events || { last: {}, log: [], promises: [] }; return { ...ev, promises: [...(ev.promises || []), { ...p, until: absWeek(s) + 4, played: false }] }; }
    function listPlayer(p, mult) {
        const clause = Number(p.releaseClause) || 0;
        let price = Math.round(val(p) * mult);
        if (clause > 0) price = Math.min(price, clause);
        return { ...p, transferListed: true, loanListed: false, askingPrice: price, weeksOnMarket: 0 };
    }
    function checkPromises(s) {
        const ev = s.events; if (!ev || !(ev.promises || []).length) return;
        const now = absWeek(s), xi = new Set((s.lineup || []).map(key));
        let changed = false, squad = null; const news = [];
        const rest = [];
        for (const pr of ev.promises) {
            const played = pr.played || xi.has(pr.k);
            if (now > pr.until) {
                squad = (squad || s.squad).map(p => key(p) === pr.k ? mood(p, played ? 5 : -18) : p);
                news.push(played ? `🤝 ${pr.name} ha tenido los minutos prometidos y está más tranquilo.` : `😠 ${pr.name} no ha jugado pese a tu promesa y se siente engañado.`);
                changed = true;
            } else { if (played !== pr.played) changed = true; rest.push({ ...pr, played }); }
        }
        if (!changed) return;
        const upd = { events: { ...ev, promises: rest } };
        if (squad) upd.squad = squad;
        gl().updateGameState(upd);
        news.forEach(n => gl().addNews?.(n, n.startsWith('😠') ? 'warning' : 'info'));
    }

    // ── Presentación ────────────────────────────────────────
    function show(ev, params) {
        return new Promise(resolve => {
            document.getElementById('pcfEventModal')?.remove();
            window.pcfEnsureDialogStyles?.();
            const back = document.createElement('div');
            back.id = 'pcfEventModal'; back.className = 'pcf-dlg-back';
            back.innerHTML = `<div class="pcf-dlg" role="dialog" aria-modal="true"><h3>${ev.icon} ${esc(ev.title)}</h3><div class="pcf-dlg-body" style="white-space:normal"></div></div>`;
            const body = back.querySelector('.pcf-dlg-body');
            body.innerHTML = `<p style="margin:0 0 12px">${esc(tidy(ev.text(params)))}</p>` + ev.choices.map((c, i) =>
                `<button type="button" class="btn" data-i="${i}" style="display:block;width:100%;text-align:left;margin:0 0 8px;padding:10px 12px"><strong>${esc(c.label)}</strong>${c.tags ? `<span style="float:right;opacity:.8">${c.tags}</span>` : ''}</button>`).join('');
            const finish = idx => { back.remove(); document.removeEventListener('keydown', onKey, true); resolve(idx); };
            const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); choose(ev.choices.length - 1); } };
            let chosen = false;
            const choose = i => {
                if (chosen) return; chosen = true;
                const s = gs(); let out;
                try { out = ev.choices[i].run(s, params); } catch (err) { console.warn('Evento:', err.message); out = { patch: {}, result: 'No pasa nada.' }; }
                const a = s.events || { last: {}, log: [], promises: [] };
                const evState = (out.patch && out.patch.events) ? out.patch.events : a;
                const upd = { ...out.patch, events: { ...evState, lastAny: absWeek(s), last: { ...(evState.last || {}), [ev.id]: absWeek(s) }, log: [...(evState.log || []), { season: s.currentSeason, week: s.week, id: ev.id, choice: i }].slice(-40) } };
                gl().updateGameState(upd);
                gl().addNews?.(`🎭 ${ev.title}: ${out.result}`, 'info');
                window.ui?.refreshUI?.(gl().getViewState());
                body.innerHTML = `<p style="margin:0 0 12px;font-style:italic">${esc(ev.choices[i].label)}</p><p style="margin:0 0 14px">${esc(tidy(out.result))}</p><button type="button" class="btn" data-ok="1" style="width:100%;min-height:44px">Continuar</button>`;
                body.querySelector('[data-ok]').onclick = () => finish(i);
                document.removeEventListener('keydown', onKey, true);
                document.addEventListener('keydown', ev2 => { if (ev2.key === 'Escape') finish(i); }, { once: true, capture: true });
            };
            body.querySelectorAll('[data-i]').forEach(b => { b.onclick = () => choose(Number(b.dataset.i)); });
            document.addEventListener('keydown', onKey, true);
            document.body.appendChild(back);
        });
    }

    // ── Selección y bucle ───────────────────────────────────
    function eligibleEvents(s) {
        const ev = s.events || { last: {} }, now = absWeek(s), out = [];
        for (const e of EVENTS) {
            const last = ev.last?.[e.id]; if (last !== undefined && now - last < e.cd) continue;
            let params = null; try { params = e.eligible(s); } catch (err) { params = null; }
            if (params) out.push({ e, params });
        }
        return out;
    }
    let running = false, lastKey = '', runStart = 0;
    async function tick() {
        // Si el modal desapareció sin resolverse (p. ej. lo eliminó otro módulo), se recupera solo en vez de quedarse bloqueado
        if (running && !document.getElementById('pcfEventModal') && Date.now() - runStart > 3000) running = false;
        if (running) return;
        const s = gs(); if (!s || !s.team || s.seasonType !== 'regular') return;
        const key2 = `${s.currentSeason}|${s.week}`;
        if (key2 === lastKey) return;
        if (busy()) return;                      // se reintenta en el siguiente ciclo: la clave aún no se marca
        lastKey = key2;
        running = true; runStart = Date.now();
        try {
            checkPromises(s);
            const s2 = gs();
            if ((s2.week || 0) < 3 || s2.difficultyChosen === undefined) return;
            const ev = s2.events || {};
            // Eventos prioritarios (p. ej. la declaración antes de un derbi): no esperan al mínimo de 3 semanas ni al azar
            const prio = eligibleEvents(s2).filter(x => x.e.priority);
            if (prio.length) { await show(prio[0].e, prio[0].params); return; }
            if (ev.lastAny !== undefined && absWeek(s2) - ev.lastAny < 3) return;           // como mucho uno cada 3 semanas
            if (api.rnd() > 0.55) return;
            const el = eligibleEvents(s2).filter(x => !x.e.priority); if (!el.length) return;
            let r = api.rnd() * el.reduce((n, x) => n + x.e.w, 0), sel = el[0];
            for (const x of el) { r -= x.e.w; if (r <= 0) { sel = x; break; } }
            await show(sel.e, sel.params);
        } catch (err) { console.warn('Eventos:', err.message); }
        finally { running = false; }
    }
    Object.assign(api, {
        EVENTS, eligible: s => eligibleEvents(s || gs()).map(x => x.e.id),
        force: async (id) => { const s = gs(); const e = EVENTS.find(x => x.id === id); const p = e.eligible(s); if (!p) return false; await show(e, p); return true; },
        tick: () => { lastKey = ''; return tick(); }, checkPromises: () => checkPromises(gs())
    });
    window.pcfEvents = api;
    setInterval(() => { tick(); }, 2500);
})();
