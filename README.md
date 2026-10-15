# Logos ERACIS Plus

Aplicación de escritorio basada en el HTML 0.82 de Javier González Martí para colocar el faldón de logos ERACIS Plus en imágenes y páginas PDF. Los datos se procesan localmente. La cabecera institucional superior está incluida en el paquete, no se puede cambiar y se desplaza con la página. El faldón que aporta el usuario se conserva en los datos locales de la aplicación hasta que lo quite.

Entre los formatos de salida se incluyen Instagram 4:5 (1080 × 1350 px), Facebook horizontal (1200 × 630 px) y Post de Facebook Vertical (1080 × 1350 px). Facebook admite imágenes con distintas proporciones; el formato vertical está pensado para fotos del feed, mientras que el horizontal ofrece una opción para publicaciones y enlaces compartidos.

El faldón puede superponerse dentro de la foto o colocarse fuera, pegado al borde superior o inferior. En los formatos de tamaño fijo, el archivo final mantiene las dimensiones elegidas y el modo exterior reserva espacio para la foto. En «Formato Original», el modo exterior conserva la foto completa y aumenta la altura del archivo para añadir el faldón.

La sección «Marca ERACIS+» ofrece ocho variantes transparentes incluidas en la aplicación. El editor permite situar una variante dentro de la zona de la foto, arrastrarla y escalarla sin cambiar su proporción. Aceptar aplica la marca a la vista previa y a PNG, JPG, PDF y lotes; Cancelar descarta los cambios. La marca permanece durante la sesión actual y se elimina al reiniciar.

En la versión 0.86.1, el editor muestra la composición con la misma proporción que la vista previa principal en todos los formatos y mantiene la marca dentro de la foto.

Desde la versión 0.87.0, la Marca ERACIS+ puede llevar un fondo blanco rectangular o circular, además de permanecer sin fondo. El margen blanco es proporcional al logo y se escala con él. Si el fondo llega al borde de la foto, se recorta sin invadir el faldón exterior.

La versión 0.88.0 incorpora al instalador de Windows una presentación con la imagen institucional del proyecto, información de autoría, propósito y licencia. La interfaz del instalador se muestra en español e indica la versión instalada.

En Windows, el icono oficial de la aplicación es el marco verde con signo + y faldón sobre fondo crema (propuesta 4). El instalador utiliza una variante con insignia de instalación y flecha hacia abajo. Los recursos y su regeneración se documentan en `src-tauri/icons/sources/README.md`.

## Requisitos de desarrollo

- Node.js y npm
- Rust estable con destino MSVC
- Windows: Visual Studio 2022 Build Tools con el workload **Desktop development with C++** y WebView2 Runtime
- macOS: Xcode Command Line Tools y los destinos Rust de Intel y Apple Silicon

## Ejecutar y compilar

```sh
npm ci
npm run tauri -- dev
npm run tauri -- build
```

`npm test` comprueba el límite de lote, fechas y nombres. Para probar de extremo a extremo la interfaz y los archivos exportados, inicia `npm run dev` en otra terminal y ejecuta `npm run test:e2e`; usa Chrome instalado y guarda los resultados temporales en `tests/output/`. Las fotos privadas de prueba se colocan en `tests/private-fixtures/`, carpeta excluida de Git.

En Windows, `tauri build` crea un instalador NSIS en `src-tauri/target/release/bundle/nsis/`. Para preparar el paquete universal de macOS en un Mac, instalar ambos destinos Rust y ejecutar:

```sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npm run tauri -- build --target universal-apple-darwin
```

En un Mac Apple Silicon con macOS 27.0.1 se ha compilado el paquete universal 0.87.0 para `arm64` y `x86_64`. Se ha copiado la aplicación desde el DMG a una carpeta de pruebas y se ha abierto. También se ha comprobado la carga de una imagen y la exportación de un PNG mediante el diálogo nativo, y han pasado `npm test` (12 pruebas) y `npm run test:e2e` con Chrome. Queda pendiente probar la aplicación en un Mac Intel físico. Las compilaciones internas no llevan firma ni notarización.

El instalador NSIS se ha compilado, instalado y abierto en Windows 10 Pro 22H2. Queda por hacer la misma comprobación en Windows 11 y en un Mac Intel físico.

La prueba de conversión HEIC usa una muestra pública de forma local; la fecha y la orientación se han verificado además con una foto JPG de iPhone con EXIF. Aún falta repetir ambos controles con un HEIC original de iPhone cuando haya uno disponible.

## Estructura

| Ruta | Contenido |
| --- | --- |
| `reference/` | HTML original 0.82 sin modificar |
| `src/assets/` | Cabecera institucional y ocho variantes de la Marca ERACIS+ incluidas en el paquete |
| `src/import/` | Imágenes, HEIC/HEIF, EXIF y PDF de entrada |
| `src/processing/` | Composición de imagen, faldón y fecha |
| `src/export/` | PNG, JPG, PDF y ZIP |
| `src/platform/` | Diálogo de guardado, navegador del sistema y datos locales |
| `src/state/` | Modelo de estado y ajustes |
| `src/ui/` | Controles y retoques de escritorio |
| `src-tauri/` | Aplicación y permisos Tauri 2 |
| `src-tauri/windows/` | Plantilla NSIS y recursos locales del instalador en español |

`scripts/extract-legacy.mjs` permite volver a extraer el HTML y CSS desde la copia de referencia. La lógica nueva se mantiene en módulos TypeScript.

## Licencia

CC BY-NC 4.0. Véase [LICENSE.md](LICENSE.md).
