import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { sheetPath, soloSelection } from '../dev/characters/cells';
import { Clock, ClockContext } from '../dev/characters/clock';
import { CHARACTERS_URL, loadData, SPRITES_URL } from '../dev/characters/data';
import { SheetCache } from '../dev/characters/draw';
import Preview from '../dev/characters/Preview';
import {
    actionForKey, FPS_CHOICES, highlightOf, initialState, keysIgnored, layerNames, reduce,
    type Action, type ViewerData,
} from '../dev/characters/state';
import '../dev/characters/characterViewer.scss';

// Dev-only page (registered in App.tsx only when import.meta.env.DEV): composites a layered character from the build's
// sheets so outfits and animations can be checked. See openspec/changes/character-viewer-page.

const LEGEND: [string, string][] = [
    ['Up / Down', 'select layer row'], ['Left / Right', 'previous / next variant'], ['H', 'hide layer'],
    ['E', 'next expression'], ['1-4', 'animation'], ['[ ]', 'facing'], ['Space', 'play / pause'],
    [', .', 'step frame'], ['- +', 'slower / faster'], ['G', 'cell overlay'], ['O', 'layer-order list'], ['S', 'shadow'], ['B', 'background'],
    ['Esc', 'clear keyboard highlight'],
];

export default function CharacterViewer() {
    const [data, setData] = useState<ViewerData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const cache = useMemo(() => new SheetCache(CHARACTERS_URL), []);
    const shadowCache = useMemo(() => new SheetCache(SPRITES_URL), []);

    useEffect(() => {
        let alive = true;
        const bust = reloadKey ? `?t=${Date.now()}` : '';
        loadData(bust).then(
            (d) => { if (alive) { setData(d); setError(null); } },
            (e: Error) => { if (alive) setError(e.message); },
        );
        return () => { alive = false; };
    }, [reloadKey]);

    const reload = useCallback(() => {
        cache.reset();
        shadowCache.reset();
        setReloadKey((k) => k + 1);
    }, [cache, shadowCache]);

    return (
        <div className="cv">
            <header className="cv-head">
                <h1>Character viewer</h1>
                <span className="cv-dev">dev only</span>
                <button type="button" onClick={reload} title="Re-request the JSON and sheets, skipping the browser cache">Reload data</button>
            </header>
            {error && <p className="cv-error" role="alert">{error}</p>}
            {data ? <Viewer key={reloadKey} data={data} cache={cache} shadowCache={shadowCache} /> : !error && <p>Loading…</p>}
        </div>
    );
}

