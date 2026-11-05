# PC Fútbol — fase 2, 5 de noviembre de 2026

## Resultado

Se amplía la fase 1 con protección de guardados concurrentes, suspensión en reglas, recuperación ante fallos semanales, copias portátiles y mejoras de seguridad y rendimiento dirigidas. Se entrega un parche de diferencias: los recursos y archivos idénticos a la fase 1 se excluyen.

La fase 2 incluye las correcciones que se han podido implementar y verificar localmente. No se ha desplegado el proyecto, no se han usado credenciales privadas, no se ha ejecutado el emulador de Firestore ni se ha realizado la prueba visual en navegador. Esas validaciones continúan pendientes; no se presentan como superadas.

## Correcciones y decisiones

| Área | Implementación | Límite relevante |
|---|---|---|
| Varias pestañas | El manifiesto tiene una versión y una versión base. Una transacción compara la versión leída por esta pestaña con la actual antes de publicar | Se rechaza el conflicto; no se fusionan estados. Los cambios de dos pestañas necesitan elección explícita |
| Reglas de versiones | Las actualizaciones del dueño deben enlazar la versión base con la versión guardada | Administradores mantienen sus permisos. Hay que actualizar código y reglas y cerrar clientes antiguos |
| Compatibilidad | Una partida antigua se puede cargar y migrar al guardar | No se puede sobrescribir un ID existente sin haberlo cargado primero |
| Fragmentos | Cada publicación usa fragmentos de generación única. El documento principal y los nuevos fragmentos se publican juntos | Los fragmentos antiguos se limpian después en lotes pequeños. Si falla la limpieza, el guardado válido se conserva y pueden quedar restos hasta borrar la partida |
| Copia local | Ante conflicto se mantiene el resultado local si IndexedDB pudo guardarlo | El espacio y disponibilidad de IndexedDB no son ilimitados; no sustituye la exportación |
| Elección de versión | Se añade «Cargar nube» para ignorar expresamente una copia local más reciente | Cargar sustituye la partida abierta: exportarla primero si contiene progreso que se desea conservar |
| Guardado manual | El estado guardado y la partida abierta conservan el ID creado | El autoguardado posterior continúa sobre ese guardado en vez de volver a otro ID de equipo |
| Suspensión | Las reglas exigen perfil activo para acceder a `users`, partidas, fragmentos, carreras ProManager y lectura del mercado; se conserva administración | La autenticación Firebase sigue siendo un servicio distinto. La suspensión no elimina una cuenta Auth |
| Login | Si no se puede comprobar el perfil, se cierra la sesión en vez de permitir el acceso tras una excepción | Una interrupción de red puede impedir iniciar sesión hasta restablecer la comprobación |
| Fallo al avanzar | El botón «Seguir» conserva un checkpoint y restaura el estado completo si falla la cadena de hooks | No revierte efectos externos, promesas tardías de terceros ni efectos de funciones llamadas directamente por fuera del botón |
| Cierre de pestaña | Aviso si hay avance, temporizador de autoguardado o guardado pendiente; al ocultar la página se intenta adelantar el autoguardado | El navegador puede finalizar procesos sin completar escrituras. No hay garantía de persistencia ante cierre forzado |
| Catálogo lento | Una consulta agrupada con límite de seis segundos y fallback local. Se elimina el fallback que volvía a consultar cada club | Crear una carrera sin catálogo exige confirmar el uso de datos locales/generados; no se sustituye después una plantilla persistente automáticamente |
| Mercado/rivales | APIs para enumerar clubes sin copiar el mundo completo; mercado usa la vista de equipo y consulta si existe mundo mediante API | Otros recorridos todavía pueden obtener instantáneas completas; el rediseño por deltas corresponde a fase 3 |
| Copia portable | Exportar JSON completo e importar con validación de estructura, profundidad y campos peligrosos; límite de importación 32 MB | Se necesitan recursos suficientes para leer la copia. Importar crea un guardado nuevo independiente |
| Lista de partidas | Nombres y metadatos se dibujan con `textContent`; acciones usan listeners en lugar de concatenar `onclick` | Esta corrección no implica una eliminación universal de XSS en todos los módulos |
| Jugadores y usuarios | Escape contextual de nombres en las tablas principales, argumentos de despedir/ascender y datos de usuarios del administrador; se filtran URLs de imágenes en `ui.js` | Quedan plantillas HTML en otros injectores para revisar en fase 3 |
| Administración | Se corrige el aviso de borrado: eliminar los documentos del juego no elimina ni inhabilita Firebase Auth | La baja definitiva requiere actuación en Authentication o un backend autorizado |
| Índices | Se incluye una propuesta de exención para el contenido de fragmentos | Debe revisarse e integrarse sin reemplazar índices de otras aplicaciones |

