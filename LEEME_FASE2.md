# Parche PC Fútbol — fase 2

Este ZIP contiene **solo archivos nuevos o distintos** respecto a `PCFutbol_auditado_fase1_2026-11-05.zip`. No es un proyecto completo ni un parche para la versión original anterior a la fase 1.

## Cómo aplicarlo

1. Haz una copia de tu carpeta de la fase 1. Conserva también las partidas; si estás jugando, guarda antes de sustituir archivos.
2. Copia el contenido de `pcfutbol-main/` del parche sobre la carpeta equivalente de tu proyecto, manteniendo las rutas. Sustituye los archivos cuando lo pida. No borres los demás archivos, imágenes ni módulos.
3. Publica el `firestore.rules` actualizado en Firebase Console → Firestore Database → Reglas. Es necesario tanto para el control de versiones como para la suspensión de cuentas. Esta entrega no modifica tu consola automáticamente.
4. Cierra todas las pestañas antiguas del juego y recarga la versión nueva evitando la caché. No mezcles pestañas con el código anterior y posterior.
5. Carga tu partida y comprueba guardar y volver a cargar. Para continuar con un guardado que ya existe, cárgalo antes: ahora se rechaza sobrescribir una versión que esta pestaña no conoce.

## Cambios que verás

- Si otra pestaña cambia la misma partida, el guardado se detiene con un conflicto en lugar de sobrescribirla. Exporta primero el progreso que quieras conservar; después puedes usar **Cargar nube** en el listado para elegir expresamente la versión cloud. No se fusionan dos carreras.
- Junto al botón de guardar aparecen **Exportar copia** e **Importar copia**. La copia es un JSON descargable con la partida completa. Una importación se convierte en una partida independiente y no pisa un guardado cloud existente.
- Si falla una jornada iniciada con «Seguir», se restaura el estado anterior. Espera al aviso antes de volver a avanzar. Este mecanismo no revierte escrituras externas realizadas por otros módulos ni operaciones iniciadas directamente desde código.
- Si el catálogo tarda más de seis segundos, puedes cancelar la creación de la carrera o aceptar el uso de datos locales y plantillas generadas donde falten datos. Para volver a consultar el catálogo real, recarga con conexión.
- Las cuentas suspendidas no pueden leer/escribir las carreras y partidas protegidas por las nuevas reglas. Una cuenta sin perfil debe completar el inicio de sesión para crearlo.
- El juego solicita confirmación del navegador al cerrar si detecta una simulación o guardado pendiente. Esto no garantiza guardar si fuerzas el cierre; exporta antes de borrar datos del navegador.

## Índices: configuración opcional

`firestore.phase2.indexes.json` propone excluir del índice el campo `data` de las subcolecciones `chunks`. No se usa para buscar y contiene los fragmentos grandes.

**No reemplaces con ese archivo toda la configuración de índices de un proyecto compartido.** Revisa primero si otras aplicaciones usan una colección llamada `chunks`; si no hay incompatibilidades, añade esa exención a tu configuración existente o desde la consola. El archivo no se publica automáticamente.

## Pruebas

El informe `INFORME_FASE2.md` distingue lo comprobado y lo pendiente. Las pruebas incluidas se ejecutan con Node.js 24; el comprobador de sintaxis requiere Python 3:

```bash
node tests/regression.mjs
node tests/cloud-integration.mjs
node tests/phase2.mjs
node tests/economy-hooks.mjs
node tests/world-integration.mjs
python tests/check-syntax.py
```

Los tests de la fase 1 que no han cambiado ya están en tu carpeta y por eso no se vuelven a incluir. `MANIFIESTO_FASE2.json` identifica los archivos del parche y los hashes antes/después para comprobar la base.
