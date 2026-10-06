import type { ViewerData } from './state';

export const CHARACTERS_URL = `${import.meta.env.BASE_URL}assets/characters/`;
export const SPRITES_URL = `${import.meta.env.BASE_URL}assets/sprites/`;

const FILES = ['layout.json', 'layer-order.json', 'presets.json', 'variants.json'] as const;

async function fetchJson(file: string, bust: string) {
    const url = `${CHARACTERS_URL}${file}${bust}`;
    let res: Response;
    try {
        res = await fetch(url, { cache: 'no-store' });
    } catch {
        throw new Error(`Could not load ${url}`);
    }
    // The dev server answers an unknown path with index.html, which is not JSON
    if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
    try {
        return await res.json();
    } catch {
        throw new Error(`${url} is not valid JSON (missing file?)`);
    }
}

/** Load what the build wrote; the error names the file that failed. `bust` is a cache-busting query such as `?t=1`. */
export async function loadData(bust = ''): Promise<ViewerData> {
    const [layout, order, presets, variants] = await Promise.all(FILES.map((f) => fetchJson(f, bust)));
    return { layout, order, presets, variants };
}
