# Configuración dinámica de FutboLike

En Firestore usa la ruta:

`channels / futbolike`

Campos recomendados:

| Campo | Tipo | Ejemplo |
|---|---|---|
| channelName | string | FutboLike |
| welcomeMessage | string | Bienvenidos a FutboLike, búscanos en redes sociales |
| buttonText | string | Ver Canal |
| streamUrl | string | https://servidor.com/canal.m3u8 |
| streamType | string | m3u8 |
| online | boolean | true |
| offlineMessage | string | El canal se encuentra temporalmente fuera de servicio |
| liveText | string | ● EN VIVO |
| logoUrl | string | https://.../logo.png |
| backgroundUrl | string | https://.../fondo.jpg |
| primaryColor | string | #22c55e |

## Qué se actualiza sin generar otra APK

Después de instalar una APK configurada con tu proyecto Firebase, puedes cambiar todos los campos anteriores desde Firestore. La aplicación recibe los cambios en tiempo real.

Solo debes generar otra APK si modificas el código, el identificador de la app, las credenciales de Firebase, permisos de Android, icono nativo o nombre instalado.

## Imágenes

`logoUrl` y `backgroundUrl` deben ser URLs directas accesibles por HTTPS. Puedes usar Firebase Storage, pero el archivo debe tener permiso de lectura pública o una URL de descarga válida.

Si una imagen falla, la app conserva el fondo predeterminado y muestra un balón como logo de respaldo.


## Botones de redes sociales

Agrega estos campos al documento `channels/futbolike`:

- `socialMessage` (string): `Síguenos en redes sociales`
- `instagramUrl` (string): enlace completo de Instagram, por ejemplo `https://www.instagram.com/tu_pagina/`
- `facebookUrl` (string): enlace completo de Facebook, por ejemplo `https://www.facebook.com/tu_pagina/`
- `showInstagram` (boolean): `true` para mostrar el botón o `false` para ocultarlo
- `showFacebook` (boolean): `true` para mostrar el botón o `false` para ocultarlo

Si una URL está vacía o no es válida, el botón correspondiente se oculta automáticamente. Estos valores se actualizan desde Firebase sin generar una nueva APK.
