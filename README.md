# Logos ERACIS Plus

**Colocar los logos de la ERACIS nunca ha sido tan fácil.**

Logos ERACIS Plus es una aplicación de escritorio para preparar fotografías y páginas PDF con el faldón de logotipos institucionales y la Marca ERACIS+. Está pensada para facilitar la creación de materiales de difusión, publicaciones para redes sociales y documentos del proyecto.

Permite componer y revisar el resultado antes de guardarlo, tanto para un archivo individual como para un lote. Las imágenes y los documentos se procesan en el propio ordenador, sin enviarlos a Internet.

## Descargar

**[Descargar el instalador para Windows de 64 bits](https://github.com/JavierGonzalezMarti/Logos-ERACIS-Plus/releases/latest/download/Logos-ERACIS-Plus-Windows-x64.exe)**

También puedes consultar la [página de descargas](https://github.com/JavierGonzalezMarti/Logos-ERACIS-Plus/releases/latest), que incluye la suma SHA-256 para comprobar la integridad del archivo. Para instalar el programa, descarga el `.exe`; los archivos «Source code» contienen el código fuente.

## Qué puedes hacer

- **Añadir un faldón de logos:** cargar tu imagen de logotipos y colocarla arriba o abajo, superpuesta a la fotografía o fuera de ella.
- **Incluir la Marca ERACIS+:** elegir entre ocho variantes, moverla y ajustar su tamaño manteniendo las proporciones. Puede mostrarse sin fondo o con fondo blanco rectangular o circular.
- **Preparar publicaciones para redes sociales:** elegir formatos de Instagram y Facebook o conservar el formato original.
- **Ajustar el encuadre y añadir una fecha:** adaptar la composición y personalizar la presentación de la fecha.
- **Trabajar con imágenes y PDF:** admite formatos habituales de imagen y conversión de fotografías HEIC/HEIF.
- **Procesar lotes:** aplicar la composición a un máximo de 50 elementos o páginas.
- **Exportar el resultado:** guardar en PNG, JPG o PDF y descargar las salidas de un lote en ZIP.

## Cómo se utiliza

1. Abre una imagen o un PDF, o selecciona varios archivos para trabajar en lote.
2. Carga el faldón de logotipos que quieras incorporar.
3. Elige el formato de salida, ajusta el encuadre y coloca el faldón.
4. Si lo necesitas, añade una fecha y una variante de la Marca ERACIS+.
5. Revisa la vista previa y guarda el resultado en el formato elegido.

El faldón cargado se conserva en los datos locales de la aplicación hasta que lo retires. La Marca ERACIS+ y sus ajustes se mantienen durante la sesión y se eliminan al reiniciar el programa.

## Formatos y composición

| Formato | Dimensiones |
| --- | --- |
| Instagram vertical, 4:5 | 1080 × 1350 px |
| Facebook horizontal | 1470 × 1080 px |
| Facebook vertical | 1080 × 1350 px |
| Formato original | Según la imagen de entrada |

El formato Facebook horizontal utiliza 1470 × 1080 px (49:36), la proporción comprobada por la asociación en su muro.

En los formatos de tamaño fijo, colocar el faldón fuera de la fotografía reserva espacio para él sin cambiar las dimensiones finales. En el formato original, esta opción conserva la fotografía completa y amplía la altura para añadir el faldón.

El editor de la Marca ERACIS+ permite arrastrarla y escalarla dentro de la fotografía. Al aceptar, la composición se aplica a la vista previa y a las exportaciones individuales o por lotes.

## Instalación en Windows

Ejecuta el instalador y sigue las instrucciones en español. La presentación muestra el cartel institucional y la información de autoría y licencia. La ventana se adapta al 80 % de la altura útil del monitor y aparece centrada.

La aplicación utiliza el icono del marco verde con el signo «+». El instalador se distingue por una insignia con una flecha de instalación.

## Desarrollo

El proyecto utiliza TypeScript, Vite y Tauri. Para trabajar con el código necesitas:

- Node.js y npm.
- Rust estable.
- En Windows: destino Rust MSVC, Visual Studio Build Tools con **Desktop development with C++** y WebView2 Runtime.
- En macOS: Xcode Command Line Tools y los destinos Rust correspondientes a la arquitectura que quieras compilar.

### Ejecutar y compilar

```sh
npm ci
npm run tauri -- dev
npm run tauri -- build
```

El instalador de Windows se genera en `src-tauri/target/release/bundle/nsis/`.

Para compilar un paquete universal de macOS, ejecuta en un Mac:

```sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npm run tauri -- build --target universal-apple-darwin
```

### Comprobaciones

```sh
npm test
```

Para comprobar la interfaz y los archivos exportados de extremo a extremo, inicia `npm run dev` en una terminal y ejecuta `npm run test:e2e` en otra. Estas pruebas utilizan Chrome instalado y guardan sus resultados temporales en `tests/output/`. Las fotografías privadas de prueba deben colocarse en `tests/private-fixtures/`, que está excluida de Git.

### Organización del código

| Carpeta | Contenido |
| --- | --- |
| `src/assets/` | Recursos institucionales y variantes de la Marca ERACIS+ |
| `src/import/` | Lectura de imágenes, HEIC/HEIF, metadatos y PDF |
| `src/processing/` | Composición de imagen, faldón, marca y fecha |
| `src/export/` | Generación de PNG, JPG, PDF y ZIP |
| `src/platform/` | Integración con el sistema y almacenamiento local |
| `src/state/` | Estado de la aplicación y ajustes |
| `src/ui/` | Interfaz y editor de la marca |
| `src-tauri/` | Aplicación de escritorio y configuración de Tauri |
| `src-tauri/windows/` | Plantilla y recursos del instalador de Windows |
| `reference/` | Documento HTML de origen del proyecto |

## Autoría y licencia

Desarrollado por **Javier González Martí**, Técnico de Dinamización Comunitaria ERACIS Plus, de la **Asociación para la mediación social EQUA**.

El proyecto se distribuye bajo **Creative Commons Atribución-NoComercial 4.0 Internacional (CC BY-NC 4.0)**. Consulta [LICENSE.md](LICENSE.md) para conocer las condiciones de uso y atribución.
