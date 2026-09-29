# Logos ERACIS Plus

Aplicación de escritorio basada en el HTML 0.82 de Javier González Martí para colocar el faldón de logos ERACIS Plus en imágenes y páginas PDF. Los datos se procesan localmente. La cabecera institucional superior está incluida en el paquete, es fija y permanece visible al desplazarse. El faldón que aporta el usuario se conserva en los datos locales de la aplicación hasta que lo quite.

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

La compilación y prueba en Mac Intel y Apple Silicon forman parte de la segunda fase. Las compilaciones internas no llevan firma ni notarización.

El instalador NSIS se ha compilado, instalado y abierto en Windows 10 Pro 22H2. Queda por hacer la misma comprobación en Windows 11 y en ambos tipos de Mac.

La prueba de conversión HEIC usa una muestra pública de forma local; la fecha y la orientación se han verificado además con una foto JPG de iPhone con EXIF. Aún falta repetir ambos controles con un HEIC original de iPhone cuando haya uno disponible.

## Estructura

| Ruta | Contenido |
| --- | --- |
| `reference/` | HTML original 0.82 sin modificar |
| `src/assets/` | Cabecera institucional incluida en el paquete |
| `src/import/` | Imágenes, HEIC/HEIF, EXIF y PDF de entrada |
| `src/processing/` | Composición de imagen, faldón y fecha |
| `src/export/` | PNG, JPG, PDF y ZIP |
| `src/platform/` | Diálogo de guardado, navegador del sistema y datos locales |
| `src/state/` | Modelo de estado y ajustes |
| `src/ui/` | Controles y retoques de escritorio |
| `src-tauri/` | Aplicación y permisos Tauri 2 |

`scripts/extract-legacy.mjs` permite volver a extraer el HTML y CSS desde la copia de referencia. La lógica nueva se mantiene en módulos TypeScript.

## Licencia

CC BY-NC 4.0. Véase [LICENSE.md](LICENSE.md).
