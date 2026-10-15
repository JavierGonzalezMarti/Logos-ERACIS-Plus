# Presentación del instalador de Windows

El cartel `presentacion-vertical.png` se obtuvo de la primera página de `ERACIS A4 VERTICAL actualizado marca eracis.pdf`, proporcionado por el usuario. La conversión con Poppler a 2200 píxeles de alto produce 1556 × 2200 píxeles. `presentacion-vertical.bmp` es la misma imagen en RGB para NSIS.

La plantilla consulta el área de trabajo del monitor más cercano mediante MonitorFromWindow y GetMonitorInfoW. La altura exterior es el 70 % del alto útil, excluida la barra de tareas. La ventana se centra en los dos ejes; el ancho es el 90 % de su alto, limitado al 90 % del ancho útil.

El cartel se ajusta al espacio de presentación sin recorte ni deformación. GDI HALFTONE suaviza la reducción de la imagen a la resolución y escala DPI del equipo. Los botones quedan anclados en la parte inferior derecha. La información de autoría y licencia se mantiene en la segunda página.

Empaquetado después de compilar la aplicación: `npx tauri bundle --bundles nsis`.
