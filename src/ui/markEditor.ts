import type { AppState, EracisMark } from '../state/model';
import { compositionLayout, renderComposition } from '../processing/compositor';
import { initialMark, markRectangle, moveMark, resizeMark, type MarkCorner } from '../processing/markGeometry';

const variants = [
  ['horizontal', 'Horizontal', new URL('../assets/eracis/horizontal.png', import.meta.url).href],
  ['horizontal-lema', 'Horizontal con lema', new URL('../assets/eracis/horizontal-lema.png', import.meta.url).href],
  ['horizontal-denominacion', 'Horizontal con denominación', new URL('../assets/eracis/horizontal-denominacion.png', import.meta.url).href],
  ['horizontal-denominacion-lema', 'Horizontal con denominación y lema', new URL('../assets/eracis/horizontal-denominacion-lema.png', import.meta.url).href],
  ['vertical', 'Vertical', new URL('../assets/eracis/vertical.png', import.meta.url).href],
  ['vertical-lema', 'Vertical con lema', new URL('../assets/eracis/vertical-lema.png', import.meta.url).href],
  ['vertical-denominacion', 'Vertical con denominación', new URL('../assets/eracis/vertical-denominacion.png', import.meta.url).href],
  ['vertical-denominacion-lema', 'Vertical con denominación y lema', new URL('../assets/eracis/vertical-denominacion-lema.png', import.meta.url).href],
] as const;

export type MarkVariant = typeof variants[number][0];

const assets = new Map<string, HTMLImageElement>();

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo cargar una variante de la Marca ERACIS+.'));
    image.src = url;
  });
}

export async function loadMarkAssets(): Promise<void> {
  await Promise.all(variants.map(async ([id, , file]) => {
    if (!assets.has(id)) assets.set(id, await loadImage(file));
  }));
}

export function markAsset(variant: string): HTMLImageElement | null {
  return assets.get(variant) ?? null;
}

