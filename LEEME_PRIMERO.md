# PC Fútbol — entrega de correcciones, fase 1

Lee `AUDITORIA_2026-11-05.md` para el diagnóstico, cambios, pruebas y fases pendientes.

## Instalación

1. Conserva una copia del proyecto anterior y de tus partidas actuales.
2. Publica el contenido completo de esta carpeta en el mismo alojamiento que utilizabas. Los módulos ES necesitan HTTP/HTTPS; no abras `index.html` mediante `file://`.
3. **Publica también `firestore.rules` en Firebase Console → Firestore Database → Reglas.** Las nuevas partidas usan subcolecciones `chunks`; con las reglas anteriores, su guardado puede fallar por permisos. Estas reglas están preparadas, pero no se han desplegado ni probado contra tu proyecto privado.
4. Recarga la web evitando la caché y prueba primero una carrera nueva. Después carga una copia de una partida anterior y guárdala con otro nombre. El lector conserva compatibilidad con el formato anterior.
5. Comprueba que puedes guardar, recargar y recuperar la misma jornada y plantilla. Prueba plantilla, fichajes y cantera con suficientes filas para desplazar la tabla.

El registro aportado muestra un rechazo por tamaño de partida, no una confirmación de cuota diaria agotada. Si tu cuota diaria realmente está agotada, cambiar el código no la restablece: comprueba el uso y el código de error de Firebase. El nuevo formato evita superar el tamaño por documento, pero sigue consumiendo lecturas, escrituras y almacenamiento.

Si falla la nube, el juego conserva una copia local cuando IndexedDB lo permite y la identifica como pendiente de sincronización en el listado. No borres los datos del navegador si esa copia contiene tu progreso más reciente. Guarda manualmente antes de cerrar; el autoguardado se programa 700 ms después de avanzar.

## Pruebas incluidas

Con Node.js 24, sin instalar dependencias:

```bash
node tests/regression.mjs
node tests/cloud-integration.mjs
node tests/world-integration.mjs
```

Las pruebas cloud simulan el backend. No sustituyen las pruebas de Firebase real, reglas e interfaz indicadas en la auditoría.
