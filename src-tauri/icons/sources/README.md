# Iconos oficiales de Windows

La propuesta 4 (marco verde, signo + y fald贸n sobre baldosa crema) es el icono oficial de la aplicaci贸n en Windows. El instalador a帽ade una insignia con flecha hacia una bandeja.

Fuentes PNG transparentes generadas con la herramienta integrada image_gen:
- app-windows.png: conservar el marco, +, fald贸n y baldosa de la propuesta 4; eliminar el fondo exterior a transparencia; sin texto.
- installer-windows.png: conservar el icono oficial y a帽adir una insignia circular verde inferior derecha con flecha blanca hacia una bandeja; sin tapar el +; exterior transparente.

La configuraci贸n tauri.windows.conf.json usa los recursos icons/windows para el ejecutable y accesos directos, installer.ico para NSIS e icon.ico para el desinstalador.

Para regenerar los recursos desde la ra铆z del proyecto:

    npx tauri icon src-tauri/icons/sources/app-windows.png --output tmp/icon-app
    npx tauri icon src-tauri/icons/sources/installer-windows.png --output tmp/icon-installer

Copiar icon.ico, 32x32.png, 128x128.png y 128x128@2x.png de tmp/icon-app a src-tauri/icons/windows; copiar tmp/icon-installer/icon.ico como src-tauri/icons/windows/installer.ico.

Compilar con npm run tauri -- build --bundles nsis. Windows puede conservar en cach茅 el icono de accesos directos anteriores; los accesos directos nuevos apuntan al recurso del ejecutable instalado.


Los accesos directos de Windows referencian expl韈itamente app-green-v1.ico, instalado como recurso en la carpeta del programa. El instalador refresca tambi閚 los accesos directos existentes. Al regenerar el icono oficial, actualizar igualmente icons/windows/app-green-v1.ico.
