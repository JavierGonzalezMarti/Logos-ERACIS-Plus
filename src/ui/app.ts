import { generateOutput } from '../export/output';
import {
  expandBackgroundFiles, firstBackgroundAsset, imageFromFile,
  isImageFile, isSupportedBackgroundFile, loadBackgroundImage, photoDate, thumbnailDataUrl,
  type BackgroundAsset,
} from '../import/media';
import { canvasDimensions, compositionLayout, renderComposition, sourceWindow } from '../processing/compositor';
import { openExternalUrl, saveOutput } from '../platform/desktop';
import { forgetLogo, rememberLogo, restoreLogo } from '../platform/logoStore';
import { openMarkEditor } from './markEditor';
import { initialState, MAX_BATCH_ITEMS, type AppState, type Format, type TimestampPosition } from '../state/model';

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Falta el control ${id} en la interfaz.`);
  return found as T;
}

function selected(group: string, activeId: string): void {
  document.querySelectorAll<HTMLElement>(group).forEach((button) => {
    const active = button.id === activeId;
    button.classList.toggle('active-button', active);
    if (button.getAttribute('role') === 'radio') button.setAttribute('aria-checked', String(active));
  });
}

function showZoneMessage(zone: HTMLElement, message: string): void {
  const field = zone.querySelector<HTMLElement>('.error-message');
  if (!field) return;
  field.textContent = message;
  field.style.display = 'block';
  setTimeout(() => { if (field.textContent === message) field.style.display = 'none'; }, 5000);
}

function setThumbnail(zone: HTMLElement, url: string, label: string): void {
  zone.querySelectorAll('.thumbnail').forEach((node) => node.remove());
  const thumb = document.createElement('img');
  thumb.className = 'thumbnail';
  thumb.src = url;
  thumb.alt = label;
  zone.appendChild(thumb);
  zone.querySelectorAll<HTMLElement>('svg, p:not(.error-message), .file-wrapper').forEach((node) => {
    node.style.display = 'none';
  });
  zone.querySelectorAll<HTMLElement>('.error-message').forEach((node) => { node.style.display = 'none'; });
  zone.classList.add('preview-active');
  zone.setAttribute('aria-label', label);
}

function resetZone(zone: HTMLElement, label: string): void {
  zone.querySelectorAll('.thumbnail').forEach((node) => node.remove());
  zone.querySelectorAll<HTMLElement>('svg, p:not(.error-message), .file-wrapper').forEach((node) => {
    node.style.display = '';
  });
  zone.classList.remove('preview-active');
  zone.setAttribute('aria-label', label);
}

const RESOURCE_URLS: Record<string, string> = {
  'btn-como-usar': 'https://asociacionequa.org/como-usar-herramienta-logos-eracis/',
  'btn-ultima-version': 'https://asociacionequa.org/historial-de-versiones-herramiento-logos-eracis/',
  'btn-codigo-fuente': 'https://asociacionequa.org/codigo-fuente-de-la-herramienta-de-colocacion-de-logos-para-eracis/',
  'btn-contacto': 'https://forms.gle/y6APWJGBTukBFrxK7',
};

export function createApp(): void {
  const state: AppState = initialState();
  const canvas = element<HTMLCanvasElement>('canvas');
  const baseDrop = element<HTMLElement>('base-drop');
  const logoDrop = element<HTMLElement>('logo-drop');
  const baseInput = element<HTMLInputElement>('base-input');
  const logoInput = element<HTMLInputElement>('logo-input');
  const batchInput = element<HTMLInputElement>('batch-input');
  const downloadButton = element<HTMLButtonElement>('download-btn');
  const cropButton = element<HTMLButtonElement>('btn-crop-toggle');
  const cropOkButton = element<HTMLButtonElement>('btn-crop-ok');
  const pdfHeaderOption = element<HTMLElement>('pdf-header-option');
  const pdfHeaderCheckbox = element<HTMLInputElement>('pdf-header-checkbox');
  const batchStatus = element<HTMLElement>('imagenes-cargadas');
  const batchMessage = element<HTMLElement>('mensaje-cantidad');
  const logoDefaultLabel = logoDrop.getAttribute('aria-label') || 'Faldón de logos';
  const status = document.createElement('p');
  status.id = 'app-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  document.querySelector('.resources-buttons')?.before(status);

  const announce = (message: string, error = false) => {
    status.textContent = message;
    status.className = error ? 'app-error' : 'app-success';
  };

  const updatePreview = () => {
    const dimensions = canvasDimensions(state.baseImage, state.logoImage, state);
    document.documentElement.style.setProperty('--canvas-ar', `${dimensions.width} / ${dimensions.height}`);
    renderComposition(canvas, state.baseImage, state.logoImage, state.baseDate, state, state.eracisMarkImage);
    refreshControls();
  };

  const refreshControls = () => {
    const hasBase = !!state.baseImage;
    const batch = state.batchCount > 1;
    const overLimit = state.batchCount > MAX_BATCH_ITEMS;
    const blocked = state.busy || state.cropMode || overLimit || !hasBase;
    downloadButton.disabled = blocked;
    downloadButton.setAttribute('aria-busy', String(state.busy));
    if (!state.busy) downloadButton.textContent = batch && !overLimit
      ? 'Descargar el lote en formato ZIP' : 'Descargar imagen resultante';
    pdfHeaderOption.style.display = state.outputFormat === 'pdf' && state.logoImage ? 'flex' : 'none';
    pdfHeaderOption.setAttribute('aria-hidden', String(!(state.outputFormat === 'pdf' && state.logoImage)));
    if (state.outputFormat !== 'pdf' || !state.logoImage) {
      state.includePdfHeader = false;
      pdfHeaderCheckbox.checked = false;
    }
    const original = state.format === 'original';
    document.querySelectorAll<HTMLButtonElement>('.fit-button').forEach((button) => {
      button.disabled = original;
      button.setAttribute('aria-disabled', String(original));
    });
    cropButton.disabled = original || state.cropMode || !hasBase;
    element<HTMLButtonElement>('mark-add').hidden = !!state.eracisMark;
    element<HTMLButtonElement>('mark-add').disabled = blocked;
    element<HTMLButtonElement>('mark-edit').hidden = !state.eracisMark;
    element<HTMLButtonElement>('mark-edit').disabled = blocked;
    element<HTMLButtonElement>('mark-remove').hidden = !state.eracisMark;
    element<HTMLButtonElement>('mark-remove').disabled = state.busy;
    document.querySelectorAll<HTMLButtonElement>('#timestamp-color-group button, #timestamp-background-group button, #timestamp-position-group button').forEach((button) => {
      button.disabled = !state.timestampEnabled;
      button.setAttribute('aria-disabled', String(!state.timestampEnabled));
    });
    element<HTMLButtonElement>('base-load-btn').disabled = batch;
    baseInput.disabled = batch;
    baseDrop.classList.toggle('disabled', batch);
    baseDrop.style.pointerEvents = batch ? 'none' : '';
    baseDrop.style.opacity = batch ? '0.5' : '';
  };

  const setBusy = (busy: boolean, message?: string) => {
    state.busy = busy;
    if (busy && message) downloadButton.textContent = message;
    refreshControls();
  };

  const clearBatch = () => {
    state.batchAssets = [];
    state.batchCount = 0;
    batchInput.value = '';
    batchStatus.textContent = '';
    batchMessage.textContent = '';
    batchStatus.classList.remove('alerta-exceso');
  };

  const setBase = async (asset: BackgroundAsset, image: HTMLImageElement) => {
    state.baseAsset = asset;
    state.baseImage = image;
    state.baseDate = await photoDate(asset.file);
    state.panX = state.panY = 0.5;
    setThumbnail(baseDrop, thumbnailDataUrl(image), asset.kind === 'pdf'
      ? `PDF cargado como imagen: ${asset.displayName}` : 'Imagen base cargada');
    updatePreview();
  };

  const loadBase = async (file: File) => {
    if (!isSupportedBackgroundFile(file)) {
      showZoneMessage(baseDrop, 'Por favor, selecciona una imagen o un PDF válido.');
      return;
    }
    setBusy(true, 'Cargando imagen...');
    try {
      const asset = await firstBackgroundAsset(file);
      const image = await loadBackgroundImage(asset);
      clearBatch();
      await setBase(asset, image);
      announce(`${asset.displayName} cargado.`);
    } catch (error) {
      showZoneMessage(baseDrop, error instanceof Error ? error.message : 'No se pudo cargar el fondo.');
    } finally { setBusy(false); }
  };

  const setLogo = (image: HTMLImageElement, dataUrl: string) => {
    state.logoImage = image;
    state.logoDataUrl = dataUrl;
    setThumbnail(logoDrop, dataUrl, 'Faldón de logos cargado');
    if (!document.getElementById('logo-remove-btn')) {
      const remove = document.createElement('button');
      remove.id = 'logo-remove-btn';
      remove.type = 'button';
      remove.className = 'remove-logo-btn';
      remove.textContent = 'X';
      remove.setAttribute('aria-label', 'Eliminar faldón de logos');
      remove.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        try {
          await forgetLogo();
        } catch (error) {
          announce(error instanceof Error ? error.message : 'No se pudo eliminar el faldón guardado.', true);
          return;
        }
        state.logoImage = null;
        state.logoDataUrl = null;
        logoInput.value = '';
        remove.remove();
        resetZone(logoDrop, logoDefaultLabel);
        updatePreview();
      });
      logoDrop.appendChild(remove);
    }
    updatePreview();
  };

  const loadLogo = async (file: File) => {
    if (!isImageFile(file)) {
      showZoneMessage(logoDrop, 'Por favor, selecciona una imagen válida.');
      return;
    }
    try {
      const image = await imageFromFile(file);
      const dataUrl = await rememberLogo(image);
      setLogo(image, dataUrl);
      announce('Faldón de logos cargado y guardado.');
    } catch (error) {
      showZoneMessage(logoDrop, error instanceof Error ? error.message : 'No se pudo cargar el faldón.');
    }
  };

  const loadBatch = async (files: File[]) => {
    if (!files.length) return;
    setBusy(true, 'Preparando archivos...');
    try {
      const result = await expandBackgroundFiles(files);
      state.batchAssets = result.assets;
      state.batchCount = result.totalCount;
      const noun = result.totalCount === 1 ? 'elemento' : 'elementos';
      batchStatus.textContent = result.totalCount ? `Se han cargado ${result.totalCount} ${noun}.` : '';
      batchStatus.classList.toggle('alerta-exceso', result.totalCount > MAX_BATCH_ITEMS);
      batchMessage.textContent = result.totalCount > MAX_BATCH_ITEMS
        ? `El límite es de ${MAX_BATCH_ITEMS} páginas o imágenes. Reduce la selección para continuar.` : '';
      if (result.errors.length) showZoneMessage(element('batch-input-group'), result.errors[0]);
      if (!result.assets.length) throw new Error('No se encontró ninguna imagen o página PDF válida.');
      const first = result.assets[0];
      await setBase(first, await loadBackgroundImage(first));
      if (result.totalCount > 1) baseDrop.querySelector<HTMLElement>('.thumbnail')?.style.setProperty('display', 'none');
      announce(`${result.totalCount} ${noun} preparado${result.totalCount === 1 ? '' : 's'}.`);
    } catch (error) {
      clearBatch();
      showZoneMessage(element('batch-input-group'), error instanceof Error ? error.message : 'No se pudo preparar el lote.');
    } finally { setBusy(false); }
  };

  element<HTMLButtonElement>('base-load-btn').addEventListener('click', () => baseInput.click());
  element<HTMLButtonElement>('logo-load-btn').addEventListener('click', () => logoInput.click());
  element<HTMLButtonElement>('batch-load-btn').addEventListener('click', () => batchInput.click());
  baseInput.addEventListener('change', () => { if (baseInput.files?.[0]) void loadBase(baseInput.files[0]); });
  logoInput.addEventListener('change', () => { if (logoInput.files?.[0]) void loadLogo(logoInput.files[0]); });
  batchInput.addEventListener('change', () => void loadBatch(Array.from(batchInput.files || [])));

  const bindDrop = (zone: HTMLElement, handler: (file: File) => Promise<void>) => {
    zone.addEventListener('dragenter', (event) => { event.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragover', (event) => event.preventDefault());
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (event) => {
      event.preventDefault();
      zone.classList.remove('dragover');
      if (event.dataTransfer?.files[0]) void handler(event.dataTransfer.files[0]);
    });
  };
  bindDrop(baseDrop, loadBase);
  bindDrop(logoDrop, loadLogo);
  const bindKeyboardFile = (zone: HTMLElement, input: HTMLInputElement) => zone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input.click(); }
  });
  bindKeyboardFile(baseDrop, baseInput);
  bindKeyboardFile(logoDrop, logoInput);

  const FORMAT_BY_ID: Record<string, Format> = {
    'format-horizontal': 'horizontal', 'format-square': 'square',
    'format-vertical': 'vertical', 'format-4by3': 'four-three',
    'format-instagram': 'instagram', 'format-facebook': 'facebook',
    'format-facebook-vertical': 'facebook-vertical',
    'format-original': 'original',
  };
  document.querySelectorAll<HTMLButtonElement>('.format-button').forEach((button) => button.addEventListener('click', () => {
    state.format = FORMAT_BY_ID[button.id];
    state.panX = state.panY = 0.5;
    if (state.format === 'original') closeCrop();
    selected('.format-button', button.id);
    updatePreview();
  }));
  document.querySelectorAll<HTMLButtonElement>('.fit-button').forEach((button) => button.addEventListener('click', () => {
    state.fitMode = button.dataset.mode === 'stretch' ? 'stretch' : 'crop';
    state.panX = state.panY = 0.5;
    selected('.fit-button', button.id);
    updatePreview();
  }));
  document.querySelectorAll<HTMLButtonElement>('.position-button').forEach((button) => button.addEventListener('click', () => {
    state.logoPosition = button.dataset.pos === 'top' ? 'top' : 'bottom';
    selected('.position-button', button.id);
    updatePreview();
  }));
  for (const placement of ['inside', 'outside'] as const) element<HTMLButtonElement>(`logo-${placement}`).addEventListener('click', () => {
    state.logoPlacement = placement;
    state.panX = state.panY = 0.5;
    selected('.logo-placement-button', `logo-${placement}`);
    updatePreview();
  });
  document.querySelectorAll<HTMLButtonElement>('.output-format-button').forEach((button) => button.addEventListener('click', () => {
    state.outputFormat = button.dataset.format === 'jpg' ? 'jpg' : button.dataset.format === 'pdf' ? 'pdf' : 'png';
    selected('.output-format-button', button.id);
    refreshControls();
  }));

  const toggleTimestamp = (enabled: boolean) => {
    state.timestampEnabled = enabled;
    element('ts-yes').classList.toggle('active-button', enabled);
    element('ts-no').classList.toggle('active-button', !enabled);
    updatePreview();
  };
  element('ts-yes').addEventListener('click', () => toggleTimestamp(true));
  element('ts-no').addEventListener('click', () => toggleTimestamp(false));
  for (const color of ['white', 'black'] as const) element(`ts-${color}`).addEventListener('click', () => {
    state.timestampColor = color;
    selected('#timestamp-color-group button', `ts-${color}`);
    updatePreview();
  });
  for (const background of ['none', 'white', 'black'] as const) {
    const id = background === 'none' ? 'ts-bg-none' : `ts-bg-${background}`;
    element(id).addEventListener('click', () => {
      state.timestampBackground = background;
      selected('#timestamp-background-group button', id);
      updatePreview();
    });
  }
  for (const position of ['tl', 'tr', 'bl', 'br'] as TimestampPosition[]) element(`ts-pos-${position}`).addEventListener('click', () => {
    state.timestampPosition = position;
    selected('#timestamp-position-group button', `ts-pos-${position}`);
    updatePreview();
  });
  pdfHeaderCheckbox.addEventListener('change', () => { state.includePdfHeader = pdfHeaderCheckbox.checked; });

  const closeCrop = () => {
    state.cropMode = false;
    canvas.classList.remove('crop-mode', 'dragging');
    cropOkButton.style.display = 'none';
    cropButton.setAttribute('aria-pressed', 'false');
    refreshControls();
  };
  const openCrop = () => {
    if (!state.baseImage || state.format === 'original') return;
    state.fitMode = 'crop';
    selected('.fit-button', 'fit-crop');
    state.cropMode = true;
    canvas.classList.add('crop-mode');
    cropOkButton.style.display = '';
    cropButton.setAttribute('aria-pressed', 'true');
    refreshControls();
    updatePreview();
  };
  cropButton.addEventListener('click', openCrop);
  cropOkButton.addEventListener('click', closeCrop);
  const editMark = () => {
    if (!state.baseImage || state.busy) return;
    if (state.cropMode) closeCrop();
    void openMarkEditor(state, (mark, image) => {
      state.eracisMark = mark;
      state.eracisMarkImage = image;
      updatePreview();
      announce('Marca ERACIS+ añadida.');
    }).catch((error) => announce(error instanceof Error ? error.message : 'No se pudo abrir la Marca ERACIS+.', true));
  };
  element('mark-add').addEventListener('click', editMark);
  element('mark-edit').addEventListener('click', editMark);
  element('mark-remove').addEventListener('click', () => {
    state.eracisMark = null;
    state.eracisMarkImage = null;
    updatePreview();
    announce('Marca ERACIS+ quitada.');
  });
  canvas.addEventListener('dblclick', () => state.cropMode ? closeCrop() : openCrop());
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && state.cropMode) closeCrop(); });

  let drag: { x: number; y: number; sourceX: number; sourceY: number } | null = null;
  let renderScheduled = false;
  canvas.addEventListener('pointerdown', (event) => {
    if (!state.cropMode || !state.baseImage) return;
    const bounds = canvas.getBoundingClientRect();
    const layout = compositionLayout(state.baseImage, state.logoImage, state);
    const canvasY = (event.clientY - bounds.top) * layout.height / bounds.height;
    if (canvasY < layout.photoTop || canvasY > layout.photoTop + layout.photoHeight) return;
    const geometry = sourceWindow(state.baseImage, layout);
    drag = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      sourceX: geometry.maxSX * state.panX,
      sourceY: geometry.maxSY * state.panY,
    };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag || !state.cropMode || !state.baseImage) return;
    const bounds = canvas.getBoundingClientRect();
    const geometry = sourceWindow(state.baseImage, compositionLayout(state.baseImage, state.logoImage, state));
    const dx = event.clientX - bounds.left - drag.x;
    const dy = event.clientY - bounds.top - drag.y;
    const sx = Math.min(geometry.maxSX, Math.max(0, drag.sourceX - dx * geometry.sw / bounds.width));
    const sy = Math.min(geometry.maxSY, Math.max(0, drag.sourceY - dy * geometry.sh / (bounds.height * geometry.visibleHeight / canvas.height)));
    state.panX = geometry.maxSX ? sx / geometry.maxSX : 0.5;
    state.panY = geometry.maxSY ? sy / geometry.maxSY : 0.5;
    if (!renderScheduled) {
      renderScheduled = true;
      requestAnimationFrame(() => { renderScheduled = false; updatePreview(); });
    }
  });
  const endDrag = () => { drag = null; canvas.classList.remove('dragging'); };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  downloadButton.addEventListener('click', async () => {
    if (downloadButton.disabled) return;
    setBusy(true, 'Procesando archivos...');
    try {
      const output = await generateOutput(state, (done, total) => {
        downloadButton.textContent = `Procesando ${done}/${total}...`;
      });
      const saved = await saveOutput(output);
      if (saved) announce(`Archivo guardado: ${output.filename}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el resultado.';
      announce(message, true);
      console.error(error);
    } finally { setBusy(false); }
  });

  for (const [id, url] of Object.entries(RESOURCE_URLS)) element(id).addEventListener('click', () => {
    void openExternalUrl(url).catch((error) => announce(String(error), true));
  });
  document.querySelectorAll<HTMLAnchorElement>('a.external-link').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    void openExternalUrl(link.href).catch((error) => announce(String(error), true));
  }));
  element('boton-reiniciar').addEventListener('click', () => location.reload());
  element('version-app-line').textContent = 'Versión 0.86.0';

  void restoreLogo().then((saved) => { if (saved) setLogo(saved.image, saved.dataUrl); });
  refreshControls();
  updatePreview();
}
