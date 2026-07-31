# Crear FutboLike APK usando solamente un teléfono Android

## 1. Crear el repositorio

1. Entra a GitHub desde Chrome.
2. Crea un repositorio nuevo llamado `FutboLike-App`.
3. Déjalo público o privado.
4. Activa la opción para crear un archivo README solo si subirás los archivos manualmente.

## 2. Subir el proyecto

La forma más sencilla desde Android es descomprimir este ZIP con la aplicación Archivos o ZArchiver y subir los archivos al repositorio. Es importante conservar estas carpetas:

- `.github/workflows/`
- `scripts/`
- `www/`
- `android-snippets/`

El archivo `.github/workflows/build-android.yml` es el que ordena a GitHub generar el APK.

## 3. Configurar Firebase

Edita en GitHub el archivo:

`www/js/firebase-config.js`

Reemplaza todos los valores `REEMPLAZAR` con la configuración de tu aplicación web de Firebase. Luego guarda usando **Commit changes**.

En Firestore crea:

- Colección: `channels`
- Documento: `futbolike`

Campos:

- `channelName` — texto — `FutboLike`
- `streamUrl` — texto — URL HTTPS del `.m3u8`
- `streamType` — texto — `m3u8`
- `online` — booleano — `true`
- `offlineMessage` — texto — `El canal se encuentra temporalmente fuera de servicio`

## 4. Generar el APK

1. Abre el repositorio en GitHub.
2. Entra en **Actions**.
3. Abre **Generar APK FutboLike**.
4. Pulsa **Run workflow**.
5. Selecciona la rama `main` y vuelve a pulsar **Run workflow**.
6. Cuando aparezca el símbolo verde, abre la ejecución.
7. Baja hasta **Artifacts**.
8. Descarga `FutboLike-APK`.
9. Descomprime el archivo descargado e instala `app-debug.apk`.

Android puede solicitar autorización para instalar aplicaciones desde Chrome o Archivos.

## 5. Cambiar el canal después

No necesitas crear otro APK. En Firebase cambia únicamente `streamUrl`. Las aplicaciones abiertas recibirán el enlace nuevo automáticamente.

## Importante

- Usa una URL `.m3u8` HTTPS.
- El servidor debe permitir reproducción desde una aplicación WebView y solicitudes CORS.
- El primer APK será una versión de prueba firmada por GitHub. Para Google Play se necesitará generar un AAB de lanzamiento y guardar una clave de firma de manera segura.
