# A po tu le da?

Una app de **Yandel Diaz** para guardar videos de TikTok, Instagram y YouTube.

Pega un enlace, elige dónde guardarlo y dale a descargar. Cada plataforma tiene su pestaña. En TikTok la app reconoce si pegaste un video o un perfil y selecciona la opción correspondiente.

## Qué puedes hacer

- Descargar hasta cuatro videos a la vez.
- Elegir automáticamente la mejor calidad que ofrezca el sitio, incluidos 120 fps si están disponibles.
- Ver el progreso, la velocidad y el tiempo restante.
- Continuar descargas parciales cuando el servidor lo permite.
- Reconocer los videos que ya están guardados.
- Ver los errores en una sección abierta para saber qué necesita atención.

El ajuste **Uso de red ×5** permite descargar hasta cinco fragmentos en paralelo por video compatible. La velocidad final depende de la conexión y del sitio.

## Abrirla desde el código

Necesitas Node.js LTS, yt-dlp y FFmpeg.

En Mac, si tienes Homebrew, puedes instalarlos con este comando.

```sh
brew install node yt-dlp ffmpeg
```

En Windows, instala Node.js LTS y las herramientas desde PowerShell.

```powershell
winget install --exact --id OpenJS.NodeJS.LTS
winget install --exact --id yt-dlp.yt-dlp
winget install --exact --id Gyan.FFmpeg
```

Después, abre una terminal nueva en la carpeta del proyecto y ejecuta estos dos comandos.

```sh
npm ci
npm start
```

La app se abrirá en una ventana. Por defecto, guarda los archivos en **Descargas/A po tu le da**.

## Crear un paquete

Coloca yt-dlp, FFmpeg y FFprobe en una carpeta llamada `tools` dentro del proyecto. Usa los ejecutables compatibles con tu sistema. En Windows llevan la extensión `.exe`.

En un Mac con Apple Silicon, ejecuta este comando.

```sh
npm run pack -- --mac zip --arm64 --publish never
```

En Windows de 64 bits, ejecuta este otro.

```sh
npm run pack -- --win portable --x64 --publish never
```

Los paquetes se guardan en `dist`. Las descargas se han probado en Mac. La versión de Windows queda pendiente de prueba en un equipo con Windows.

## Privacidad

La app usa HTTPS y mantiene el historial de la sesión en memoria. Las descargas interrumpidas pueden dejar archivos parciales para poder continuar después. La plataforma sigue viendo tu IP y puede limitar el acceso.

Descarga contenido que tengas permiso de guardar.

## Licencia

Copyright © 2026 **Yandel Diaz**. El código de la aplicación se publica bajo [licencia MIT](LICENSE). Las herramientas utilizadas conservan sus [licencias](THIRD_PARTY_NOTICES.md).
