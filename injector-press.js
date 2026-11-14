// ============================================================
// injector-press.js — Portadas de prensa al ganar un título o conseguir un hito.
// Cola: gameState.pendingPress = [{ id, kind, season, ... }]. Otros módulos añaden elementos (Copa, Europa, fin de
// temporada) y este módulo los muestra de uno en uno cuando no hay otro aviso en pantalla.
// kinds: copa · liga · ascenso · champions · europaLeague · conferenceLague · premio · derbi · leyenda_club · dorsal_retirado · leyenda_liga · despedida
// Imágenes opcionales en assets/prensa/<kind>.webp (si no existen se usa un degradado con un emoji).
// ============================================================
(function () {
    'use strict';
    const gl = () => window.gameLogic;
    const gs = () => gl()?.getViewState?.();   // sin el mundo completo: se consulta cada pocos segundos
    const DIV = { primera: 'Primera División', segunda: 'Segunda División', rfef_grupo1: 'Primera RFEF (Grupo 1)',
        rfef_grupo2: 'Primera RFEF (Grupo 2)', promesas: 'Liga Promesas' };
    const COMP = { copa: 'Copa del Rey', champions: 'Champions League', europaLeague: 'Europa League', conferenceLague: 'Conference League' };
    const PAPERS = ['El Diario del Fútbol', 'La Voz del Balón', 'Sport Total', 'El Gol de Hoy'];
    const EMOJI = { fichaje_clausula: '✍️', copa: '🏆', liga: '🥇', ascenso: '⬆️', champions: '⭐', europaLeague: '🌍', conferenceLague: '🌐', premio: '🎖️', derbi: '🔥', leyenda_club: '🕊️', dorsal_retirado: '👕', leyenda_liga: '🌟', despedida: '👋', invasion: '🏃', objetos: '🍾', cantos: '🚫', estadio_cerrado: '🔒', multa_club: '💶', sancion_tecnico: '🟨', fifa_fichajes: '⛔', fifa_deuda: '📄', uefa_fairplay: '⚖️', rebeldia: '✊' };
    // «El Clásico» → «el Clásico»; «Derbi madrileño» → «el derbi madrileño»
    const withArticle = n => /^El /.test(n) ? n.replace(/^El /, 'el ') : 'el ' + n.charAt(0).toLowerCase() + n.slice(1);
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
        } else if (item.kind === 'derbi') {
            const dn = item.derbyName || 'Derbi', opp2 = item.opponent || 'su eterno rival', sc = `${item.myGoals}-${item.oppGoals}`, d = withArticle(dn);
            a.kicker = `${dn.toUpperCase()} · TEMPORADA ${item.season}`;
            a.emoji = item.result === 'W' ? '🔥' : item.result === 'L' ? '😔' : '🤝';
            if (item.result === 'W') {
                a.headline = pick([`¡${team} gana ${d}!`, `${team} se impone en ${d}`, `${d.charAt(0).toUpperCase() + d.slice(1)} es de ${team}`], seed);
                a.sub = `${sc} ante ${opp2}: la ciudad se tiñe de fiesta`;
                a.paragraphs = [`${team} se llevó ${d} tras vencer ${sc} a ${opp2} en un partido de máxima tensión.`,
                    `La afición celebró el triunfo hasta bien entrada la noche. En el vestuario, la alegría fue desbordante: el equipo sabe que este resultado se recordará durante mucho tiempo.`];
                a.side = [`${opp2}, hundido: «Nos han superado»`, 'La directiva felicita al equipo por la victoria'];
                a.quote = pick(['«Esto es por la afición. Sabíamos lo que significaba este partido.»', '«Un derbi se gana con el corazón. Estoy orgulloso de mis jugadores.»', '«Nos lo habían puesto difícil, pero el grupo estuvo a la altura.»'], seed >> 2);
            } else if (item.result === 'L') {
                a.headline = pick([`${opp2} se lleva ${d}`, `Golpe en ${d}: ${team} cae ante ${opp2}`, `Derrota dolorosa de ${team} en ${d}`], seed);
                a.sub = `${sc} en contra: la afición pide explicaciones`;
                a.paragraphs = [`${team} perdió ${sc} ante ${opp2} en ${d}, un resultado que duele más de lo habitual.`,
                    `En la grada reinó el silencio al final y la prensa no tardó en señalar al banquillo. El vestuario tendrá que levantar la cabeza de inmediato.`];
                a.side = [`${opp2} celebra el triunfo en casa ajena`, 'La directiva exige una reacción inmediata'];
                a.quote = pick(['«Duele, y mucho. Hay que levantarse y seguir trabajando.»', '«Pido perdón a la afición. No es el resultado que merecían.»', '«No hay excusas. Asumo la responsabilidad.»'], seed >> 2);
            } else {
                a.headline = pick([`Tablas en ${d}`, `Reparto de puntos en ${d}`, `${team} y ${opp2} no se hacen daño`], seed);
                a.sub = `${sc} en un partido de máxima tensión`;
                a.paragraphs = [`${team} y ${opp2} igualaron ${sc} en ${d}, con ocasiones para ambos y un ambiente electrizante.`,
                    `El empate deja un sabor agridulce: ninguno logró imponerse en un partido que ambos querían ganar.`];
                a.side = ['Ambos entrenadores reclaman más de su equipo', 'La afición despide a los jugadores con una ovación'];
                a.quote = pick(['«Un punto que sabe a poco, pero hay que sumar.»', '«El equipo lo dio todo; el fútbol hoy no quiso decantarse.»', '«Nos vamos con la sensación de que pudimos ganar.»'], seed >> 2);
            }
        } else if (item.kind === 'leyenda_club') {
            const nm = item.playerName || 'La leyenda', st = `${item.seasons || 0} temporadas, ${item.apps || 0} partidos${item.goals ? ` y ${item.goals} goles` : ''}`;
            a.kicker = `HOMENAJE · ${team.toUpperCase()}`;
            a.headline = pick([`Adiós a una leyenda: ${nm} cuelga las botas`, `${nm} dice adiós al fútbol`, `Fin de una era: se retira ${nm}`], seed);
            a.sub = `${st} con ${team}${item.titles ? ` y ${item.titles} título${item.titles === 1 ? '' : 's'}` : ''}`;
            a.paragraphs = [`${nm} ha anunciado su retirada tras una carrera marcada por la entrega y el compromiso con ${team}. ${st.charAt(0).toUpperCase() + st.slice(1)} dan la medida de su huella en el club.`,
                `La afición, el vestuario y la directiva coinciden: el club despide a un referente. En los próximos días se anunciará el homenaje que merece.`];
            a.side = ['Compañeros y rivales rinden tributo a la leyenda', 'La afición pide que su nombre quede para siempre en el club'];
            a.quote = pick(['«Me voy con la cabeza muy alta. Este club y esta gente lo han sido todo para mí.»', '«Dejo el fútbol, pero nunca dejaré de ser uno más de la grada.»', '«Gracias por tantos años. Lo he dado todo y volvería a hacerlo.»'], seed >> 2);
        } else if (item.kind === 'dorsal_retirado') {
            const nm = item.playerName || 'la leyenda', n = item.number;
            a.kicker = `HOMENAJE · ${team.toUpperCase()}`;
            a.headline = pick([`El ${n} ya no volverá a vestirse`, `${team} retira el dorsal ${n} en honor a ${nm}`, `El ${n}, para siempre de ${nm}`], seed);
            a.sub = `Ceremonia emocionante en el estadio: el dorsal ${n} pasa al museo del club`;
            a.paragraphs = [`${team} ha decidido retirar el dorsal ${n} que lució ${nm}. Nadie volverá a llevarlo: la camiseta se exhibirá en el museo del club como símbolo de una época.`,
                `El estadio se puso en pie para despedir a su leyenda en una ceremonia llena de emoción, con ofrenda de la afición y minuto de aplausos.`];
            a.side = ['La camiseta, al museo: «Es un honor inmenso»', 'La afición corea su nombre durante todo el acto'];
            a.quote = pick(['«Ver mi número en lo alto es lo más bonito que me podía pasar.»', '«Esta camiseta siempre será de la afición. Gracias, de corazón.»', '«No hay mayor orgullo que ver tu dorsal para siempre en tu casa.»'], seed >> 2);
        } else if (item.kind === 'leyenda_liga') {
            const nm = item.playerName || 'La estrella', cl = (item.clubs || []).filter(Boolean);
            a.kicker = item.fromClub ? `HIJO DE LA CANTERA · ${String(item.fromClub).toUpperCase()}` : 'LA LIGA DICE ADIÓS';
            a.headline = item.fromClub ? pick([`Se retira ${nm}, formado en la cantera de ${item.fromClub}`, `${nm}, de la cantera a la leyenda: cuelga las botas`], seed)
                : pick([`Se retira ${nm}: el fútbol despide a una leyenda`, `${nm} cuelga las botas`, `Adiós a ${nm}, un icono de la liga`], seed);
            a.sub = `${item.seasons || 0} temporadas en la élite${item.peak ? ` · media máxima ${item.peak}` : ''}`;
            a.paragraphs = [item.fromClub ? `${nm} cuelga las botas tras una carrera brillante${cl.length ? `, pasando por ${cl.slice(0, 4).join(', ')}` : ''}. Todo empezó en la cantera de ${item.fromClub}, donde dio sus primeros pasos y donde la afición no le ha olvidado.`
                : `${nm} ha anunciado su retirada tras una carrera en la que fue una de las grandes figuras de la competición${cl.length ? `, pasando por ${cl.slice(0, 4).join(', ')}` : ''}.`,
                'Aficionados de todos los colores reconocen el legado de un futbolista que marcó una época. Los clubes preparan tributos en los estadios.'];
            a.side = ['Aplausos de todos los estadios para el campeón', 'Rivales y compañeros: «Ha sido un honor enfrentarte»'];
            a.quote = pick(['«Gracias a todos los que me habéis apoyado, también a los que me habéis silbado.»', '«Me llevo el cariño de todos los estadios. Ha sido un viaje precioso.»', '«He sido un privilegiado: viví mi sueño durante muchos años.»'], seed >> 2);
        } else if (item.kind === 'fichaje_clausula') {
            const nm = item.playerName || 'El jugador', from = item.from || 'su club';
            a.kicker = `MERCADO · FICHAJE POR CLÁUSULA`;
            a.headline = pick([`${team} paga la cláusula de ${nm}`, `Golpe de mercado: ${nm} deja ${from} y ficha por ${team}`, `${nm} ya es de ${team}: el club abona su cláusula`], seed);
            a.sub = `${fmt(item.clause)} € por un ${item.position || 'jugador'}${item.overall ? ' de media ' + item.overall : ''}`;
            a.paragraphs = [`${team} ha activado la cláusula de rescisión de ${nm} y se lo lleva de ${from} sin que el club pueda negarse.`,
                'El jugador ha aceptado las condiciones de su nuevo contrato y llega con ganas de demostrar su valía. La operación cambia las cuentas del vestuario.'];
            a.side = [`${from} lamenta la salida y busca recambio`, 'La afición recibe la noticia con ilusión'];
            a.quote = pick(['«Venir aquí era mi decisión. Quiero ganar títulos con esta camiseta.»', '«Me siento muy ilusionado con este proyecto.»'], seed >> 2);
        } else if (item.kind === 'despedida') {
            const nm = item.playerName || 'El jugador';
            a.kicker = `DESPEDIDA · ${team.toUpperCase()}`;
            a.headline = pick([`${nm} dice adiós a ${team}`, `${nm} deja ${team} tras ${item.seasons} temporadas`, `Fin de ciclo: ${nm} abandona el club`], seed);
            a.sub = `${item.seasons || 0} temporadas, ${item.apps || 0} partidos${item.goals ? ` y ${item.goals} goles` : ''} de entrega`;
            a.paragraphs = [`${nm} se despide de ${team} después de ${item.seasons} temporadas defendiendo estos colores. Su paso por el club deja una huella imborrable.`,
                'La afición agradece los servicios prestados con una cariñosa ovación. Las puertas del club seguirán abiertas para él.'];
            a.side = ['Los compañeros le despiden con un emotivo vídeo', 'La grada: «Aquí siempre tendrás tu casa»'];
            a.quote = pick(['«Me voy agradecido a todos. El club siempre estará en mi corazón.»', '«Ha sido un orgullo vestir esta camiseta. Gracias por todo.»'], seed >> 2);
        } else if (['invasion', 'objetos', 'cantos', 'estadio_cerrado', 'multa_club', 'sancion_tecnico', 'fifa_fichajes', 'fifa_deuda', 'uefa_fairplay', 'rebeldia'].includes(item.kind)) {
            const og = item.organ || 'la RFEF', rv = item.rival || 'su rival', fine = item.fine ? `${fmt(item.fine)} €` : '';
            const INC = { invasion: 'una invasión de campo', objetos: 'el lanzamiento de objetos al árbitro y al césped', cantos: 'cánticos racistas desde la grada' };
            a.kicker = item.kind === 'rebeldia' ? 'VESTUARIO · CRISIS' : item.kind === 'fifa_fichajes' || item.kind === 'fifa_deuda' ? 'FIFA · COMUNICADO OFICIAL' : item.kind === 'uefa_fairplay' ? 'UEFA · COMUNICADO OFICIAL' : 'COMITÉ DE COMPETICIÓN · COMUNICADO';
            if (['invasion', 'objetos', 'cantos', 'estadio_cerrado', 'multa_club'].includes(item.kind)) {
                const inc = INC[item.incident] || 'graves incidentes en la grada';
                a.headline = item.closure ? pick([`Sanción a ${team}: estadio ${item.partial ? 'parcialmente ' : ''}cerrado`, `${team}, castigado con ${item.partial ? 'cierre parcial' : 'puerta cerrada'}`], seed)
                    : pick([`Multa a ${team} por los incidentes ante ${rv}`, `${og.charAt(0).toUpperCase() + og.slice(1)} multa a ${team}`], seed);
                a.sub = `${item.sanction || 'Sanción económica'} ${fine ? '· Multa: ' + fine : ''}`.trim();
                a.paragraphs = [`${og.charAt(0).toUpperCase() + og.slice(1)} ha hecho público su comunicado tras ${inc} en el partido ante ${rv}. ${item.sanction || ''}`,
                    `${fine ? `El club deberá abonar ${fine}. ` : ''}${item.repeat ? 'Pesa la reincidencia: el organismo advierte de sanciones mayores si se repite.' : 'El organismo recuerda al club su responsabilidad en el control de la grada.'} La directiva estudia medidas con los grupos de animación.`];
                a.side = ['La directiva condena lo ocurrido y colaborará con la investigación', 'Seguridad del estadio, en entredicho'];
                a.quote = pick(['«Lamentamos lo sucedido. Esto no representa a nuestra afición.»', '«Pedimos disculpas. Tomaremos medidas para que no se repita.»'], seed >> 2);
            } else if (item.kind === 'sancion_tecnico') {
                a.headline = pick([`Multa al técnico de ${team} por protestar`, `${og.charAt(0).toUpperCase() + og.slice(1)} castiga al entrenador de ${team}`], seed);
                a.sub = `Sanción de ${fine} tras el partido ante ${rv}`;
                a.paragraphs = [`El entrenador de ${team} ha sido sancionado por sus protestas al colegiado en el partido ante ${rv}.`, 'En el club restan importancia al asunto, aunque la directiva pide más templanza en la banda.'];
                a.side = ['El técnico: «Defiendo a mi equipo, nada más»', 'El arbitraje, de nuevo en el centro del debate'];
            } else if (item.kind === 'fifa_deuda') {
                a.headline = pick([`Denuncia ante la FIFA contra ${team} por impagos`, `${team}, reclamado por la FIFA por sus deudas`], seed);
                a.sub = `Saldo del club: ${fmt(item.balance)} €`;
                a.paragraphs = [`La FIFA ha recibido una reclamación por impagos contra ${team}. El saldo del club es negativo y las deudas con jugadores y proveedores se acumulan.`, 'Si no se regulariza la situación, el organismo podría bloquear los fichajes del club.'];
                a.side = ['La directiva promete poner al día los pagos', 'Los agentes, en alerta con el club'];
            } else if (item.kind === 'fifa_fichajes') {
                a.headline = pick([`La FIFA bloquea los fichajes de ${team}`, `${team}, vetado en el mercado por la FIFA`], seed);
                a.sub = `Bloqueo de ${item.weeks || 8} semanas por deudas sin regularizar`;
                a.paragraphs = [`La FIFA ha decretado el bloqueo de fichajes de ${team} durante ${item.weeks || 8} semanas por no regularizar sus deudas.`, 'El club no podrá incorporar jugadores hasta que acabe la sanción. En la directiva piden calma y trabajan para equilibrar las cuentas.'];
                a.side = ['El entrenador, preocupado por la plantilla', 'La afición, indignada con la gestión'];
            } else if (item.kind === 'uefa_fairplay') {
                a.headline = pick([`La UEFA abre expediente a ${team} por el Fair Play`, `Aviso de la UEFA a ${team}: cuentas en rojo`], seed);
                a.sub = `Multa de ${fine} por incumplir el Fair Play Financiero`;
                a.paragraphs = [`La UEFA ha sancionado a ${team} con ${fine} por incumplir las normas de control financiero mientras compite en Europa.`, 'El organismo advierte de medidas más duras si las cuentas no mejoran.'];
                a.side = ['La directiva: «Cumpliremos con la normativa»', 'Los socios piden explicaciones'];
            } else {
                const nm = item.playerName || 'Un jugador';
                a.headline = pick([`${nm} se rebela: no se presenta a entrenar`, `Crisis en ${team}: ${nm} planta al club`], seed);
                a.sub = 'El futbolista exige su salida y el vestuario está tenso';
                a.paragraphs = [`${nm} no se ha presentado a los entrenamientos de ${team} y se declara en rebeldía para forzar su marcha.`, 'El club se enfrenta a un pulso: pactar su salida o aguantar el plante, con el vestuario pendiente de la decisión.'];
                a.side = ['El agente del jugador, en conversaciones con otros clubes', 'Los compañeros piden que se resuelva cuanto antes'];
            }
        } else {
            a.headline = `${team}: gran noticia`; a.sub = ''; a.paragraphs = [''];
        }
        return a;
    }

    function html(a, imgState = 'fail') {
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
  <div class="pp-img">${imgState === 'ok' ? `<img src="${esc(a.img)}" alt="" decoding="sync">`
        : imgState === 'pending' ? `<span class="pp-emoji">${a.emoji}</span><img src="${esc(a.img)}" alt="" onload="this.previousElementSibling&&this.previousElementSibling.remove()" onerror="this.remove()">`
        : `<span class="pp-emoji">${a.emoji}</span>`}</div>
  <div class="pp-cols">${a.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}</div>
  <div class="pp-quote">${esc(a.quote)}</div>
  <div class="pp-side">${a.side.map(t => `<div>${esc(t)}</div>`).join('')}</div>
  <button class="pp-btn" id="pcfPressClose">Continuar</button>
</div>`;
    }

    // Precarga de la imagen: la portada se muestra ya con la imagen buena (antes salía un instante el degradado con el emoji
    // y luego cambiaba). Resultado en caché: 'ok' | 'fail'. Si tarda más de 2,5 s se muestra con el emoji y se cambia al cargar.
    const imgCache = {};
    function preload(src) {
        if (imgCache[src] === 'ok' || imgCache[src] === 'fail') return Promise.resolve(imgCache[src]);
        if (imgCache[src]) return imgCache[src];
        imgCache[src] = new Promise(resolve => {
            const im = new Image();
            const done = v => { imgCache[src] = v; resolve(v); };
            im.onload = () => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => done('ok'));
            im.onerror = () => done('fail');
            im.src = src;
            setTimeout(() => { if (typeof imgCache[src] !== 'string') resolve('pending'); }, 2500);
        });
        return imgCache[src];
    }
    async function show(item) {
        const s = gs(); if (!s) return;
        const a = { ...build(item, s.team), season: item.season || s.currentSeason, team: s.team };
        const imgState = await preload(a.img);
        return new Promise(resolve => {
            document.getElementById('pcfPress')?.remove();
            const el = document.createElement('div');
            el.id = 'pcfPress'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', a.headline);
            el.innerHTML = html(a, imgState);
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
    pcfEvery(() => { try { flush(); } catch (e) { console.warn('press:', e.message); } }, 900);
    window.pcfPress = { show, flush, build, preload };
    // Con el juego en reposo se precargan las imágenes de las portadas (si existen)
    if (!navigator.connection?.saveData) setTimeout(() => Object.keys(EMOJI).forEach(k => preload(`assets/prensa/${k}.webp`)), 4000);
})();
