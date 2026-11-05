// ============================================================
// injector-stadium-visual.js — Estadio visual
// Cabecera de la página «Estadio e Instalaciones» con la ilustración del estadio
// según su fase (10 fases por aforo + final + remodelación en curso), la línea
// de evolución y las instalaciones construidas.
//
// Imágenes (assets/imagenes/estadio/):  estadio-01.webp … estadio-10.webp,
// estadio-final.webp y estadio-obras.webp. Si falta alguna, se usa la genérica.
// ============================================================
(function () {
    'use strict';
    const gl = () => window.gameLogic;
    const gs = () => gl()?.getViewState?.();
    const fmt = n => Math.round(n).toLocaleString('es-ES');
    const DIR = 'assets/imagenes/estadio/';
    const FALLBACK = 'assets/imagenes/estadio-sin-foto.webp';
    // Aforo mínimo de cada una de las 10 fases
    const STAGES = [0, 8000, 15000, 25000, 38000, 52000, 66000, 80000, 92000, 100000];
    const STAGE_NAME = ['Campo de barrio', 'Estadio modesto', 'Estadio de ascenso', 'Estadio profesional', 'Estadio consolidado', 'Gran estadio', 'Estadio de élite', 'Coliseo', 'Mega estadio', 'Templo del fútbol'];
    const STADIUM_FAC = [
        ['seats_5k', 'Gradas +5.000'], ['seats_10k', 'Gradas +10.000'], ['led_lights', 'Iluminación LED'], ['giant_screen', 'Pantalla gigante'], ['vip_boxes', 'Palcos VIP'],
        ['restaurants', 'Restaurantes'], ['parking', 'Aparcamiento'], ['fan_shop', 'Tienda oficial'], ['hybrid_pitch', 'Césped híbrido'], ['museum', 'Museo']
    ];
    const FAC_ICON = { seats_5k: 'ampliar-5000', seats_10k: 'ampliar-10000', led_lights: 'iluminacion-led', giant_screen: 'pantalla-gigante', vip_boxes: 'palcos-vip',
        restaurants: 'restaurantes', parking: 'aparcamiento', fan_shop: 'tienda-oficial', hybrid_pitch: 'cesped-hibrido', museum: 'museo' };

    function stageOf(cap) { let k = 0; STAGES.forEach((min, i) => { if (cap >= min) k = i; }); return k; }
    window.pcfStadiumStage = stageOf;

    function css() {
        if (document.getElementById('pcfStadCss')) return;
        const st = document.createElement('style'); st.id = 'pcfStadCss';
        st.textContent = `
        #pcfStadHero{margin:0 0 16px;border:1px solid #06142e;border-radius:4px;overflow:hidden;background:#06142e;box-shadow:0 8px 24px rgba(0,0,0,.45)}
        #pcfStadHero .banner{position:relative;aspect-ratio:21/8;max-height:340px;width:100%;background:#0a1a38;overflow:hidden}
        #pcfStadHero .banner img.main{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block;transition:none}
        #pcfStadHero:hover .banner img.main{transform:none}
        #pcfStadHero .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,10,26,.05) 40%,rgba(3,10,26,.88) 100%)}
        #pcfStadHero .cap{position:absolute;left:18px;right:18px;bottom:12px;display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;color:#fff}
        #pcfStadHero .phase{font-family:'Saira Condensed',sans-serif;text-transform:uppercase;letter-spacing:.1em}
        #pcfStadHero .phase small{display:block;color:#ffd24a;letter-spacing:.3em;font-size:.78rem}
        #pcfStadHero .phase b{font-size:clamp(1.3rem,3.4vw,2.3rem);line-height:1;text-shadow:0 3px 0 rgba(0,0,0,.55)}
        #pcfStadHero .seats{text-align:right;font-family:'Saira Condensed',sans-serif}
        #pcfStadHero .seats b{display:block;font-size:clamp(1.2rem,2.8vw,1.9rem);color:#ffd24a;text-shadow:0 2px 0 rgba(0,0,0,.5)}
        #pcfStadHero .seats span{font-size:.82rem;opacity:.85}
        #pcfStadHero .works{position:absolute;top:12px;left:12px;background:rgba(255,152,0,.92);color:#201000;font-weight:800;padding:6px 12px;border-radius:4px;letter-spacing:.06em;font-size:.85rem;box-shadow:0 4px 12px rgba(0,0,0,.5)}
        #pcfStadHero .works i{display:block;height:5px;background:rgba(0,0,0,.25);border-radius:3px;margin-top:5px;overflow:hidden}#pcfStadHero .works i u{display:block;height:100%;background:#fff;text-decoration:none}
        #pcfStadHero .toggle{position:absolute;top:12px;right:12px;background:rgba(6,20,46,.8);color:#cfe0ff;border:1px solid rgba(160,195,245,.5);border-radius:14px;padding:4px 12px;font-size:.74rem;cursor:pointer;font-family:inherit}
        #pcfStadHero .track{display:flex;align-items:center;gap:0;padding:12px 16px 4px;background:linear-gradient(180deg,rgba(36,80,142,.5),rgba(7,22,48,.85))}
        #pcfStadHero .step{flex:1;text-align:center;position:relative;font-size:.66rem;color:#7f95b8;letter-spacing:.04em}
        #pcfStadHero .step::before{content:'';display:block;height:4px;background:#1d3558;margin:0 -1px 6px}
        #pcfStadHero .step.done{color:#9fc0ee}#pcfStadHero .step.done::before{background:#4a86d6}
        #pcfStadHero .step.now{color:#ffd24a;font-weight:800}#pcfStadHero .step.now::before{background:#ffd24a;box-shadow:0 0 8px #ffd24a}
        #pcfStadHero .facs{display:flex;flex-wrap:wrap;gap:8px;padding:8px 16px 14px;background:rgba(7,22,48,.85)}
        #pcfStadHero .fac{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.07);border:1px solid rgba(122,160,212,.4);border-radius:14px;padding:3px 10px 3px 4px;font-size:.74rem;color:#e6eefb}
        #pcfStadHero .fac img{width:24px;height:24px;object-fit:contain}
        #pcfStadHero .fac.off{opacity:.38;filter:grayscale(1)}#pcfStadHero .fac.off img{filter:grayscale(1)}
        #pcfStadHero .fac.work{opacity:1;border-color:#ff9800;color:#ffcc80}
        @media (max-width:640px){#pcfStadHero .banner{aspect-ratio:16/10}#pcfStadHero .step span{display:none}#pcfStadHero .cap{left:10px;right:10px}}`;
        document.head.appendChild(st);
    }

    function build() {
        const s = gs(); if (!s) return null;
        css();
        const cap = s.stadiumCapacity || 10000;
        const done = new Set(s.fac_stadiumDone || []);
        const work = (s.fac_construction || []);
        const seatWork = work.find(w => /^seats_/.test(w.id));
        const allDone = STADIUM_FAC.every(([id]) => done.has(id));
        const stage = stageOf(cap);
        let file, tag = '';
        if (seatWork) { file = 'estadio-obras.webp'; }
        else if (cap >= 105000 && allDone) { file = 'estadio-final.webp'; tag = 'Fase final'; }
        else file = `estadio-${String(stage + 1).padStart(2, '0')}.webp`;
        const next = STAGES[stage + 1];
        const club = null;
        const phaseTxt = file === 'estadio-final.webp' ? 'Fase final' : `Fase ${stage + 1} de 10`;
        const nameTxt = file === 'estadio-final.webp' ? 'Todo construido' : STAGE_NAME[stage];
        const works = seatWork ? `<div class="works">🏗 REMODELACIÓN · ${seatWork.name?.replace(/^\W+/, '') || 'Gradas'} · ${seatWork.weeksLeft} sem<i><u style="width:${Math.round((1 - seatWork.weeksLeft / Math.max(1, seatWork.weeksTotal || seatWork.weeksLeft)) * 100)}%"></u></i></div>` : '';
        const steps = STAGES.map((min, i) => `<button type="button" data-cap="${i === 9 ? 105000 : STAGES[i + 1]}" class="step ${i < stage ? 'done' : i === stage ? 'now' : ''}" title="${STAGE_NAME[i]} · desde ${fmt(min)} asientos"><span>${i + 1}</span></button>`).join('');
        const facs = STADIUM_FAC.map(([id, label]) => {
            const building = work.some(w => w.id === id);
            return `<span class="fac ${done.has(id) ? '' : building ? 'work' : 'off'}" title="${label}${done.has(id) ? ' · construido' : building ? ' · en obras' : ' · sin construir'}"><img src="assets/iconos/instalaciones/${FAC_ICON[id]}.webp" alt="">${label}</span>`;
        }).join('');
        const el = document.createElement('div');
        el.id = 'pcfStadHero';
        el.innerHTML = `<div class="banner">
            <img class="main" src="${DIR + file}" alt="Estadio" onerror="this.onerror=null;this.src='${FALLBACK}'">
            <div class="shade"></div>${works}
            ${club ? '<button class="toggle" type="button">Ver foto del club</button>' : ''}
            <div class="cap"><div class="phase"><small>${s.stadiumName || 'Estadio'}</small><b>${phaseTxt} · ${nameTxt}</b></div>
                <div class="seats"><b>${fmt(cap)} asientos</b><span>${next ? 'Siguiente fase a los ' + fmt(next) : stage === 9 && cap < 105000 ? 'Aforo máximo: 105.000' : 'Máximo alcanzado'}</span></div></div></div>
            <div class="track">${steps}</div><div class="facs">${facs}</div>`;
        el.querySelectorAll('[data-cap]').forEach(button => button.onclick = () => {
            const capacity = Number(button.dataset.cap);
            const info = window.pcfStadiumRequirements?.(capacity) || 'Sin requisitos adicionales';
            if (window.pcfNotify) window.pcfNotify('Requisitos de la fase', info);
            else alert(info);
        });
        const tg = el.querySelector('.toggle');
        if (tg) {
            let showClub = false;
            tg.onclick = () => { showClub = !showClub; const im = el.querySelector('img.main'); im.src = showClub ? club : DIR + file; tg.textContent = showClub ? 'Ver ilustración' : 'Ver foto del club'; };
        }
        return el;
    }

    function ensure() {
        const page = document.getElementById('facilities');
        if (!page || !page.classList.contains('active') || page.querySelector('#pcfStadHero')) return;
        const header = page.querySelector('.page-header');
        if (!header) return;
        const el = build(); if (!el) return;
        header.parentNode.insertBefore(el, header.nextSibling);
    }
    let q = false;
    const schedule = () => { if (q) return; q = true; setTimeout(() => { q = false; try { ensure(); } catch (e) { console.warn('Estadio visual:', e); } }, 100); };
    function start() { schedule(); new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); }
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
