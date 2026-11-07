// ============================================================
// injector-press.js — Portadas de prensa al ganar un título o conseguir un hito.
// Cola: gameState.pendingPress = [{ id, kind, season, ... }]. Otros módulos añaden elementos (Copa, Europa, fin de
// temporada) y este módulo los muestra de uno en uno cuando no hay otro aviso en pantalla.
// kinds: copa · liga · ascenso · champions · europaLeague · conferenceLague · premio
// Imágenes opcionales en assets/prensa/<kind>.webp (si no existen se usa un degradado con un emoji).
// ============================================================
(function () {
    'use strict';
    const gl = () => window.gameLogic;
    const gs = () => gl()?.getGameState?.();
    const DIV = { primera: 'Primera División', segunda: 'Segunda División', rfef_grupo1: 'Primera RFEF (Grupo 1)',
        rfef_grupo2: 'Primera RFEF (Grupo 2)', promesas: 'Liga Promesas' };
    const COMP = { copa: 'Copa del Rey', champions: 'Champions League', europaLeague: 'Europa League', conferenceLague: 'Conference League' };
    const PAPERS = ['El Diario del Fútbol', 'La Voz del Balón', 'Sport Total', 'El Gol de Hoy'];
    const EMOJI = { copa: '🏆', liga: '🥇', ascenso: '⬆️', champions: '⭐', europaLeague: '🌍', conferenceLague: '🌐', premio: '🎖️' };
    const fmt = n => Math.round(n || 0).toLocaleString('es-ES');
    const hash = s => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
    const pick = (arr, seed) => arr[seed % arr.length];
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function scorersText(list) {
        const names = [...new Set(list || [])];
        if (!names.length) return '';
        return names.length === 1 ? ` El gol lo firmó ${names[0]}.` : ` Marcaron ${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}.`;
    }

    // Texto de cada tipo de portada. `seed` fija las variantes para que una misma portada no cambie al reabrirla.
    function build(item, team) {
        const seed = hash(item.id || item.kind + item.season);
        const opp = item.opponent || 'su rival';
        const score = item.myGoals !== undefined ? `${item.myGoals}-${item.oppGoals}` : '';
        const pens = item.penalties ? ` (${item.penalties} en los penaltis)` : '';
        const quote = pick(['«Es un sueño hecho realidad. Esto es de la afición y de cada jugador.»',
            '«Hemos trabajado mucho para este día. Estoy orgulloso de este grupo.»',
            '«Nadie nos regaló nada. Es el premio al esfuerzo de toda la temporada.»',
            '«Ahora toca disfrutarlo, pero ya pensamos en lo que viene.»'], seed >> 2);
        const a = { kicker: item.season, paper: pick(PAPERS, seed), quote, side: [], emoji: EMOJI[item.kind] || '🏆', img: `assets/prensa/${item.kind}.webp` };
        if (item.kind === 'copa') {
            a.kicker = 'COPA DEL REY · LA GRAN FINAL';
            a.headline = pick([`¡${team}, campeón de Copa!`, `${team} conquista la Copa del Rey`, `La Copa del Rey ya tiene dueño: ${team}`], seed);
            a.sub = `${score}${pens} ante ${opp} en una final para la historia`;
            a.paragraphs = [`${team} se proclamó campeón de la Copa del Rey tras vencer ${score}${pens} a ${opp} en la gran final.${scorersText(item.scorers)}`,
                `El título supone, además, la clasificación para la Europa League de la próxima temporada y un premio económico para el club. La ciudad se echó a la calle para recibir a los campeones.`];
            a.side = [`${opp}, tocado: «Se nos escapó en los detalles»`, 'Europa League: el campeón de Copa ya tiene billete'];
        } else if (item.kind === 'liga') {
            const d = DIV[item.division] || item.division;
            a.kicker = `${(d || '').toUpperCase()} · TEMPORADA ${item.season}`;
            a.headline = pick([`¡${team}, campeón de liga!`, `${team} se corona en ${d}`, `${d}: el campeón es ${team}`], seed);
            a.sub = item.points ? `Con ${item.points} puntos, el equipo acaba la temporada como líder indiscutible` : 'El equipo acaba la temporada como líder indiscutible';
            a.paragraphs = [`${team} cerró la temporada en lo más alto de la tabla de ${d}. El equipo mostró regularidad durante todo el curso y se aseguró un título que el club llevaba tiempo persiguiendo.`,
                'Los jugadores celebraron sobre el césped junto a una afición entregada. La directiva ya prepara los actos de homenaje.'];
            a.side = ['La afición, en pie: «Campeones, campeones»', 'Balance de la temporada: el mejor año del club'];
        } else if (item.kind === 'ascenso') {
            const d = DIV[item.to] || item.to;
            const playoff = /playoff/.test(item.reason || '');
            a.kicker = `ASCENSO · ${(d || '').toUpperCase()}`;
            a.headline = pick([`¡${team} asciende a ${d}!`, `${team} vuelve a la categoría reina: ${d}`, `Histórico: ${team} ya es de ${d}`], seed);
            a.sub = playoff ? 'El ascenso llegó tras superar la fase de playoff' : 'El ascenso se selló de forma directa, sin necesidad de playoff';
            a.paragraphs = [`${team} logró el ascenso a ${d}. ${playoff ? 'El equipo superó una exigente eliminatoria para dar el salto.' : 'El equipo fue de los mejores de la temporada y no dio opción a los rivales.'}`,
                'El ascenso trae nuevos ingresos, más afición y retos mayores: la directiva ya trabaja en reforzar la plantilla.'];
            a.side = ['Fiesta en la ciudad tras el ascenso', 'El mercado, a punto: ¿qué fichajes llegarán?'];
        } else if (item.kind === 'champions' || item.kind === 'europaLeague' || item.kind === 'conferenceLague') {
            const c = COMP[item.kind];
            a.kicker = `${c.toUpperCase()} · NOCHE EUROPEA`;
            a.headline = pick([`¡${team}, campeón de la ${c}!`, `Europa se rinde ante ${team}`, `${team} toca el cielo en la ${c}`], seed);
            a.sub = score ? `${score}${pens} ante ${opp} en la final` : 'El club escribe la página más gloriosa de su historia';
            a.paragraphs = [`${team} conquistó la ${c}${score ? ` tras imponerse ${score}${pens} a ${opp}` : ''}.${scorersText(item.scorers)}`,
                'Un título continental que coloca al club en el mapa del fútbol europeo y que será recordado durante décadas.'];
            a.side = ['El mundo del fútbol felicita al campeón', 'Recibimiento multitudinario a los campeones de Europa'];
        } else if (item.kind === 'premio') {
            a.kicker = 'DIRECTIVA · RECONOCIMIENTO';
            a.headline = pick([`${item.manager || 'El míster'}, Entrenador del Año`, `Objetivos cumplidos: la directiva premia al míster`, `Temporada perfecta para ${team}`], seed);
            a.sub = `Todos los objetivos marcados por la directiva, cumplidos${item.bonus ? ` · bonus de ${fmt(item.bonus)}€` : ''}`;
            a.paragraphs = [`La directiva de ${team} reconoce la gestión del entrenador tras cumplir todos y cada uno de los objetivos de la temporada ${item.season}.`,
                `${item.bonus ? `El club abona un bonus de ${fmt(item.bonus)}€ y ` : ''}la confianza de la directiva en el míster alcanza su nivel más alto. Su nombre ya figura en el palmarés de entrenadores del club.`];
            a.side = ['«Con este míster, el club tiene futuro»: palabras del presidente', 'Otros clubes, interesados en sus servicios'];
        } else {
            a.headline = `${team}: gran noticia`; a.sub = ''; a.paragraphs = [''];
        }
        return a;
    }

    function html(a) {
        return `<style>
#pcfPress{position:fixed;inset:0;z-index:999990;background:rgba(0,0,0,.88);display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:14px;animation:pcfPressIn .35s ease}
@keyframes pcfPressIn{from{opacity:0;transform:translateY(18px) rotate(-.6deg)}to{opacity:1;transform:none}}
#pcfPress .pp{margin:auto;max-width:640px;width:100%;background:#f3ead2;color:#1c1a16;border-radius:4px;padding:16px 18px 20px;box-shadow:0 24px 70px rgba(0,0,0,.7);
  font-family:Georgia,'Times New Roman',serif;background-image:radial-gradient(circle at 20% 10%,rgba(0,0,0,.05),transparent 55%),radial-gradient(circle at 85% 90%,rgba(120,80,20,.08),transparent 50%)}
#pcfPress .pp-mast{text-align:center;border-bottom:3px double #1c1a16;padding-bottom:6px;margin-bottom:8px}
#pcfPress .pp-paper{font-size:1.7rem;font-weight:900;letter-spacing:.04em;text-transform:uppercase;line-height:1.1}
#pcfPress .pp-meta{display:flex;justify-content:space-between;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;margin-top:4px;color:#4a4437}
#pcfPress .pp-kick{font-size:.74rem;font-weight:700;letter-spacing:.14em;color:#8b1e1e;margin:8px 0 2px}
#pcfPress h1{font-size:2rem;line-height:1.05;margin:0 0 6px;font-weight:900;text-transform:uppercase;color:#1c1a16 !important;text-shadow:none !important;letter-spacing:.02em !important;-webkit-text-stroke:0 !important}
#pcfPress .pp-sub{font-size:1rem;font-style:italic;color:#3a352a;margin:0 0 10px;border-left:4px solid #8b1e1e;padding-left:10px}
#pcfPress .pp-img{position:relative;height:210px;border:1px solid #1c1a16;margin:8px 0 10px;overflow:hidden;
  background:linear-gradient(135deg,#2b2417,#6e5a2d 55%,#c9a64c);display:flex;align-items:center;justify-content:center}
#pcfPress .pp-img .pp-emoji{font-size:5.5rem;filter:drop-shadow(0 4px 8px rgba(0,0,0,.5))}
#pcfPress .pp-img img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:sepia(.35) contrast(1.05)}
#pcfPress .pp-cols{column-count:2;column-gap:18px;column-rule:1px solid rgba(0,0,0,.25);font-size:.92rem;line-height:1.45;text-align:justify}
#pcfPress .pp-cols p{margin:0 0 8px}
#pcfPress .pp-quote{font-style:italic;font-weight:700;border-top:1px solid #1c1a16;border-bottom:1px solid #1c1a16;padding:8px 2px;margin:10px 0;text-align:center}
#pcfPress .pp-side{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
#pcfPress .pp-side div{font-size:.8rem;font-weight:700;border-top:2px solid #1c1a16;padding-top:5px;line-height:1.25}
#pcfPress .pp-btn{display:block;margin:16px auto 0;padding:12px 30px;font:700 1rem Georgia,serif;background:#1c1a16;color:#f3ead2;border:0;border-radius:3px;cursor:pointer;min-height:44px}
@media (max-width:560px){#pcfPress .pp-cols{column-count:1}#pcfPress h1{font-size:1.55rem}#pcfPress .pp-paper{font-size:1.3rem}#pcfPress .pp-img{height:150px}#pcfPress .pp-side{grid-template-columns:1fr}}
</style>
<div class="pp">
  <div class="pp-mast"><div class="pp-paper">${esc(a.paper)}</div>
    <div class="pp-meta"><span>EDICIÓN ESPECIAL</span><span>${esc(a.season)}</span><span>${esc(a.team)}</span></div></div>
  <div class="pp-kick">${esc(a.kicker)}</div>
  <h1>${esc(a.headline)}</h1>
  <p class="pp-sub">${esc(a.sub)}</p>
  <div class="pp-img"><span class="pp-emoji">${a.emoji}</span><img src="${esc(a.img)}" alt="" onerror="this.remove()"></div>
  <div class="pp-cols">${a.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}</div>
  <div class="pp-quote">${esc(a.quote)}</div>
  <div class="pp-side">${a.side.map(t => `<div>${esc(t)}</div>`).join('')}</div>
  <button class="pp-btn" id="pcfPressClose">Continuar</button>
</div>`;
    }

    function show(item) {
        const s = gs(); if (!s) return Promise.resolve();
        const a = { ...build(item, s.team), season: item.season || s.currentSeason, team: s.team };
        return new Promise(resolve => {
            document.getElementById('pcfPress')?.remove();
            const el = document.createElement('div');
            el.id = 'pcfPress'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', a.headline);
            el.innerHTML = html(a);
            document.body.appendChild(el);
            const close = () => { el.remove(); resolve(); };
            el.querySelector('#pcfPressClose').onclick = close;
            el.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
        });
    }

    // Se muestra cuando no hay otro aviso importante en pantalla.
    const BLOCKERS = '#pcfGala,#matchSummaryModal,#cupResModal,#cupAnnModal,#fd-modal,.pcf-dlg-back,#offersModal.active,#pcfIntro,#pcfPress';
    function busy() { return [...document.querySelectorAll(BLOCKERS)].some(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).display !== 'none'; }); }
    let showing = false;
    async function flush() {
        if (showing || busy()) return;
        const s = gs(); const list = s?.pendingPress;
        if (!Array.isArray(list) || !list.length) return;
        showing = true;
        try {
            const item = list[0];
            await show(item);
            const now = gs()?.pendingPress || [];
            gl().updateGameState({ pendingPress: now.filter(x => x.id !== item.id) });
        } finally { showing = false; }
    }
    setInterval(() => { try { flush(); } catch (e) { console.warn('press:', e.message); } }, 900);
    window.pcfPress = { show, flush, build };
})();
