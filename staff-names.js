// staff-names.js — nombres creíbles para el personal del club (nombre + dos apellidos).
// El género sigue al retrato de cada puesto: médico, segundo entrenador y entrenador de
// juveniles son mujeres; el resto, hombres. Expone window.pcfStaffName(role) y la migración
// window.pcfFixLegacyStaffName(name, role) para partidas guardadas con nombres antiguos.
(function () {
    'use strict';
    var MALE = ['Javier','Carlos','Miguel','Sergio','Pablo','Álvaro','Rubén','Iván','Adrián','Alberto','Fernando','Jordi','Marc','Iker','Raúl','Óscar','Andrés','Roberto','David','Ignacio','Joan','Xavier','Gonzalo','Emilio','Héctor','Víctor','Ramón','Tomás','Julián','Enrique'];
    var FEMALE = ['María','Laura','Elena','Carmen','Marta','Lucía','Patricia','Cristina','Raquel','Beatriz','Nuria','Marina','Silvia','Irene','Paula','Rosa','Eva','Montse','Teresa','Inés','Natalia','Sara','Alicia','Pilar','Mercedes','Gemma','Noelia','Verónica','Clara','Isabel'];
    var SURNAMES = ['García','Fernández','González','Rodríguez','López','Martínez','Sánchez','Pérez','Gómez','Martín','Jiménez','Ruiz','Hernández','Díaz','Moreno','Muñoz','Álvarez','Romero','Alonso','Gutiérrez','Navarro','Torres','Domínguez','Vázquez','Ramos','Gil','Ramírez','Serrano','Blanco','Molina','Castro','Ortega','Delgado','Marín','Soler','Vidal','Ferrer','Pons','Roca','Puig','Costa','Vila','Mas','Casals','Iglesias','Medina','Garrido','Cortés','Santos','Prieto'];
    var FEMALE_ROLES = { medico: 1, segundoEntrenador: 1, entrenadorJuveniles: 1 };
    var OLD = ['Juan','Pedro','María','Carlos','Ana','Luis','Sofía','Pablo','Laura','Diego','Miguel','Sergio','Elena','Ricardo','Carmen','Javier'];
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
    window.pcfStaffName = function (role) {
        var first = pick(FEMALE_ROLES[role] ? FEMALE : MALE);
        var s1 = pick(SURNAMES), s2 = pick(SURNAMES);
        for (var i = 0; i < 5 && s2 === s1; i++) s2 = pick(SURNAMES);
        return first + ' ' + s1 + ' ' + s2;
    };
    // «Sofía Carlos» (dos nombres de pila) → nombre con apellidos. Devuelve null si ya es válido.
    window.pcfFixLegacyStaffName = function (name, role) {
        var p = String(name || '').trim().split(/\s+/);
        if (p.length === 2 && OLD.indexOf(p[0]) >= 0 && OLD.indexOf(p[1]) >= 0) return window.pcfStaffName(role);
        return null;
    };
})();
