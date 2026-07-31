# FutboLike TV

Aplicación Android de pantalla completa para reproducir un canal propio mediante una URL `.m3u8` o `.ts` administrada desde Firebase Firestore.

## Funciones incluidas

- Mensaje: **“Bienvenidos a FutboLike, búscanos en redes sociales”**.
- Botón **Ver Canal**.
- Reproducción con sonido después del toque del usuario.
- Orientación horizontal fija en Android.
- Pantalla completa e interfaz inmersiva.
- Pantalla siempre encendida mientras la app está abierta.
- Lectura en tiempo real de la URL desde Firestore.
- Reconexión básica ante errores de red.
- Reproductor Android nativo libVLC para HLS `.m3u8`, MPEG-TS `.ts` y otros formatos compatibles con VLC.
- HLS.js se conserva como reproductor de respaldo al abrir la versión web.

## 1. Instalar dependencias

Necesitas Node.js y Android Studio.

```bash
npm install
cp node_modules/hls.js/dist/hls.min.js www/vendor/hls.min.js
```

En Windows PowerShell:

```powershell
Copy-Item node_modules/hls.js/dist/hls.min.js www/vendor/hls.min.js
```

## 2. Crear Firebase

1. Crea un proyecto en Firebase Console.
2. Registra una aplicación Web.
3. Copia la configuración entregada por Firebase.
4. Reemplaza los valores de `www/js/firebase-config.js`.
5. Activa **Cloud Firestore**.
6. Crea la colección `channels`.
7. Dentro de ella crea el documento `futbolike`.

Contenido recomendado:

```json
{
  "channelName": "FutboLike",
  "streamUrl": "https://TU-SERVIDOR/canal/index.m3u8",
  "streamType": "m3u8",
  "online": true,
  "offlineMessage": "El canal se encuentra temporalmente fuera de servicio"
}
```

Cada vez que cambies `streamUrl`, las apps abiertas recibirán el nuevo enlace.

### Clave para acceder al canal

Para pedir una clave después de pulsar **Ver Canal**, agrega estos campos al documento `channels/futbolike`:

```json
{
  "requireAccessCode": true,
  "accessCode": "CAMBIA-ESTA-CLAVE",
  "accessTitle": "Canal protegido",
  "accessPrompt": "Ingresa la clave para ver la transmisión."
}
```

Puedes cambiar la clave desde Firebase sin generar otra APK. Para desactivarla, cambia `requireAccessCode` a `false`. Este control evita el acceso casual, pero la clave forma parte de una configuración pública y no sustituye autenticación de usuarios ni enlaces privados firmados.

### Icono de la aplicación

El logo FutboLike incluido en `android-snippets/launcher-icons` se instala automáticamente como icono de inicio al ejecutar `scripts/configure-android.mjs`. Para cambiarlo en el futuro, reemplaza los PNG de esas cinco carpetas conservando sus nombres.

## 3. Reglas de Firestore

El archivo `firestore.rules` permite lectura pública del canal y escritura solo a usuarios autenticados. Para una primera prueba también puedes editar el documento directamente desde Firebase Console.

## 4. Probar en computador

```bash
npm run serve
```

Abre `http://localhost:8080`.

> El bloqueo horizontal y el modo inmersivo completo se aplican correctamente al compilar para Android.

## 5. Crear el proyecto Android

```bash
npx cap add android
npx cap sync android
npx cap open android
```

Al ejecutar `node scripts/configure-android.mjs`, el proyecto añade automáticamente libVLC `3.6.5` y la interfaz nativa del reproductor. No necesitas editar Gradle manualmente.

libVLC incorpora sus propios demultiplexores y decodificadores, por lo que la APK será considerablemente más grande que la versión basada en ExoPlayer.

## 6. Fijar orientación, pantalla encendida y pantalla completa

Después de crear Android:

1. Abre `android/app/src/main/AndroidManifest.xml`.
2. Busca la actividad `.MainActivity`.
3. Añade `android:screenOrientation="landscape"` según `android-snippets/AndroidManifest-activity.xml`.
4. Reemplaza el contenido de `android/app/src/main/java/com/futbolike/tv/MainActivity.java` con `android-snippets/MainActivity.java`.
5. Ejecuta nuevamente:

```bash
npx cap sync android
```

## 7. Generar APK

Desde Android Studio:

`Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`.

## Observaciones importantes

- Para reproducción confiable, usa preferentemente una URL `.m3u8` HTTPS.
- El servidor del stream debe permitir CORS para el origen de la aplicación.
- Una URL HTTP puede ser bloqueada por Android; es mejor usar HTTPS.
- Un `.ts` único no ofrece la misma estabilidad que una lista HLS `.m3u8`.
- La URL enviada al reproductor puede ser inspeccionada por un usuario avanzado. Para protección fuerte se necesitan enlaces firmados y temporales generados por el servidor del canal.

## 8. Compilar sin computador

Este proyecto incluye GitHub Actions. Después de subirlo a un repositorio, abre la pestaña **Actions**, selecciona **Generar APK FutboLike** y pulsa **Run workflow**. Al finalizar podrás descargar el APK en **Artifacts**.

Consulta `GUIA-DESDE-ANDROID.md` para las instrucciones completas desde el teléfono.


### Redes sociales dinámicas
La pantalla de bienvenida incluye botones de Instagram y Facebook. Sus URLs y visibilidad se controlan desde Firestore mediante `instagramUrl`, `facebookUrl`, `showInstagram` y `showFacebook`.


## Diagnóstico de reproducción

Esta edición permite streams HTTP en Android y muestra el detalle técnico de errores HLS. Para `.m3u8`, el servidor debe permitir CORS en la lista, variantes, claves y segmentos. Un `.ts` directo no equivale a una transmisión HLS completa y puede no reproducirse en todos los dispositivos.