export async function openMarkEditor(state: AppState, onAccept: (mark: EracisMark, image: HTMLImageElement) => void): Promise<void> {
  if (!state.baseImage) return;
  await loadMarkAssets();
  const layout = compositionLayout(state.baseImage, state.logoImage, state);
  let draft = state.eracisMark ? { ...state.eracisMark } : null;
  const dialog = document.createElement('dialog');
  dialog.className = 'mark-dialog';
  dialog.setAttribute('aria-label', 'Editar Marca ERACIS+');
  dialog.innerHTML = `
    <div class="mark-editor">
      <aside class="mark-sidebar" aria-label="Variantes de Marca ERACIS+">
        <h2>Marca ERACIS+</h2>
        <p>Elige una variante y colócala sobre la foto.</p>
        <div class="mark-variants"></div>
      </aside>
      <div class="mark-workspace">
        <div class="mark-stage-container"><div class="mark-stage">
          <canvas class="mark-background" aria-label="Vista previa de la composición"></canvas>
          <div class="mark-box" role="img" aria-label="Marca ERACIS+; arrastra para mover" tabindex="0">
            <img alt="" draggable="false">
            <span class="mark-handle nw" data-corner="nw" role="button" aria-label="Escalar desde arriba a la izquierda"></span>
            <span class="mark-handle ne" data-corner="ne" role="button" aria-label="Escalar desde arriba a la derecha"></span>
            <span class="mark-handle sw" data-corner="sw" role="button" aria-label="Escalar desde abajo a la izquierda"></span>
            <span class="mark-handle se" data-corner="se" role="button" aria-label="Escalar desde abajo a la derecha"></span>
          </div>
        </div></div>
        <div class="mark-actions">
          <button type="button" class="mark-cancel">Cancelar</button>
          <button type="button" class="mark-accept">Aceptar</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(dialog);
  const canvas = dialog.querySelector<HTMLCanvasElement>('.mark-background')!;
  renderComposition(canvas, state.baseImage, state.logoImage, state.baseDate, state);
  const stage = dialog.querySelector<HTMLElement>('.mark-stage')!;
  const container = dialog.querySelector<HTMLElement>('.mark-stage-container')!;
  const box = dialog.querySelector<HTMLElement>('.mark-box')!;
  const markImg = box.querySelector<HTMLImageElement>('img')!;
  const accept = dialog.querySelector<HTMLButtonElement>('.mark-accept')!;
  const list = dialog.querySelector<HTMLElement>('.mark-variants')!;

  const fitStage = () => {
    const style = getComputedStyle(container);
    const availableWidth = container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const availableHeight = container.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const width = Math.max(1, Math.min(availableWidth, availableHeight * layout.width / layout.height));
    stage.style.width = `${width}px`;
    stage.style.height = `${width * layout.height / layout.width}px`;
  };
  const observer = new ResizeObserver(fitStage);
  const update = () => {
    accept.disabled = !draft;
    box.hidden = !draft;
    list.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
      button.classList.toggle('selected', button.dataset.variant === draft?.variant);
      button.setAttribute('aria-pressed', String(button.dataset.variant === draft?.variant));
    });
    if (!draft) return;
    const image = markAsset(draft.variant);
    if (!image) return;
    markImg.src = image.src;
    const rect = markRectangle(draft, image, layout);
    box.style.left = `${rect.x / layout.width * 100}%`;
    box.style.top = `${rect.y / layout.height * 100}%`;
    box.style.width = `${rect.width / layout.width * 100}%`;
    box.style.height = `${rect.height / layout.height * 100}%`;
  };
  for (const [id, label, file] of variants) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mark-variant';
    button.dataset.variant = id;
    button.setAttribute('aria-label', label);
    const thumbnail = document.createElement('img');
    thumbnail.src = file;
    thumbnail.alt = '';
    button.append(thumbnail, document.createTextNode(label));
    button.addEventListener('click', () => {
      if (!draft) draft = initialMark(id);
      else {
        draft = { ...draft, variant: id };
        const rect = markRectangle(draft, markAsset(id)!, layout);
        draft.widthRatio = rect.width / Math.max(layout.width, layout.height);
      }
      update();
    });
    list.appendChild(button);
  }

  let action: { pointer: number; x: number; y: number; mark: EracisMark; corner: MarkCorner | null } | null = null;
  const point = (event: PointerEvent) => {
    const bounds = stage.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * layout.width / bounds.width,
      y: (event.clientY - bounds.top) * layout.height / bounds.height };
  };
  box.addEventListener('pointerdown', (event) => {
    if (!draft) return;
    event.preventDefault();
    const start = point(event);
    action = { pointer: event.pointerId, ...start, mark: { ...draft },
      corner: (event.target as HTMLElement).dataset.corner as MarkCorner | undefined ?? null };
    box.setPointerCapture(event.pointerId);
  });
  box.addEventListener('pointermove', (event) => {
    if (!action || action.pointer !== event.pointerId) return;
    const current = point(event);
    const image = markAsset(action.mark.variant)!;
    draft = action.corner
      ? resizeMark(action.mark, image, layout, action.corner, current.x, current.y)
      : moveMark(action.mark, image, layout, current.x - action.x, current.y - action.y);
    update();
  });
  const stop = () => { action = null; };
  box.addEventListener('pointerup', stop);
  box.addEventListener('pointercancel', stop);
  box.addEventListener('keydown', (event) => {
    if (!draft) return;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
    };
    const move = delta[event.key];
    if (!move) return;
    event.preventDefault();
    draft = moveMark(draft, markAsset(draft.variant)!, layout, move[0] * layout.width / 100, move[1] * layout.height / 100);
    update();
  });
  dialog.querySelector('.mark-cancel')!.addEventListener('click', () => dialog.close());
  accept.addEventListener('click', () => {
    if (!draft) return;
    onAccept({ ...draft }, markAsset(draft.variant)!);
    dialog.close();
  });
  dialog.addEventListener('close', () => { observer.disconnect(); dialog.remove(); });
  dialog.showModal();
  observer.observe(container);
  fitStage();
  update();
}
