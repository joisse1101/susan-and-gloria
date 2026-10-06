import type { CellDraw } from './cells';

/** Layer sheets by path, loaded once. A failed load is remembered with its path so the page can name the file. */
export class SheetCache {
    private images = new Map<string, HTMLImageElement>();
    private pending = new Map<string, Promise<void>>();
    readonly errors = new Map<string, string>();
    private bust = '';

    private readonly base: string;

    constructor(base: string) {
        this.base = base;
    }

    get(path: string): HTMLImageElement | undefined {
        return this.images.get(path);
    }

    /** Resolves once every path has loaded or failed; failures are in `errors`. */
    load(paths: string[]): Promise<void> {
        return Promise.all(paths.map((p) => this.loadOne(p))).then(() => undefined);
    }

    /** Forget everything and re-request with a cache-busting query (a rebuilt sheet shows without a hard refresh). */
    reset() {
        this.images.clear();
        this.pending.clear();
        this.errors.clear();
        this.bust = `?t=${Date.now()}`;
    }

    url(path: string) {
        return `${this.base}${path}${this.bust}`;
    }

    private loadOne(path: string): Promise<void> {
        if (this.images.has(path) || this.errors.has(path)) return Promise.resolve();
        let p = this.pending.get(path);
        if (!p) {
            p = new Promise<void>((resolve) => {
                const img = new Image();
                img.onload = () => { this.images.set(path, img); this.pending.delete(path); resolve(); };
                img.onerror = () => { this.errors.set(path, `${this.base}${path}`); this.pending.delete(path); resolve(); };
                img.src = this.url(path);
            });
            this.pending.set(path, p);
        }
        return p;
    }
}

/**
 * Draw `cells` (bottom to top) into `ctx` with the cell's top-left at (x, y), `scale` times larger (an integer, so pixels
 * stay square). Cells whose sheet is not loaded are skipped.
 */
export function drawCells(
    ctx: CanvasRenderingContext2D, cells: CellDraw[], cache: SheetCache, cell: number, scale: number, x = 0, y = 0,
) {
    ctx.imageSmoothingEnabled = false;
    const size = cell * Math.max(1, Math.round(scale));
    for (const c of cells) {
        const img = cache.get(c.path);
        if (!img) continue;
        ctx.globalAlpha = c.alpha;
        ctx.drawImage(img, c.sx, c.sy, cell, cell, x, y, size, size);
    }
    ctx.globalAlpha = 1;
}
