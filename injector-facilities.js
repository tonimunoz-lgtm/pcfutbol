// ============================================================
// injector-facilities.js  v1.0
//
// REEMPLAZA el sistema de instalaciones de index.html/gameLogic
// con un sistema realista de:
//
// ESTADIO:
//   - Ampliación de asientos: coste real ~2.500€/asiento,
//     construcción en fases de ~52 semanas para 10.000 asientos
//   - Mejoras: iluminación LED, pantalla gigante, gradas VIP,
//     restaurantes, parking, accesos, césped híbrido, tienda oficial
//
// CENTRO DE ENTRENAMIENTO:
//   - Mejoras individuales: gimnasio, césped, iluminación,
//     instalaciones médicas, sala táctica, residencia juvenil,
//     piscina, fisioterapia
//
// EFECTOS EN FANBASE:
//   - Cada mejora incrementa la fanbase y/o la popularidad
//   - Ampliación de aforo afecta directamente a ingresos de taquilla
// ============================================================

(function () {
    'use strict';

    const gl  = () => window.gameLogic;
    const gs  = () => gl()?.getGameState?.();
    const fmt = n  => Math.round(n || 0).toLocaleString('es-ES');
    const save = u => gl()?.updateGameState?.(u);

    // ── Catálogo de mejoras ────────────────────────────────────────

    const STADIUM_UPGRADES = [
        {
            id: 'seats_5k',
            name: '🏗️ Ampliar +5.000 asientos',
            desc: 'Construcción de nueva gradería modular.',
            cost: 13_000_000,
            weeks: 30,
            capacityAdd: 5000,
            fanbaseBonus: 0.03,
            popularityBonus: 1,
            category: 'expansion',
            maxBuilds: 10,
        },
        {
            id: 'seats_10k',
            name: '🏗️ Ampliar +10.000 asientos',
            desc: 'Gran ampliación estructural del estadio.',
            cost: 25_000_000,
            weeks: 52,
            capacityAdd: 10000,
            fanbaseBonus: 0.06,
            popularityBonus: 2,
            category: 'expansion',
            maxBuilds: 5,
        },
        {
            id: 'led_lights',
            name: '💡 Iluminación LED profesional',
            desc: 'Torres de iluminación LED de última generación. Permite partidos nocturnos con calidad TV.',
            cost: 1_800_000,
            weeks: 6,
            capacityAdd: 0,
            fanbaseBonus: 0.02,
            popularityBonus: 2,
            incomeWeeklyBonus: 5000,
            category: 'tech',
            unique: true,
        },
        {
            id: 'giant_screen',
            name: '📺 Pantalla gigante LED',
            desc: 'Videomarcador de gran formato con retransmisiones y publicidad.',
            cost: 2_500_000,
            weeks: 8,
            capacityAdd: 0,
            fanbaseBonus: 0.03,
            popularityBonus: 3,
            incomeWeeklyBonus: 8000,
            category: 'tech',
            unique: true,
        },
        {
            id: 'vip_boxes',
            name: '🥂 Palcos y zona VIP',
            desc: 'Construcción de palcos corporativos y zona hospitaliy. Aumenta ingresos por partido.',
            cost: 4_500_000,
            weeks: 20,
            capacityAdd: 500,
            fanbaseBonus: 0.01,
            popularityBonus: 3,
            incomeWeeklyBonus: 20000,
            category: 'premium',
            unique: true,
        },
        {
            id: 'restaurants',
            name: '🍔 Restaurantes y bares',
            desc: 'Red de restauración dentro del estadio. Mejora experiencia y aumenta merchandising.',
            cost: 1_200_000,
            weeks: 12,
            capacityAdd: 0,
            fanbaseBonus: 0.02,
            popularityBonus: 2,
            incomeWeeklyBonus: 6000,
            category: 'services',
            unique: true,
        },
        {
            id: 'parking',
            name: '🅿️ Aparcamiento propio',
            desc: 'Construcción de parking con 1.000 plazas. Reduce barreras de acceso.',
            cost: 3_000_000,
            weeks: 18,
            capacityAdd: 0,
            fanbaseBonus: 0.02,
            popularityBonus: 1,
            incomeWeeklyBonus: 4000,
            category: 'services',
            unique: true,
        },
        {
            id: 'fan_shop',
            name: '🛍️ Tienda oficial ampliada',
            desc: 'Local de merchandising de gran superficie dentro del estadio.',
            cost: 600_000,
            weeks: 6,
            capacityAdd: 0,
            fanbaseBonus: 0.02,
            popularityBonus: 2,
            incomeWeeklyBonus: 3000,
            category: 'services',
            unique: true,
        },
        {
            id: 'hybrid_pitch',
            name: '🌱 Césped híbrido profesional',
            desc: 'Sistema de césped híbrido natural-artificial con calefacción subterránea.',
            cost: 2_200_000,
            weeks: 16,
            capacityAdd: 0,
            fanbaseBonus: 0.01,
            popularityBonus: 3,
            category: 'pitch',
            unique: true,
        },
        {
            id: 'museum',
            name: '🏆 Museo del club',
            desc: 'Espacio expositivo de la historia del club. Atracción turística y fuente de ingresos.',
            cost: 800_000,
            weeks: 10,
            capacityAdd: 0,
            fanbaseBonus: 0.03,
            popularityBonus: 2,
            incomeWeeklyBonus: 2000,
            category: 'services',
            unique: true,
        },
    ];

    const TRAINING_UPGRADES = [
        {
            id: 'gym',
            name: '💪 Gimnasio de alto rendimiento',
            desc: 'Equipamiento de musculación y fitness de última generación.',
            cost: 500_000,
            weeks: 5,
            trainingBonus: 1,
            fanbaseBonus: 0.01,
            popularityBonus: 1,
            unique: true,
        },
        {
            id: 'training_pitch',
            name: '🌿 Campo de entrenamiento profesional',
            desc: 'Césped de competición para los entrenamientos diarios.',
            cost: 800_000,
            weeks: 8,
            trainingBonus: 1,
            fanbaseBonus: 0.01,
            popularityBonus: 1,
            unique: true,
        },
        {
            id: 'medical',
            name: '🏥 Instalaciones médicas avanzadas',
            desc: 'Clínica deportiva con diagnóstico por imagen, fisioterapia y quirófano.',
            cost: 1_200_000,
            weeks: 10,
            trainingBonus: 1,
            injuryReduction: 0.15,
            fanbaseBonus: 0.01,
            popularityBonus: 2,
            unique: true,
        },
        {
            id: 'video_room',
            name: '🖥️ Sala táctica y análisis de vídeo',
            desc: 'Sala de reuniones con pantallas para análisis táctico.',
            cost: 350_000,
            weeks: 4,
            trainingBonus: 1,
            fanbaseBonus: 0.005,
            popularityBonus: 1,
            unique: true,
        },
        {
            id: 'physio',
            name: '🧘 Centro de fisioterapia',
            desc: 'Spa deportivo, piscina de recuperación e hidromasaje.',
            cost: 700_000,
            weeks: 7,
            trainingBonus: 1,
            injuryReduction: 0.10,
            fanbaseBonus: 0.005,
            popularityBonus: 1,
            unique: true,
        },
        {
            id: 'youth_academy',
            name: '👦 Residencia de la cantera',
            desc: 'Alojamiento y formación para jugadores jóvenes.',
            cost: 2_000_000,
            weeks: 20,
            trainingBonus: 2,
            fanbaseBonus: 0.04,
            popularityBonus: 3,
            unique: true,
        },
        {
            id: 'recovery_pool',
            name: '🏊 Piscina de recuperación',
            desc: 'Piscina climatizada y bañeras de crioterapia.',
            cost: 400_000,
            weeks: 5,
            trainingBonus: 0,
            injuryReduction: 0.08,
            fanbaseBonus: 0.005,
            popularityBonus: 1,
            unique: true,
        },
        {
            id: 'nutrition',
            name: '🥗 Cocina y nutrición deportiva',
            desc: 'Comedor con nutricionistas especializados en deporte de élite.',
            cost: 280_000,
            weeks: 4,
            trainingBonus: 0,
            injuryReduction: 0.05,
            fanbaseBonus: 0.005,
            popularityBonus: 1,
            unique: true,
        },
    ];

    // ── Helpers de estado ──────────────────────────────────────────
    function getFacData() {
        const s = gs() || {};
        return {
            stadiumDone:    s.fac_stadiumDone    || [],  // IDs completados
            trainingDone:   s.fac_trainingDone   || [],  // IDs completados
            construction:   s.fac_construction   || [],  // [{id, name, weeksLeft, weeksTotal, type, effects}]
            injuryReduction: s.fac_injuryReduction || 0,
        };
    }
    function saveFac(d) {
        save({
            fac_stadiumDone:    d.stadiumDone,
            fac_trainingDone:   d.trainingDone,
            fac_construction:   d.construction,
            fac_injuryReduction: d.injuryReduction,
        });
    }

    function news(msg, type) { try { gl()?.addNews?.(msg, type || 'info'); } catch(e){} }

    // ── Iniciar construcción ───────────────────────────────────────
    function startConstruction(upgradeId, category) {
        const s = gs();
        if (!s) return;

        const list = category === 'stadium' ? STADIUM_UPGRADES : TRAINING_UPGRADES;
        const upg = list.find(u => u.id === upgradeId);
        if (!upg) return;

        const d = getFacData();
        const done = category === 'stadium' ? d.stadiumDone : d.trainingDone;

        // Comprobar si ya está construido (unique) o en construcción
        if (upg.unique && done.includes(upgradeId)) {
            alert(`"${upg.name}" ya está construido.`);
            return;
        }
        if (d.construction.some(c => c.id === upgradeId)) {
            alert(`"${upg.name}" ya está en construcción.`);
            return;
        }

        // Comprobar límite de expansiones
        if (upg.maxBuilds) {
            const timesBuilt = done.filter(id => id === upgradeId).length;
            if (timesBuilt >= upg.maxBuilds) {
                alert(`Has alcanzado el límite máximo de ampliaciones.`);
                return;
            }
        }

        // Comprobar límite máximo de capacidad (105.000 espectadores)
        const MAX_STADIUM_CAPACITY = 105000;
        if (upg.capacityAdd > 0) {
            const currentCap = s.stadiumCapacity || 5000;
            // Sumar también lo que hay en construcción
            const pendingCap = getFacData().construction
                .filter(c => c.effects?.capacityAdd > 0)
                .reduce((sum, c) => sum + c.effects.capacityAdd, 0);
            if (currentCap + pendingCap + upg.capacityAdd > MAX_STADIUM_CAPACITY) {
                const remaining = MAX_STADIUM_CAPACITY - currentCap - pendingCap;
                if (remaining <= 0) {
                    alert(`El estadio ya ha alcanzado la capacidad máxima permitida de ${fmt(MAX_STADIUM_CAPACITY)} espectadores.`);
                } else {
                    alert(`Esta ampliación superaría el límite máximo de ${fmt(MAX_STADIUM_CAPACITY)} espectadores.\nCapacidad restante permitida: ${fmt(remaining)} espectadores.`);
                }
                return;
            }
        }

        if ((s.balance || 0) < upg.cost) {
            alert(`No tienes saldo suficiente. Necesitas ${fmt(upg.cost)}€.`);
            return;
        }

        if (!confirm(`¿Iniciar construcción de "${upg.name}"?\n\nCoste: ${fmt(upg.cost)}€\nDuración: ${upg.weeks} semanas\n\nEl importe se descuenta ahora del presupuesto.`)) return;

        save({ balance: (s.balance || 0) - upg.cost });

        d.construction.push({
            id: upgradeId,
            name: upg.name,
            category,
            weeksLeft: upg.weeks,
            weeksTotal: upg.weeks,
            effects: {
                capacityAdd:      upg.capacityAdd      || 0,
                fanbaseBonus:     upg.fanbaseBonus      || 0,
                popularityBonus:  upg.popularityBonus   || 0,
                incomeWeeklyBonus: upg.incomeWeeklyBonus || 0,
                trainingBonus:    upg.trainingBonus     || 0,
                injuryReduction:  upg.injuryReduction   || 0,
            }
        });
        saveFac(d);

        // Registrar en finanzas con prefijo de categoría para que injector-finances lo clasifique bien
        if (window._financeRegisterMovement) {
            const catLabel = category === 'stadium' ? '[Estadio]' : '[Entrenamiento]';
            window._financeRegisterMovement('renovation', `${catLabel} ${upg.name}`, -upg.cost);
        }

        news(`🏗️ Inicio de obras: ${upg.name} — ${upg.weeks} semanas hasta completarse.`, 'info');
        buildPage();
        if (window._financeRefresh) window._financeRefresh();
    }
    window._facStart = startConstruction;

    // ── Completar construcción ────────────────────────────────────
    function completeConstruction(item) {
        const s = gs();
        if (!s) return;
        const d = getFacData();
        const fx = item.effects;

        // Aplicar efectos
        const updates = {};

        if (fx.capacityAdd > 0) {
            updates.stadiumCapacity = (s.stadiumCapacity || 5000) + fx.capacityAdd;
            // Ajustar income base según capacidad nueva (equivale a más taquilla potencial)
        }
        if (fx.incomeWeeklyBonus > 0) {
            const baseOrig = s.fd_baseOrig ?? s.weeklyIncomeBase ?? 5000;
            updates.fd_baseOrig = baseOrig + fx.incomeWeeklyBonus;
        }
        if (fx.trainingBonus > 0) {
            updates.trainingLevel = (s.trainingLevel || 1) + fx.trainingBonus;
        }
        if (fx.popularityBonus > 0) {
            updates.popularity = Math.min(100, (s.popularity || 50) + fx.popularityBonus);
        }
        if (fx.fanbaseBonus > 0) {
            updates.fanbase = Math.floor((s.fanbase || 10000) * (1 + fx.fanbaseBonus));
        }
        if (fx.injuryReduction > 0) {
            d.injuryReduction = Math.min(0.6, (d.injuryReduction || 0) + fx.injuryReduction);
        }

        save(updates);
        if (typeof window.recalcWeekly === 'function') window.recalcWeekly?.();

        // Marcar como completado
        if (item.category === 'stadium') d.stadiumDone.push(item.id);
        else d.trainingDone.push(item.id);

        d.construction = d.construction.filter(c => !(c.id === item.id && c.category === item.category));
        saveFac(d);

        news(`✅ ¡Obras completadas! ${item.name} — ya disponible.`, 'success');

        // Recap de efectos
        const msgs = [];
        if (fx.capacityAdd)      msgs.push(`+${fmt(fx.capacityAdd)} espectadores`);
        if (fx.fanbaseBonus)     msgs.push(`+${Math.round(fx.fanbaseBonus*100)}% afición`);
        if (fx.trainingBonus)    msgs.push(`+${fx.trainingBonus} nivel entrenamiento`);
        if (fx.popularityBonus)  msgs.push(`+${fx.popularityBonus} popularidad`);
        if (fx.incomeWeeklyBonus) msgs.push(`+${fmt(fx.incomeWeeklyBonus)}€/sem ingresos`);
        if (fx.injuryReduction)  msgs.push(`-${Math.round(fx.injuryReduction*100)}% lesiones`);
        if (msgs.length) news(`📋 Efectos: ${msgs.join(' · ')}`, 'success');

        if (window._financeRefresh) window._financeRefresh();
        buildPage();
    }

    // ── Hook simulateWeek ─────────────────────────────────────────
    function hookSimWeek() {
        if (typeof window.simulateWeek !== 'function') { setTimeout(hookSimWeek, 300); return; }
        if (window._facHooked) return;
        window._facHooked = true;
        const orig = window.simulateWeek;
        window.simulateWeek = async function (...args) {
            const result = await orig.apply(this, args);
            tickConstruction();
            return result;
        };
        console.log('[Facilities] hook simulateWeek ✓');
    }

    function tickConstruction() {
        const d = getFacData();
        if (!d.construction.length) return;
        let changed = false;
        const toComplete = [];
        d.construction = d.construction.map(item => {
            const left = item.weeksLeft - 1;
            if (left <= 0) { toComplete.push(item); return null; }
            if (left <= 4) news(`🏗️ ${item.name}: ¡quedan ${left} semanas!`, 'info');
            changed = true;
            return { ...item, weeksLeft: left };
        }).filter(Boolean);
        if (changed || toComplete.length) saveFac(d);
        toComplete.forEach(completeConstruction);
        if (changed || toComplete.length) buildPage();
    }

    // ── Hook openPage ─────────────────────────────────────────────
    function hookOpenPage() {
        if (!window.openPage) { setTimeout(hookOpenPage, 300); return; }
        if (window._facPageHooked) return;
        window._facPageHooked = true;
        const orig = window.openPage;
        window.openPage = function(page, ...args) {
            orig.call(this, page, ...args);
            if (page === 'facilities') setTimeout(buildPage, 80);
        };
    }

    // ── Override window.expandStadium y improveFacilities ─────────
    function overrideNativeFunctions() {
        // Sobrescribir con no-ops que redirigen a nuestro sistema
        window.expandStadium = function() {
            openFacilitiesPage();
        };
        window.improveFacilities = function() {
            openFacilitiesPage();
        };
        console.log('[Facilities] expandStadium/improveFacilities sobreescritos ✓');
    }

    function openFacilitiesPage() {
        if (window.openPage) window.openPage('facilities');
    }

    // ── Tab activo ────────────────────────────────────────────────
    let _activeTab = 'stadium';

    window._facTab = function(tab) {
        _activeTab = tab;
        buildPage();
    };

    // ── Construir la página de instalaciones ──────────────────────
    function buildPage() {
        const container = document.getElementById('facilities');
        if (!container) return;

        const s = gs();
        if (!s) return;
        const d = getFacData();
        const injRed = Math.round((d.injuryReduction || 0) * 100);
        const constructionHTML = renderConstruction(d.construction);

        // Foto del estadio — siempre en proporcion 4:3, object-fit:cover centra sin estirar
        const photoHTML = s.stadiumImage
            ? `<div style="width:100%;aspect-ratio:4/3;border-radius:8px;overflow:hidden;margin-bottom:4px;">
                 <img src="${s.stadiumImage}" style="width:100%;height:100%;object-fit:cover;display:block;">
               </div>`
            : `<div style="width:100%;aspect-ratio:4/3;background:rgba(255,255,255,.03);border-radius:8px;
                           display:flex;align-items:center;justify-content:center;color:#444;font-size:.8em;margin-bottom:4px;">
                 🏟️ Sin foto
               </div>`;

        const tabStadium  = _activeTab === 'stadium';
        const tabBtnBase  = 'border:none;border-radius:8px 8px 0 0;padding:10px 18px;cursor:pointer;font-weight:bold;font-size:.85em;transition:all .2s;white-space:nowrap;';
        const tabActiveS  = tabBtnBase + 'background:#FFD700;color:#000;';
        const tabActiveT  = tabBtnBase + 'background:#2196F3;color:#fff;';
        const tabInactive = tabBtnBase + 'background:rgba(255,255,255,.06);color:#666;';

        // Grid responsivo: 2 col en desktop, 1 col en móvil estrecho
        const gridStyle = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;';

        const tabContent = tabStadium
            ? `<div style="${gridStyle}">
                ${renderUpgradeList(STADIUM_UPGRADES, 'stadium', d.stadiumDone, d.construction)}
               </div>`
            : `<div style="${gridStyle}">
                ${renderUpgradeList(TRAINING_UPGRADES, 'training', d.trainingDone, d.construction)}
               </div>`;

        container.innerHTML = `
        <div class="page-header">
            <h1>🏟️ Estadio e Instalaciones</h1>
            <button class="page-close-btn" onclick="closePage('facilities')">✖ CERRAR</button>
        </div>

        <!-- RESUMEN + FOTO: flex-wrap para que en móvil se apilen -->
        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
            <!-- Stats: crecen para llenar espacio, mínimo 200px -->
            <div style="flex:1;min-width:200px;display:flex;flex-direction:column;gap:8px;">
                <div style="background:rgba(255,255,255,.04);border-radius:10px;padding:11px;display:flex;justify-content:space-between;align-items:center;">
                    <span style="color:#888;font-size:.83em;">🏟️ ${s.stadiumName || 'Estadio'}</span>
                    <span style="color:#FFD700;font-weight:bold;">${fmt(s.stadiumCapacity)} esp.</span>
                </div>
                <div style="background:rgba(255,255,255,.04);border-radius:10px;padding:11px;display:flex;justify-content:space-between;align-items:center;">
                    <span style="color:#888;font-size:.83em;">👥 Afición</span>
                    <span style="color:#4CAF50;font-weight:bold;">${fmt(s.fanbase)}</span>
                </div>
                <div style="background:rgba(255,255,255,.04);border-radius:10px;padding:11px;display:flex;justify-content:space-between;align-items:center;">
                    <span style="color:#888;font-size:.83em;">🏋️ Entrenamiento</span>
                    <span style="color:#2196F3;font-weight:bold;">Nv.${s.trainingLevel || 1}${injRed > 0 ? ' -'+injRed+'%' : ''}</span>
                </div>
                <div style="background:rgba(255,255,255,.04);border-radius:10px;padding:11px;display:flex;justify-content:space-between;align-items:center;">
                    <span style="color:#888;font-size:.83em;">📊 Popularidad</span>
                    <span style="color:#9C27B0;font-weight:bold;">${s.popularity || 50}/100</span>
                </div>
            </div>
            <!-- Foto: ancho fijo 160px en desktop, 100% en móvil -->
            <div style="flex:0 0 auto;width:clamp(120px,35%,200px);">
                ${photoHTML}
                <div style="color:#444;font-size:.7em;text-align:center;">Admin → foto</div>
            </div>
        </div>

        <!-- OBRAS EN CURSO -->
        ${constructionHTML}

        <!-- PESTAÑAS -->
        <div style="display:flex;gap:4px;margin-bottom:0;margin-top:8px;overflow-x:auto;">
            <button style="${tabStadium ? tabActiveS : tabInactive}" onclick="window._facTab('stadium')">🏟️ Estadio</button>
            <button style="${!tabStadium ? tabActiveT : tabInactive}" onclick="window._facTab('training')">🏋️ C. Entrenamiento</button>
        </div>
        <div style="background:rgba(255,255,255,.03);border-radius:0 8px 8px 8px;padding:12px;border:1px solid rgba(255,255,255,.07);">
            ${tabContent}
        </div>
        `;
    }

    function renderConstruction(construction) {
        if (!construction.length) return '';
        const items = construction.map(item => {
            const pct = Math.round((1 - item.weeksLeft / item.weeksTotal) * 100);
            const color = item.category === 'stadium' ? '#FFD700' : '#2196F3';
            return `
            <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,200,0,.2);
                        border-radius:10px;padding:12px;margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span style="color:${color};font-weight:bold;">${item.name}</span>
                    <span style="color:#f5a623;font-size:.85em;">⏳ ${item.weeksLeft} sem. restantes</span>
                </div>
                <div style="width:100%;height:6px;background:#222;border-radius:3px;overflow:hidden;">
                    <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,${color},#fff2);border-radius:3px;transition:width .3s;"></div>
                </div>
                <div style="color:#555;font-size:.75em;margin-top:4px;">${pct}% completado</div>
            </div>`;
        }).join('');
        return `
        <h2 style="font-size:1em;color:#f5a623;text-transform:uppercase;letter-spacing:1px;
                   border-bottom:1px solid #2a2a2a;padding-bottom:6px;margin-bottom:12px;">
            🏗️ Obras en curso
        </h2>
        ${items}`;
    }

    function renderUpgradeList(upgrades, category, done, construction) {
        const s = gs();
        const balance = s?.balance || 0;
        return upgrades.map(upg => {
            const isDone     = upg.unique && done.includes(upg.id);
            const inProgress = construction.some(c => c.id === upg.id && c.category === category);
            const canAfford  = balance >= upg.cost;
            const timesBuilt = done.filter(id => id === upg.id).length;
            const atMax      = upg.maxBuilds && timesBuilt >= upg.maxBuilds;

            let statusBadge = '';
            let btnDisabled = false;
            let cardStyle   = '';

            if (inProgress) {
                const prog = construction.find(c => c.id === upg.id && c.category === category);
                statusBadge = `<span style="background:#f5a623;color:#000;border-radius:4px;padding:2px 7px;font-size:.72em;font-weight:bold;">EN OBRAS ${prog?.weeksLeft}sem</span>`;
                btnDisabled = true;
            } else if (isDone || atMax) {
                statusBadge = `<span style="background:#2e7d32;color:#fff;border-radius:4px;padding:2px 7px;font-size:.72em;font-weight:bold;">✓ COMPLETADO</span>`;
                btnDisabled = true;
                cardStyle = 'opacity:.6;';
            } else if (!canAfford) {
                statusBadge = `<span style="color:#f44336;font-size:.72em;">Sin fondos</span>`;
            }

            // Efectos a mostrar
            const effects = [];
            if (upg.capacityAdd)       effects.push(`+${fmt(upg.capacityAdd)} asientos`);
            if (upg.fanbaseBonus)       effects.push(`+${Math.round(upg.fanbaseBonus*100)}% afición`);
            if (upg.trainingBonus)      effects.push(`+${upg.trainingBonus} entrenamiento`);
            if (upg.popularityBonus)    effects.push(`+${upg.popularityBonus} popularidad`);
            if (upg.incomeWeeklyBonus)  effects.push(`+${fmt(upg.incomeWeeklyBonus)}€/sem`);
            if (upg.injuryReduction)    effects.push(`-${Math.round(upg.injuryReduction*100)}% lesiones`);
            if (upg.maxBuilds && !isDone && !atMax) effects.push(`(${timesBuilt}/${upg.maxBuilds})`);

            const colorBorder = category === 'stadium' ? 'rgba(255,215,0,.15)' : 'rgba(33,150,243,.15)';
            const colorAccent = category === 'stadium' ? '#FFD700' : '#2196F3';

            return `
            <div style="background:rgba(255,255,255,.04);border:1px solid ${colorBorder};
                        border-radius:10px;padding:13px;${cardStyle}display:flex;flex-direction:column;justify-content:space-between;">
                <div>
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
                        <span style="color:${colorAccent};font-weight:bold;font-size:.9em;">${upg.name}</span>
                        ${statusBadge}
                    </div>
                    <div style="color:#888;font-size:.78em;margin-bottom:7px;line-height:1.4;">${upg.desc}</div>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">
                        ${effects.map(e => `<span style="background:rgba(255,255,255,.06);border-radius:4px;padding:2px 6px;font-size:.72em;color:#aaa;">${e}</span>`).join('')}
                    </div>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
                    <div>
                        <div style="color:#f5a623;font-weight:bold;">${fmt(upg.cost)}€</div>
                        <div style="color:#555;font-size:.75em;">⏱ ${upg.weeks} semanas</div>
                    </div>
                    <button onclick="window._facStart('${upg.id}','${category}')"
                        ${btnDisabled ? 'disabled' : ''}
                        style="background:${btnDisabled ? '#333' : canAfford ? colorAccent : '#555'};
                               color:${btnDisabled ? '#666' : canAfford ? '#000' : '#aaa'};
                               border:none;border-radius:8px;padding:7px 14px;
                               cursor:${btnDisabled ? 'not-allowed' : 'pointer'};
                               font-weight:bold;font-size:.8em;white-space:nowrap;">
                        ${inProgress ? '🏗️ En obra' : isDone || atMax ? '✓ Hecho' : '▶ Construir'}
                    </button>
                </div>
            </div>`;
        }).join('');
    }

    // ── Exponer injury reduction para otros módulos ────────────────
    window._facGetInjuryReduction = function() {
        return getFacData().injuryReduction || 0;
    };

    // ── Init ──────────────────────────────────────────────────────
    function init() {
        if (!window.gameLogic) { setTimeout(init, 400); return; }
        hookSimWeek();
        hookOpenPage();
        overrideNativeFunctions();

        setTimeout(() => {
            if (document.getElementById('facilities')?.style.display !== 'none') {
                buildPage();
            }
        }, 2000);

        console.log('[Facilities] ✅ v1.0 listo');
    }

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', init)
        : init();

})();