function Viewer({ data, cache, shadowCache }: { data: ViewerData; cache: SheetCache; shadowCache: SheetCache }) {
    const { layout, order, presets, variants } = data;
    const layers = useMemo(() => layerNames(layout), [layout]);
    const anims = useMemo(() => layout.animations.map((a) => a.name), [layout]);
    const [state, dispatch] = useReducer((s: ReturnType<typeof initialState>, a: Action) => reduce(data, s, a), data, initialState);
    const [clock] = useState(() => new Clock());
    const [version, setVersion] = useState(0);
    const [failed, setFailed] = useState<string[]>([]);
    const frameRef = useRef(0);
    const stateRef = useRef(state);

    useEffect(() => {
        stateRef.current = state;
    });

    useEffect(() => {
        clock.start();
        return () => clock.stop();
    }, [clock]);

    // Load the sheets the selection needs (hidden layers too: their own tile shows them) and the shadow
    useEffect(() => {
        let alive = true;
        const paths = layers.map((l) => sheetPath(layout, state.sel, l)).filter((p): p is string => !!p);
        Promise.all([cache.load(paths), shadowCache.load(['Shadow.png'])]).then(() => {
            if (!alive) return;
            setFailed([...cache.errors.values(), ...shadowCache.errors.values()]);
            setVersion((v) => v + 1);
        });
        return () => { alive = false; };
    }, [cache, shadowCache, layout, layers, state.sel]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey || keysIgnored(e.target as HTMLElement | null)) return;
            if ((e.target as HTMLElement | null)?.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
            const a = actionForKey(e.key.length === 1 ? e.key.toLowerCase() : e.key, layers, anims, stateRef.current, frameRef.current);
            if (!a) return;
            e.preventDefault();
            dispatch(a);
        };
        const onPointer = () => dispatch({ type: 'clearKeyboardRow' });
        window.addEventListener('keydown', onKey);
        window.addEventListener('pointerdown', onPointer);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('pointerdown', onPointer);
        };
    }, [layers, anims]);

    const highlight = highlightOf(state, layers);
    const animation = layout.animations.find((a) => a.name === state.anim)!;
    const facings = Object.keys(animation.facings);
    const face = state.sel.layers.face?.variant;
    const expressions = variants.expressions[face] ?? [];
    const common = { layout, order, cache, shadowCache, version, background: state.background, shadow: state.shadow, cellOverlay: state.cellOverlay, fps: state.fps };

    return (
        <ClockContext.Provider value={clock}>
            {failed.length > 0 && (
                <p className="cv-error" role="alert">Missing sheet{failed.length > 1 ? 's' : ''}: {failed.join(', ')}</p>
            )}
            <div className="cv-top">
                <label>
                    Preset{' '}
                    <select value={state.preset ?? ''} onChange={(e) => { dispatch({ type: 'preset', name: e.target.value }); e.target.blur(); }}>
                        {state.preset === null && <option value="">custom</option>}
                        {Object.keys(presets.characters).map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                </label>
                <div className="cv-group" role="group" aria-label="Animation">
                    {anims.map((n, i) => (
                        <button key={n} type="button" aria-pressed={n === state.anim} onClick={() => dispatch({ type: 'anim', name: n })}>{i + 1} {n}</button>
                    ))}
                </div>
                <div className="cv-group" role="group" aria-label="Facing">
                    {facings.map((f) => (
                        <button key={f} type="button" aria-pressed={f === state.facing} onClick={() => dispatch({ type: 'facing', name: f })}>{f}</button>
                    ))}
                </div>
            </div>

            <div className="cv-main">
                <section className="cv-layers" aria-label="Layers">
                    {layers.map((layer, i) => {
                        const choice = state.sel.layers[layer];
                        const list = variants.layers[layer] ?? [];
                        const at = list.indexOf(choice.variant);
                        return (
                            <div
                                key={layer}
                                className={`cv-row${i === state.row ? ' is-current' : ''}${choice.hidden ? ' is-hidden' : ''}`}
                                onFocus={(e) => { if (e.target.matches(':focus-visible')) dispatch({ type: 'hover', layer }); }}
                                onBlur={() => dispatch({ type: 'hover', layer: null })}
                            >
                                <button
                                    type="button" className="cv-title"
                                    onPointerEnter={() => dispatch({ type: 'hover', layer })}
                                    onPointerLeave={() => dispatch({ type: 'hover', layer: null })}
                                    onClick={() => dispatch({ type: 'rowSelect', index: i })}
                                >{layer}</button>
                                <button type="button" aria-label={`Previous ${layer}`} onClick={() => dispatch({ type: 'cycle', layer, dir: -1 })}>◀</button>
                                <span className="cv-variant" title={choice.variant}>{choice.variant || '(none)'}{list.length > 0 && <small> {at + 1}/{list.length}</small>}</span>
                                <button type="button" aria-label={`Next ${layer}`} onClick={() => dispatch({ type: 'cycle', layer, dir: 1 })}>▶</button>
                                <button type="button" aria-pressed={choice.hidden} aria-label={`Hide ${layer}`} onClick={() => dispatch({ type: 'hide', layer })}>{choice.hidden ? 'hidden' : 'hide'}</button>
                                {layer === 'face' && expressions.length > 0 && (
                                    <span className="cv-expr">
                                        <button type="button" aria-label="Previous expression" onClick={() => dispatch({ type: 'expression', dir: -1 })}>◀</button>
                                        <span>{state.sel.expression}</span>
                                        <button type="button" aria-label="Next expression" onClick={() => dispatch({ type: 'expression', dir: 1 })}>▶</button>
                                    </span>
                                )}
                            </div>
                        );
                    })}
                    <div className="cv-opts">
                        <div className="cv-group" role="group" aria-label="Background">
                            <button type="button" aria-pressed={state.background === 'checker'} onClick={() => dispatch({ type: 'background', value: 'checker' })}>checkerboard</button>
                            <button type="button" aria-pressed={state.background === 'green'} onClick={() => dispatch({ type: 'background', value: 'green' })}>green</button>
                        </div>
                        <button type="button" aria-pressed={state.shadow} onClick={() => dispatch({ type: 'toggle', what: 'shadow' })}>shadow</button>
                        <button type="button" aria-pressed={state.cellOverlay} onClick={() => dispatch({ type: 'toggle', what: 'cellOverlay' })}>cell overlay</button>
                        <button type="button" aria-pressed={state.orderList} onClick={() => dispatch({ type: 'toggle', what: 'orderList' })}>layer order</button>
                    </div>
                    {state.orderList && (
                        <ol className="cv-order" aria-label={`Draw order, ${state.facing}`}>
                            {(order[state.facing] ?? []).map((l) => <li key={l}>{l}</li>)}
                        </ol>
                    )}
                </section>

                <section className="cv-stage" aria-label="Preview">
                    <Preview
                        {...common} sel={state.sel} anim={state.anim} facing={state.facing} highlight={highlight}
                        frame={state.playing ? null : state.frame} scale={10}
                        onFrame={(f) => { frameRef.current = f; }}
                    />
                    <div className="cv-transport">
                        <button type="button" onClick={() => dispatch({ type: 'step', dir: -1, frame: frameRef.current })} aria-label="Previous frame">⏮</button>
                        <button type="button" onClick={() => dispatch({ type: 'play', frame: frameRef.current })}>{state.playing ? 'pause' : 'play'}</button>
                        <button type="button" onClick={() => dispatch({ type: 'step', dir: 1, frame: frameRef.current })} aria-label="Next frame">⏭</button>
                        <span className="cv-frame">frame {(state.playing ? '–' : state.frame)} / {animation.frames}</span>
                        <label>
                            speed{' '}
                            <select value={state.fps} onChange={(e) => { dispatch({ type: 'speed', fps: Number(e.target.value) }); e.target.blur(); }}>
                                {FPS_CHOICES.map((f) => <option key={f} value={f}>{f} fps</option>)}
                            </select>
                        </label>
                    </div>
                </section>

                <aside className="cv-legend" aria-label="Keys">
                    <h2>Keys</h2>
                    <dl>{LEGEND.map(([k, d]) => <div key={k}><dt><kbd>{k}</kbd></dt><dd>{d}</dd></div>)}</dl>
                </aside>
            </div>

            <section aria-label="Layer by layer">
                <h2>Layer by layer <small>({state.anim}, {state.facing})</small></h2>
                <div className="cv-tiles">
                    <figure>
                        <Preview {...common} sel={state.sel} anim={state.anim} facing={state.facing} highlight={highlight} frame={state.playing ? null : state.frame} scale={5} />
                        <figcaption>composite</figcaption>
                    </figure>
                    {layers.map((layer) => {
                        const drawn = (order[state.facing] ?? []).includes(layer);
                        const hidden = state.sel.layers[layer].hidden;
                        return (
                            <figure
                                key={layer}
                                className={hidden ? 'is-hidden' : ''}
                                onPointerEnter={() => dispatch({ type: 'hover', layer })}
                                onPointerLeave={() => dispatch({ type: 'hover', layer: null })}
                            >
                                {drawn ? (
                                    <Preview
                                        {...common} sel={soloSelection(state.sel, layer)} anim={state.anim} facing={state.facing} highlight={null}
                                        frame={state.playing ? null : state.frame} scale={5} dim={hidden}
                                    />
                                ) : <div className="cv-empty" style={{ width: layout.cell * 5, height: layout.cell * 5 }}>not drawn in this facing</div>}
                                <figcaption>{layer}{hidden && <em> (hidden)</em>}</figcaption>
                            </figure>
                        );
                    })}
                </div>
            </section>

            <section aria-label="All facings">
                <h2>All facings <small>({state.anim})</small></h2>
                <div className="cv-tiles">
                    {facings.map((f) => (
                        <figure key={f}>
                            <Preview {...common} sel={state.sel} anim={state.anim} facing={f} highlight={highlight} frame={null} scale={5} />
                            <figcaption>{f}</figcaption>
                        </figure>
                    ))}
                </div>
            </section>

            <section aria-label="All animations">
                <h2>All animations</h2>
                {layout.animations.map((a) => (
                    <div key={a.name} className="cv-anim-row">
                        <h3>{a.name}</h3>
                        <div className="cv-tiles">
                            {Object.keys(a.facings).map((f) => (
                                <figure key={f}>
                                    <Preview {...common} sel={state.sel} anim={a.name} facing={f} highlight={highlight} frame={null} scale={3} />
                                    <figcaption>{f}</figcaption>
                                </figure>
                            ))}
                        </div>
                    </div>
                ))}
            </section>
        </ClockContext.Provider>
    );
}
