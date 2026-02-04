// ============================================
// 🔍 SCRIPT DE DIAGNÓSTICO - SISTEMA DE TARJETAS
// Copia y pega esto en la consola del navegador (F12)
// ============================================

console.log('🔍 DIAGNÓSTICO DEL SISTEMA DE TARJETAS\n');
console.log('='.repeat(60));

// TEST 1: Verificar gameLogic
console.log('\n📦 TEST 1: gameLogic.js cargado correctamente');
if (typeof window.gameLogic !== 'undefined') {
    console.log('✅ gameLogic está disponible');
    const state = window.gameLogic.getGameState();
    console.log(`   ✓ Equipo: ${state.team}`);
    console.log(`   ✓ Jornada: ${state.week}`);
    console.log(`   ✓ Jugadores en plantilla: ${state.squad.length}`);
} else {
    console.error('❌ gameLogic NO está disponible');
}

// TEST 2: Verificar estructura de jugadores
console.log('\n👤 TEST 2: Estructura de jugadores');
const state = window.gameLogic.getGameState();
if (state.squad.length > 0) {
    const player = state.squad[0];
    console.log(`   Jugador de prueba: ${player.name}`);
    console.log(`   ✓ yellowCards: ${player.yellowCards !== undefined ? player.yellowCards : '❌ UNDEFINED'}`);
    console.log(`   ✓ redCards: ${player.redCards !== undefined ? player.redCards : '❌ UNDEFINED'}`);
    console.log(`   ✓ isSuspended: ${player.isSuspended !== undefined ? player.isSuspended : '❌ UNDEFINED'}`);
    console.log(`   ✓ suspensionWeeks: ${player.suspensionWeeks !== undefined ? player.suspensionWeeks : '❌ UNDEFINED'}`);
    console.log(`   ✓ isInjured: ${player.isInjured !== undefined ? player.isInjured : '❌ UNDEFINED'}`);
    console.log(`   ✓ weeksOut: ${player.weeksOut !== undefined ? player.weeksOut : '❌ UNDEFINED'}`);
    
    if (player.yellowCards === undefined) {
        console.error('\n❌ PROBLEMA CRÍTICO: Los jugadores NO tienen campos de tarjetas');
        console.error('   → Solución: Reemplaza gameLogic.js con el archivo generado');
    } else {
        console.log('\n✅ Estructura de jugadores correcta');
    }
} else {
    console.error('❌ No hay jugadores en la plantilla');
}

// TEST 3: Verificar funciones de UI
console.log('\n🎨 TEST 3: Funciones de renderizado');
if (typeof window.renderPlayerStatusBadges === 'function') {
    console.log('✅ window.renderPlayerStatusBadges está disponible');
    
    // Probar con un jugador de prueba
    const testPlayer = {
        name: 'Test Player',
        yellowCards: 2,
        redCards: 0,
        isSuspended: false,
        isInjured: false
    };
    
    const badges = window.renderPlayerStatusBadges(testPlayer);
    console.log(`   Badges generados: ${badges.length > 0 ? '✅ SÍ' : '❌ NO'}`);
    if (badges.length > 0) {
        console.log(`   HTML generado: ${badges.substring(0, 100)}...`);
    }
} else {
    console.error('❌ window.renderPlayerStatusBadges NO está disponible');
    console.error('   → Solución: Verifica que hayas importado y expuesto la función en index.html');
}

if (typeof window.applyPlayerStatusClasses === 'function') {
    console.log('✅ window.applyPlayerStatusClasses está disponible');
} else {
    console.error('❌ window.applyPlayerStatusClasses NO está disponible');
}

// TEST 4: Verificar CSS
console.log('\n🎨 TEST 4: Estilos CSS');
const testElement = document.createElement('div');
testElement.className = 'yellow-card-badge';
document.body.appendChild(testElement);
const styles = window.getComputedStyle(testElement);
const hasYellowCardStyles = styles.backgroundColor !== 'rgba(0, 0, 0, 0)' && styles.backgroundColor !== 'transparent';
document.body.removeChild(testElement);

if (hasYellowCardStyles) {
    console.log('✅ CSS de tarjetas cargado correctamente');
} else {
    console.error('❌ CSS de tarjetas NO está cargado');
    console.error('   → Solución: Copia el contenido de NUEVOS_ESTILOS_CSS.txt a tu style.css');
}

// TEST 5: Simular generación de tarjeta
console.log('\n🎴 TEST 5: Simulación de tarjeta');
if (state.squad.length > 0) {
    const testPlayer = state.squad[0];
    console.log(`   Jugador de prueba: ${testPlayer.name}`);
    console.log(`   Amarillas antes: ${testPlayer.yellowCards}`);
    
    // Simular tarjeta amarilla
    testPlayer.yellowCards++;
    console.log(`   Amarillas después: ${testPlayer.yellowCards}`);
    
    const badges = window.renderPlayerStatusBadges ? window.renderPlayerStatusBadges(testPlayer) : 'FUNCIÓN NO DISPONIBLE';
    console.log(`   Badges generados: ${badges.substring(0, 100)}`);
    
    // Revertir cambio
    testPlayer.yellowCards--;
}

// TEST 6: Verificar si hay partidas antiguas
console.log('\n💾 TEST 6: Compatibilidad con partidas antiguas');
const savedGame = localStorage.getItem('pcfutbol-save');
if (savedGame) {
    console.log('✅ Hay partida guardada');
    console.log('   ⚠️ IMPORTANTE: Las partidas antiguas necesitan migración');
    console.log('   → gameLogic.loadFromLocalStorage() hace la migración automática');
} else {
    console.log('ℹ️ No hay partida guardada (juego nuevo)');
}

// RESUMEN FINAL
console.log('\n' + '='.repeat(60));
console.log('📊 RESUMEN DEL DIAGNÓSTICO\n');

let problems = [];
let solutions = [];

if (typeof window.gameLogic === 'undefined') {
    problems.push('gameLogic no está cargado');
    solutions.push('Verifica que gameLogic.js esté importado correctamente');
}

if (state.squad.length > 0 && state.squad[0].yellowCards === undefined) {
    problems.push('Jugadores no tienen campos de tarjetas');
    solutions.push('Reemplaza gameLogic.js con el archivo generado');
}

if (typeof window.renderPlayerStatusBadges !== 'function') {
    problems.push('Función renderPlayerStatusBadges no disponible');
    solutions.push('Añade las líneas de importación en index.html (ver PARCHE_INDEX_HTML.md)');
}

if (!hasYellowCardStyles) {
    problems.push('CSS de tarjetas no cargado');
    solutions.push('Copia NUEVOS_ESTILOS_CSS.txt al final de style.css');
}

if (problems.length === 0) {
    console.log('✅ TODO CORRECTO - El sistema debería funcionar');
    console.log('\n🎮 PRÓXIMO PASO: Juega un partido y revisa las noticias');
} else {
    console.error(`❌ ENCONTRADOS ${problems.length} PROBLEMA(S):\n`);
    problems.forEach((p, i) => {
        console.error(`   ${i + 1}. ${p}`);
        console.error(`      → ${solutions[i]}\n`);
    });
}

console.log('='.repeat(60));
console.log('\n💡 AYUDA ADICIONAL:');
console.log('   - Lee PARCHE_INDEX_HTML.md para modificaciones exactas');
console.log('   - Lee RESUMEN_EJECUTIVO.md para guía completa');
console.log('   - Si todo falla, envía este log completo para ayuda');