La publicación usa la API de transacciones de Firestore: lectura de la versión antes de escribir, reintento de concurrencia y ausencia de publicación parcial. No se cambia el estado de la aplicación dentro de la función que Firestore puede repetir. Referencia consultada: https://firebase.google.com/docs/firestore/manage-data/transactions . La validación de concurrencia ejecutada aquí utiliza un backend simulado con reintentos; no es una prueba del SDK contra Firestore real.

## Pruebas realizadas

| Conjunto | Resultado y alcance |
|---|---|
| Regresión previa | 21 comprobaciones: serialización, Unicode, caché, traspasos, cesiones, primas y préstamos |
| Nube simulada | 9 escenarios: guardado/lectura, limpieza, fallo y recuperación local, borrado, formato antiguo, pestaña desactualizada, recarga cloud explícita, sobrescritura sin carga previa y dos creaciones simultáneas |
| Integración específica de fase 2 | 6 escenarios: validación de copia, rollback, doble clic, catálogo sin respuesta, texto HTML hostil en partidas y escape de nombres/URLs |
| Economía con hooks reales | 2 órdenes de instalación × 5 escenarios: cierre normal, última cuota, clic ignorado, resultado de copa y transición con semanas de verano |
| Mundo persistente | 56 avances del motor con 81 clubes, cambio anual y de división, propiedad única y coherencia de goles incluyendo resultados administrativos |
| Sintaxis y referencias | Todos los JavaScript, los scripts inline HTML y las referencias locales comprobadas por `tests/check-syntax.py` |

Las trazas con errores simulados dentro de las pruebas de rollback y timeout son intencionadas. El resultado final de cada prueba indica si el mecanismo de recuperación se verificó. El test de economía usa estado y DOM mínimos; no representa una prueba visual ni todos los flujos reales de acuerdos comerciales, instalaciones o playoffs.

## Validaciones pendientes y límites

1. **Reglas en emulador o Firebase real:** cuenta nueva, dueño, otro usuario, perfil ausente, suspensión durante sesión, administrador, migración de partida antigua, conflicto y carrera ProManager. Debe comprobarse la compilación y autorización antes de dar el despliegue por validado.
2. **Prueba visual:** cabeceras al desplazar tablas en móvil/escritorio, diálogos superpuestos, botones de copia y avisos al cerrar. Se mantiene el cambio de cabeceras de la fase 1; no se adjuntan recursos de imagen sin modificar.
3. **Navegador real:** IndexedDB lleno/denegado, pérdida de red, cierre forzado e importación/exportación de partidas grandes.
4. **Cobertura completa de simulación:** fallos a mitad de copas, premios y acciones ProManager que ya hayan escrito en otros documentos; los efectos externos no son parte del checkpoint local.
5. **Seguridad global:** siguen existiendo concatenaciones HTML en otros injectores. Esta entrega protege los puntos concretos descritos, no certifica la ausencia global de XSS.
6. **Borrado concurrente:** el nuevo control de versiones cubre publicaciones de partidas, no un bloqueo distribuido de todas las acciones administrativas/borrados. No borres una carrera mientras otro cliente la está usando.
7. **Costes:** fragmentar y versionar no elimina las cuotas de Firebase; las comprobaciones de perfil en reglas pueden generar lecturas adicionales. No se puede determinar el consumo de tu proyecto desde este entorno.

## Fase 3

Quedan para el rediseño: un cierre contable único basado en eventos, separación entre UI y motor, persistencia por bloques/deltas, reducción del resto de copias y temporizadores, roles de administración gestionados desde servidor y retirada progresiva de `onclick`/HTML concatenado en todos los módulos. Deben conservarse las migraciones de partidas y la cobertura de esta entrega.
