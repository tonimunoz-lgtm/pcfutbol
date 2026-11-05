// ============================================================
// injector-gala.js — Gala de fin de temporada + Pichichi y Zamora
//  • window.showSeasonGala(summary): pase de diapositivas a pantalla completa
//    (tu temporada, campeones, Copa y Europa, ascensos/descensos, Pichichi, Zamora)
//  • window.pcfAwards(division, rows): Pichichi y Zamora de una liga
//  • Clasificación: bloques en vivo de Máximos goleadores y Zamora
// Los goles de TU plantilla se cuentan partido a partido; los de los demás equipos
// se reparten entre sus jugadores a partir de los goles reales del equipo (reparto
// estable: no cambia entre consultas).
// ============================================================
(function () {
    'use strict';
    const gl = () => window.gameLogic;
    const gs = () => gl()?.getViewState?.();
    const fmt = n => Math.round(n).toLocaleString('es-ES');
    const DIVS = [['primera', 'Primera División'], ['segunda', 'Segunda División'], ['rfef_grupo1', 'Primera RFEF · Grupo 1'], ['rfef_grupo2', 'Primera RFEF · Grupo 2'], ['promesas', 'Liga Promesas']];
    const DIV_NAME = Object.fromEntries(DIVS);

    // ── Utilidades ──────────────────────────────────────────────
    function hash01(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
    function pickWeighted(pool, seed) {
        const w = pool.map((_, i) => 1 / Math.pow(i + 1, 1.25)), tot = w.reduce((a, b) => a + b, 0);
        let r = hash01(seed) * tot;
        for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; }
        return pool[0];
    }
    const badge = team => {
        const ini = String(team || '?').replace(/^(CD|UD|CF|FC|RC|RCD|SD|AD|CE|Real|Club|Atlético|Athletic)\s+/i, '').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const hue = Math.round(hash01(team) * 360);
        return `<span class="pg-badge" style="background:hsl(${hue},55%,32%);border-color:hsl(${hue},70%,62%)">${ini}</span>`;
    };

    // ── Pichichi y Zamora ───────────────────────────────────────
    const POS_G = { DC: 1, EXT: 0.55, MCO: 0.45, MC: 0.2, LI: 0.1, LD: 0.1, DFC: 0.07, POR: 0 };
    async function squadOf(team, division) {
        const s = gs();
        if (team === s.team) return s.squad || [];
        try { return (await window.pcfTeamSquad(team, division)) || []; } catch (e) { return []; }
    }
    // rows: [{team, g, e, p, gf, gc}]
    async function awards(division, rows, season) {
        const s = gs(), seasonKey = season || s.currentSeason;
        const recorded=window.pcfWorld?.getAwards?.(division,seasonKey);if(recorded)return recorded;
        const scorers = [], keepers = [];
        for (const r of rows) {
            const squad = await squadOf(r.team, division);
            const pj = (r.g || 0) + (r.e || 0) + (r.p || 0);
            if (!squad.length || !pj) continue;
            const weights = squad.map(p => (POS_G[p.position] ?? 0.1) * Math.pow((p.overall || 60) / 70, 6) * (0.5 + 1.3 * hash01(p.name + seasonKey)));
            const tot = weights.reduce((a, b) => a + b, 0) || 1;
            const real = r.team === s.team && squad.some(p => (p.goals || 0) > 0);
            squad.forEach((p, i) => {
                const goals = real ? (p.goals || 0) : Math.round(r.gf * weights[i] / tot);
                if (goals > 0) scorers.push({ name: p.name, team: r.team, goals, pj, mine: r.team === s.team });
            });
            const gks = squad.filter(p => p.position === 'POR').sort((a, b) => (b.overall || 0) - (a.overall || 0));
            if (gks[0]) keepers.push({ name: gks[0].name, team: r.team, gc: r.gc, pj, ratio: r.gc / pj, mine: r.team === s.team });
        }
        scorers.sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
        keepers.sort((a, b) => a.ratio - b.ratio || a.gc - b.gc);
        return { pichichi: scorers.slice(0, 5), zamora: keepers.slice(0, 5) };
    }
    window.pcfAwards = awards;

    // ── Campeones de Copa y Europa ──────────────────────────────
    const EU_POOLS = {
        champions: ['Manchester City', 'Real Madrid CF', 'Bayern München', 'PSG', 'Liverpool FC', 'Arsenal FC', 'Inter de Milán', 'Bayer Leverkusen', 'FC Barcelona', 'Atlético de Madrid', 'Borussia Dortmund', 'Juventus', 'AC Milan', 'Atalanta'],
        europaLeague: ['Tottenham', 'AS Roma', 'Lazio', 'Ajax', 'Benfica', 'FC Porto', 'Sevilla FC', 'Villarreal CF', 'Real Sociedad', 'Athletic Club', 'Eintracht Frankfurt', 'Olympique Lyon', 'Marsella', 'Fenerbahçe', 'Aston Villa'],
        conferenceLague: ['Fiorentina', 'Real Betis', 'Celtic', 'Legia Varsovia', 'PAOK', 'Olympiacos', 'Club Brugge', 'Slavia Praga', 'Lille', 'Molde', 'Rapid Viena', 'Panathinaikos']
    };
    function champions(summary) {
        const s = gs(), key = summary.season || s.currentSeason;
        const saved = (s.seasonAwards || {})[key];
        if (saved && saved.champions) return saved;
        const comp = (window.CompetitionsSystem?.getComp?.()) || {};
        const me = s.team, tables = summary.tables || {};
        const out = { season: key };
        // Copa del Rey: favoritos de Primera y Segunda
        const copaPool = [...(tables.primera || []).slice(0, 8), ...(tables.segunda || []).slice(0, 3)].map(r => r.team).filter(t => t !== me);
        out.copa = comp.copaPhase === 'champion' ? me : 'No registrado';
        const mineEU = comp.europeanComp, wonEU = comp.europeanPhase === 'champion';
        ['champions', 'europaLeague', 'conferenceLague'].forEach(k => {
            const pool = EU_POOLS[k].filter(t => t !== me);
            out[k] = (mineEU === k && wonEU) ? me : 'No registrado';
        });
        out.userCopaPhase = comp.copaPhase || null;
        out.userEuropeComp = mineEU || null; out.userEuropePhase = comp.europeanPhase || null;
        gl().updateGameState({ seasonAwards: { ...(s.seasonAwards || {}), [key]: { ...(saved || {}), ...out } } });
        return out;
    }

    // ── Estilos ─────────────────────────────────────────────────
    function css() {
        if (document.getElementById('pgCss')) return;
        const st = document.createElement('style'); st.id = 'pgCss';
        st.textContent = `
        #pcfGala{position:fixed;inset:0;z-index:260000;background:radial-gradient(ellipse at 50% 120%,#1b3a73 0%,#0a1a38 45%,#030a18 100%);color:#fff;font-family:'Saira Condensed','Barlow Condensed',sans-serif;overflow:hidden;display:flex;flex-direction:column}
        #pcfGala .pg-beam{position:absolute;top:-10%;width:34vmax;height:120vmax;background:linear-gradient(180deg,rgba(255,235,170,.38),rgba(255,235,170,0) 70%);transform-origin:50% 0;filter:blur(6px);pointer-events:none;opacity:.55;animation:pgSway 9s ease-in-out infinite}
        #pcfGala .pg-beam.b1{left:2%;--a:-24deg}#pcfGala .pg-beam.b2{left:36%;--a:0deg;animation-delay:-3s;opacity:.4}#pcfGala .pg-beam.b3{right:2%;--a:24deg;animation-delay:-6s}
        @keyframes pgSway{0%,100%{transform:rotate(calc(var(--a) - 6deg))}50%{transform:rotate(calc(var(--a) + 6deg))}}
        #pcfGala .pg-spark{position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(circle,rgba(255,224,130,.9) 0 1.6px,transparent 2.4px);background-size:140px 140px;opacity:.25;animation:pgTw 5s linear infinite}
        @keyframes pgTw{0%{background-position:0 0}100%{background-position:140px 280px}}
        #pcfGala .pg-top{position:relative;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:12px 18px;font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;color:#cfe0ff}
        #pcfGala .pg-stage{position:relative;z-index:2;flex:1;overflow-y:auto;padding:8px 22px 18px;display:flex;justify-content:center}
        #pcfGala .pg-slide{width:100%;max-width:1060px;margin:auto 0;animation:pgIn .55s ease both}
        @keyframes pgIn{from{opacity:0;transform:translateY(18px) scale(.985)}to{opacity:1;transform:none}}
        #pcfGala .pg-kicker{text-align:center;letter-spacing:.42em;color:#ffd24a;font-size:.95rem;text-transform:uppercase}
        #pcfGala h1.pg-title{margin:.15em 0 .2em;text-align:center;font-size:clamp(2.6rem,9vw,6.4rem);line-height:.95;text-transform:uppercase;letter-spacing:.04em;font-style:italic;
            background:linear-gradient(180deg,#fff 0%,#d9e3f5 42%,#6f819f 52%,#fff 78%);-webkit-background-clip:text !important;background-clip:text !important;color:transparent !important;-webkit-text-fill-color:transparent !important;text-shadow:none !important;filter:drop-shadow(0 4px 0 rgba(0,0,0,.55)) drop-shadow(0 0 26px rgba(120,170,255,.35))}
        #pcfGala h2.pg-h{margin:0 0 14px;text-align:center;font-size:clamp(1.5rem,4.6vw,2.6rem);text-transform:uppercase;letter-spacing:.12em;color:#ffd24a;text-shadow:0 3px 0 rgba(0,0,0,.5)}
        #pcfGala .pg-sub{text-align:center;color:#cfe0ff;letter-spacing:.2em;text-transform:uppercase;margin-top:6px}
        #pcfGala .pg-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}
        #pcfGala .pg-card{background:linear-gradient(180deg,rgba(40,86,160,.55),rgba(8,24,52,.85));border:1px solid rgba(160,195,245,.5);border-top:3px solid #ffd24a;border-radius:6px;padding:14px 14px 16px;box-shadow:0 10px 28px rgba(0,0,0,.45)}
        #pcfGala .pg-card.me{border-color:#ffd24a;box-shadow:0 0 0 2px #ffd24a,0 10px 28px rgba(0,0,0,.45)}
        #pcfGala .pg-card .lbl{font-size:.74rem;letter-spacing:.2em;text-transform:uppercase;color:#9fc0ee;margin-bottom:8px}
        #pcfGala .pg-card .big{font-size:1.45rem;font-weight:800;line-height:1.1;display:flex;align-items:center;gap:10px}
        #pcfGala .pg-card .meta{margin-top:6px;color:#cfe0ff;font-size:.9rem}
        #pcfGala .pg-badge{display:inline-flex;align-items:center;justify-content:center;flex:0 0 40px;width:40px;height:40px;border-radius:50%;border:2px solid;font-weight:800;font-size:.95rem}
        #pcfGala .pg-trophy{font-size:2.4rem;text-align:center;filter:drop-shadow(0 4px 8px rgba(0,0,0,.5))}
        #pcfGala .pg-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin:14px 0}
        #pcfGala .pg-stat{text-align:center;background:rgba(255,255,255,.07);border-radius:6px;padding:10px 6px}
        #pcfGala .pg-stat b{display:block;font-size:2rem;color:#fff}#pcfGala .pg-stat span{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:#9fc0ee}
        #pcfGala .pg-verdict{margin:14px auto 0;max-width:620px;text-align:center;padding:12px 16px;border-radius:6px;font-size:1.25rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
        #pcfGala .pg-verdict.up{background:rgba(76,175,80,.25);border:1px solid #4caf50;color:#a5f0a8}#pcfGala .pg-verdict.down{background:rgba(229,57,53,.25);border:1px solid #e53935;color:#ffb3b0}
        #pcfGala .pg-verdict.stay{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.3)}#pcfGala .pg-verdict.gold{background:rgba(255,210,74,.2);border:1px solid #ffd24a;color:#ffe48a}
        #pcfGala .pg-list{list-style:none;margin:0;padding:0}#pcfGala .pg-list li{display:flex;align-items:center;gap:9px;padding:5px 0;border-top:1px solid rgba(160,195,245,.2);font-size:.98rem}
        #pcfGala .pg-list li:first-child{border-top:0}#pcfGala .pg-list li.me{color:#ffd24a;font-weight:800}#pcfGala .pg-list .n{margin-left:auto;font-weight:800;color:#ffd24a;white-space:nowrap}
        #pcfGala .pg-list small{opacity:.7;display:block;font-size:.76rem;font-weight:500}
        #pcfGala .pg-up h3,#pcfGala .pg-down h3{margin:0 0 6px;font-size:.95rem;letter-spacing:.14em;text-transform:uppercase}
        #pcfGala .pg-up h3{color:#7be07f}#pcfGala .pg-down h3{color:#ff8a85}
        #pcfGala .pg-tag{font-size:.66rem;border:1px solid currentColor;border-radius:9px;padding:0 6px;margin-left:6px;opacity:.85}
        #pcfGala .pg-nav{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px;border-top:1px solid rgba(160,195,245,.25);background:rgba(2,8,20,.55)}
        #pcfGala .pg-dots{display:flex;gap:7px}#pcfGala .pg-dots i{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.25);cursor:pointer}#pcfGala .pg-dots i.on{background:#ffd24a;box-shadow:0 0 8px #ffd24a}
        #pcfGala button.pg-btn{background:linear-gradient(180deg,#3a6fc4,#1d4392);border:1px solid #9fc0ee;color:#fff;padding:9px 20px;border-radius:4px;font:inherit;font-weight:800;letter-spacing:.12em;text-transform:uppercase;cursor:pointer}
        #pcfGala button.pg-btn.go{background:linear-gradient(180deg,#ffd24a,#d99a12);color:#08142c;border-color:#fff2b3}
        #pcfGala button.pg-btn:disabled{opacity:.35;cursor:default}#pcfGala button.pg-ghost{background:none;border:0;color:#9fc0ee;font:inherit;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;font-size:.8rem}
        @media (max-width:640px){#pcfGala .pg-top span:first-child{display:none}#pcfGala .pg-stage{padding:4px 12px 12px}#pcfGala .pg-nav{padding:10px 12px}#pcfGala button.pg-btn{padding:8px 12px;font-size:.8rem}#pcfGala .pg-dots{display:none}}
        /* bloques en vivo de la Clasificación */
        #pcfLiveAwards{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin:16px 0}
        #pcfLiveAwards .box{background:linear-gradient(180deg,rgba(36,80,142,.45),rgba(7,22,48,.75));border:1px solid #06142e;border-top:3px solid #ffd24a;border-radius:3px;padding:10px 14px}
        #pcfLiveAwards h4{margin:0 0 6px;font-size:.85rem;letter-spacing:.12em;text-transform:uppercase;color:#ffd24a}
        #pcfLiveAwards ol{margin:0;padding-left:20px;font-size:.9rem;line-height:1.6}#pcfLiveAwards li.me{color:#ffd24a;font-weight:800}#pcfLiveAwards li span{float:right;font-weight:800}
        #pcfLiveAwards small{display:block;opacity:.65;font-size:.72rem;margin-top:6px}`;
        document.head.appendChild(st);
    }

    // ── Diapositivas ────────────────────────────────────────────
    function lastRow(tables, div, team) { return (tables[div] || []).find(r => r.team === team); }
    function slides(sum, ch, aw) {
        const s = gs(), me = s.team, tables = sum.tables || {};
        const myRow = lastRow(tables, sum.userDivision, me) || {};
        const mv = sum.userMove;
        const T = window.PCFPrizes?.tables;
        const key = (sum.userDivision === 'rfef_grupo1' || sum.userDivision === 'rfef_grupo2') ? 'rfef' : sum.userDivision;
        const pos = sum.userPosition;
        const out = [];

        // 0 Portada
        out.push(`<div class="pg-slide" style="text-align:center"><div class="pg-kicker">Gala de</div><h1 class="pg-title">Fin de<br>temporada</h1><div class="pg-sub">${sum.season}</div>
            <div class="pg-trophy" style="margin-top:22px">🏆</div></div>`);

        // 1 Tu temporada
        let verdict = '<div class="pg-verdict stay">Continúas en ' + (DIV_NAME[sum.userDivision] || '') + '</div>';
        if (mv && /^ascenso/.test(mv.reason)) verdict = `<div class="pg-verdict up">⬆ ¡Ascenso a ${DIV_NAME[mv.to] || mv.to}${/playoff/.test(mv.reason) ? ' por playoff' : ''}!</div>`;
        else if (mv && mv.reason === 'descenso') verdict = `<div class="pg-verdict down">⬇ Descenso a ${DIV_NAME[mv.to] || mv.to}</div>`;
        else if (pos === 1) verdict = '<div class="pg-verdict gold">🏆 ¡Campeones de liga!</div>';
        const prizes = [];
        if (T && T.LEAGUE[key] && pos) {
            prizes.push([`${pos}º puesto final`, T.LEAGUE[key](pos)]);
            if (pos === 1 && T.CHAMPION[key]) prizes.push(['Título de liga', T.CHAMPION[key]]);
            if (mv && /^ascenso/.test(mv.reason) && T.PROMOTION_TO[(mv.to || '').startsWith('rfef') ? 'rfef' : mv.to]) prizes.push(['Ascenso', T.PROMOTION_TO[(mv.to || '').startsWith('rfef') ? 'rfef' : mv.to]]);
            if (mv && mv.reason === 'descenso' && T.PARACHUTE_FROM[key]) prizes.push(['Ayuda por el descenso', T.PARACHUTE_FROM[key]]);
        }
        const prizeTotal = prizes.reduce((t, p) => t + p[1], 0);
        out.push(`<div class="pg-slide"><h2 class="pg-h">Tu temporada</h2><div class="pg-card me" style="max-width:700px;margin:0 auto"><div class="lbl">${DIV_NAME[sum.userDivision] || ''}</div>
            <div class="big">${badge(me)}<span>${me}</span><span style="margin-left:auto;font-size:2.2rem;color:#ffd24a">${pos || '—'}º</span></div>
            <div class="pg-stats"><div class="pg-stat"><b>${myRow.pts ?? '—'}</b><span>Puntos</span></div><div class="pg-stat"><b>${myRow.g ?? '—'}-${myRow.e ?? '—'}-${myRow.p ?? '—'}</b><span>G-E-P</span></div>
            <div class="pg-stat"><b>${myRow.gf ?? '—'}</b><span>Goles a favor</span></div><div class="pg-stat"><b>${myRow.gc ?? '—'}</b><span>Goles en contra</span></div></div>
            ${verdict}
            ${prizes.length ? `<div style="margin-top:14px"><div class="lbl">Premios que vas a cobrar</div><ul class="pg-list">${prizes.map(p => `<li>${p[0]}<span class="n">+${fmt(p[1])}€</span></li>`).join('')}<li style="font-weight:800">Total<span class="n">${fmt(prizeTotal)}€</span></li></ul></div>` : ''}</div></div>`);

        // 2 Campeones de liga
        out.push(`<div class="pg-slide"><h2 class="pg-h">Campeones de liga</h2><div class="pg-grid">${DIVS.map(([d, name]) => {
            const t = (tables[d] || [])[0]; if (!t) return '';
            return `<div class="pg-card ${t.team === me ? 'me' : ''}"><div class="lbl">${name}</div><div class="big">${badge(t.team)}<span>${t.team}</span></div><div class="meta">${t.pts} puntos · ${t.gf} goles a favor</div></div>`; }).join('')}</div></div>`);

        // 3 Copa y Europa
        const eu = (k, label, icon) => `<div class="pg-card ${ch[k] === me ? 'me' : ''}"><div class="lbl">${icon} ${label}</div><div class="big">${badge(ch[k])}<span>${ch[k]}</span></div>${ch[k] === me ? '<div class="meta" style="color:#ffd24a">¡Campeón con tu club!</div>' : ''}</div>`;
        out.push(`<div class="pg-slide"><h2 class="pg-h">Copa y Europa</h2><div class="pg-grid">${eu('copa', 'Copa del Rey', '🏆')}${eu('champions', 'Champions League', '⭐')}${eu('europaLeague', 'Europa League', '🟠')}${eu('conferenceLague', 'Conference League', '🟢')}</div></div>`);

        // 4 Ascensos y descensos
        const moves = sum.moves || [];
        const rfefWinners = moves.filter(m => m.to === 'segunda' && /rfef/.test(m.from));
        const cats = [['segunda', 'primera', 'Primera División'], ['rfef_grupo1', 'segunda', 'Segunda División'], ['rfef_grupo2', 'segunda', 'Segunda División'], ['promesas', 'rfef_grupo1', 'Primera RFEF Grupo 1'], ['promesas', 'rfef_grupo2', 'Primera RFEF Grupo 2']];
        const ups = {}, downs = {};
        moves.forEach(m => { (ups[m.to] = ups[m.to] || []).push(m); (downs[m.from] = downs[m.from] || []).push(m); });
        const li = m => `<li class="${m.team === me ? 'me' : ''}">${badge(m.team)}<span>${m.team}${/playoff/.test(m.reason) ? '<span class="pg-tag">playoff</span>' : ''}</span></li>`;
        const upDown = (cat, label) => {
            const up = (ups[cat] || []).filter(m => !/descenso/.test(m.reason)), dn = (downs[cat] || []).filter(m => /descenso/.test(m.reason));
            if (!up.length && !dn.length) return '';
            return `<div class="pg-card"><div class="lbl">${label}</div>
                ${up.length ? `<div class="pg-up"><h3>⬆ Suben (${up.length})</h3><ul class="pg-list">${up.map(li).join('')}</ul></div>` : ''}
                ${dn.length ? `<div class="pg-down" style="margin-top:10px"><h3>⬇ Bajan (${dn.length})</h3><ul class="pg-list">${dn.map(li).join('')}</ul></div>` : ''}</div>`;
        };
        out.push(`<div class="pg-slide"><h2 class="pg-h">Ascensos y descensos</h2>${rfefWinners.length ? `<div class="pg-card"><h3>Primera RFEF → Segunda (${rfefWinners.length})</h3><ul class="pg-list">${rfefWinners.map(li).join('')}</ul></div>` : ''}<div class="pg-grid">${DIVS.map(([d, n]) => upDown(d, n)).join('') || '<div class="pg-card">No ha habido movimientos esta temporada.</div>'}</div></div>`);

        // 5 Pichichi / 6 Zamora
        const awCard = (kind) => DIVS.map(([d, name]) => {
            const a = aw[d]; if (!a || !a[kind].length) return '';
            const list = a[kind].slice(0, 3).map((x, i) => `<li class="${x.mine ? 'me' : ''}"><b>${i + 1}</b><span>${x.name}<small>${x.team}</small></span><span class="n">${kind === 'pichichi' ? x.goals + ' goles' : x.gc + ' enc. · ' + x.ratio.toFixed(2)}</span></li>`).join('');
            return `<div class="pg-card"><div class="lbl">${name}</div><ul class="pg-list">${list}</ul></div>`;
        }).join('');
        out.push(`<div class="pg-slide"><h2 class="pg-h">⚽ Pichichi · máximos goleadores</h2><div class="pg-grid">${awCard('pichichi')}</div></div>`);
        out.push(`<div class="pg-slide"><h2 class="pg-h">🧤 Trofeo Zamora · portero menos goleado</h2><div class="pg-grid">${awCard('zamora')}</div></div>`);

        // 7 Cierre
        const next = mv ? mv.to : sum.userDivision;
        const y = parseInt(String(sum.season).split('/')[0], 10) + 1;
        out.push(`<div class="pg-slide" style="text-align:center"><div class="pg-kicker">Y ahora…</div><h1 class="pg-title">${y}/${String(y + 1).slice(-2)}</h1><div class="pg-sub">${me} · ${DIV_NAME[next] || ''}</div>
            <div class="pg-trophy" style="margin-top:20px">⚽</div></div>`);
        return out;
    }

    // ── Gala ────────────────────────────────────────────────────
    async function showSeasonGala(sum) {
        css();
        const old = document.getElementById('pcfGala'); if (old) old.remove();
        const root = document.createElement('div'); root.id = 'pcfGala';
        root.innerHTML = `<div class="pg-beam b1"></div><div class="pg-beam b2"></div><div class="pg-beam b3"></div><div class="pg-spark"></div>
            <div class="pg-top"><span>PC Fútbol Manager</span><span id="pgTitle"></span><button class="pg-ghost" id="pgSkip">Saltar gala ▸</button></div>
            <div class="pg-stage"><div class="pg-slide" style="text-align:center;margin:auto"><div class="pg-sub">Preparando la gala…</div></div></div><div class="pg-nav"></div>`;
        document.body.appendChild(root);

        // datos (premios individuales y campeones de copas)
        const aw = {};
        try { for (const [d] of DIVS) { if ((sum.tables || {})[d]) aw[d] = await awards(d, sum.tables[d], sum.season); } } catch (e) { console.warn('Gala premios:', e); }
        let ch = {};
        try { ch = champions(sum); } catch (e) { console.warn('Gala campeones:', e); ch = { copa: '—', champions: '—', europaLeague: '—', conferenceLague: '—' }; }
        gl().updateGameState({ seasonAwards: { ...(gs().seasonAwards || {}), [sum.season]: { ...((gs().seasonAwards || {})[sum.season] || {}), ...ch, awards: aw } } });

        const sl = slides(sum, ch, aw);
        const titles = ['', 'Tu temporada', 'Campeones', 'Copa y Europa', 'Ascensos y descensos', 'Pichichi', 'Zamora', ''];
        return new Promise(resolve => {
            let i = 0;
            const stage = root.querySelector('.pg-stage'), nav = root.querySelector('.pg-nav');
            const close = () => { document.removeEventListener('keydown', onKey, true); root.remove(); resolve(); };
            const draw = () => {
                stage.innerHTML = sl[i]; stage.scrollTop = 0;
                root.querySelector('#pgTitle').textContent = titles[i] || '';
                const last = i === sl.length - 1;
                nav.innerHTML = `<button class="pg-btn" id="pgPrev" ${i === 0 ? 'disabled' : ''}>◀ Anterior</button>
                    <div class="pg-dots">${sl.map((_, k) => `<i class="${k === i ? 'on' : ''}" data-k="${k}"></i>`).join('')}</div>
                    <button class="pg-btn ${last ? 'go' : ''}" id="pgNext">${last ? 'Empezar temporada ▶' : 'Siguiente ▶'}</button>`;
                nav.querySelector('#pgPrev').onclick = () => { if (i > 0) { i--; draw(); } };
                nav.querySelector('#pgNext').onclick = () => { if (last) close(); else { i++; draw(); } };
                nav.querySelectorAll('.pg-dots i').forEach(d => d.onclick = () => { i = +d.dataset.k; draw(); });
            };
            const onKey = e => {
                if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); root.querySelector('#pgNext')?.click(); }
                else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); root.querySelector('#pgPrev')?.click(); }
                else if (e.key === 'Escape') { e.stopPropagation(); close(); }
            };
            document.addEventListener('keydown', onKey, true);
            root.querySelector('#pgSkip').onclick = close;
            draw();
        });
    }
    window.showSeasonGala = showSeasonGala;

    // ── Clasificación: Pichichi y Zamora en vivo ────────────────
    let liveBusy = false;
    async function renderLive() {
        if (liveBusy) return; liveBusy = true;
        try {
            const s = gs(); const page = document.getElementById('standings');
            if (!s || !page) return;
            const table = document.getElementById('standingsTable');
            if (!table) return;
            const rows = Object.entries(s.standings || {}).map(([team, r]) => ({ team, g: r.g, e: r.e, p: r.p, gf: r.gf, gc: r.gc }));
            const pj = rows.reduce((m, r) => Math.max(m, r.g + r.e + r.p), 0);
            let box = document.getElementById('pcfLiveAwards');
            if (pj < 1) { box?.remove(); return; }
            css();
            const a = await awards(s.division, rows);
            if (!box) { box = document.createElement('div'); box.id = 'pcfLiveAwards'; const host = table.closest('table') || table; host.parentNode.insertBefore(box, host.nextSibling); }
            box.innerHTML = `<div class="box"><h4>⚽ Pichichi · máximos goleadores</h4><ol>${a.pichichi.map(x => `<li class="${x.mine ? 'me' : ''}">${x.name} <small style="display:inline;opacity:.65">(${x.team})</small><span>${x.goals}</span></li>`).join('')}</ol><small>Estadísticas registradas por el motor; se conservan las aportaciones del jugador aunque cambie de club.</small></div>
                <div class="box"><h4>🧤 Trofeo Zamora · portero menos goleado</h4><ol>${a.zamora.map(x => `<li class="${x.mine ? 'me' : ''}">${x.name} <small style="display:inline;opacity:.65">(${x.team})</small><span>${x.ratio.toFixed(2)}</span></li>`).join('')}</ol><small>Goles encajados por 90 minutos realmente disputados; clasificación provisional.</small></div>`;
        } catch (e) { console.warn('Premios en vivo:', e); } finally { liveBusy = false; }
    }
    function hook() {
        const op = window.openPage;
        if (typeof op === 'function' && !op._pcfGala) { const w = function (id, ...a) { const r = op.call(this, id, ...a); if (id === 'standings') setTimeout(renderLive, 400); return r; }; w._pcfGala = true; window.openPage = w; }
        const st = window.showCompTab;
        if (typeof st === 'function' && !st._pcfGala) { const w = function (t, ...a) { const r = st.call(this, t, ...a); if (t === 'liga') setTimeout(renderLive, 300); else document.getElementById('pcfLiveAwards')?.remove(); return r; }; w._pcfGala = true; window.showCompTab = w; }
    }
    document.addEventListener('click', e => {
        if (e.target.closest('[onclick*="standings"], [onclick*="liga"]')) setTimeout(renderLive, 500);
    });
    [1500, 4000, 7000, 11000].forEach(ms => setTimeout(hook, ms));
})();
