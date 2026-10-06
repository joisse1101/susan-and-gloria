import { useContext, useEffect, useRef } from 'react';
import { cellsToDraw, type LayerOrder, type Layout, type Selection } from './cells';
import { ClockContext } from './clock';
import { drawCells, type SheetCache } from './draw';
import type { Background } from './state';

interface Props {
    layout: Layout;
    order: LayerOrder;
    sel: Selection;
    anim: string;
    facing: string;
    highlight: string | null;
    fps: number;
    /** A fixed frame (the main preview while paused); null follows the clock. */
    frame: number | null;
    scale: number;
    cache: SheetCache;
    shadowCache: SheetCache;
    /** Bumped when sheets finish loading, to redraw. */
    version: number;
    background: Background;
    shadow: boolean;
    cellOverlay: boolean;
    /** Draw dimmed (a hidden layer's own tile). */
    dim?: boolean;
    onFrame?: (frame: number) => void;
    className?: string;
}

/** One animated 32x32 cell on a canvas, redrawn only when its frame, selection, highlight or sheets change. */
export default function Preview(p: Props) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const clock = useContext(ClockContext);
    const latest = useRef(p);
    const last = useRef<unknown[]>([]);

    useEffect(() => {
        latest.current = p;
    });

    useEffect(() => {
        if (!clock) return;
        return clock.subscribe((ms) => {
            const c = canvas.current;
            const q = latest.current;
            if (!c) return;
            const frames = q.layout.animations.find((a) => a.name === q.anim)?.frames ?? 1;
            const frame = q.frame ?? Math.floor((ms * q.fps) / 1000) % frames;
            q.onFrame?.(frame);
            const key = [frame, q.sel, q.anim, q.facing, q.highlight, q.scale, q.version, q.shadow, q.cellOverlay, q.dim];
            if (key.length === last.current.length && key.every((v, i) => v === last.current[i])) return;
            last.current = key;
            const ctx = c.getContext('2d');
            if (!ctx) return;
            const size = q.layout.cell * q.scale;
            if (c.width !== size) { c.width = size; c.height = size; }
            ctx.clearRect(0, 0, size, size);
            ctx.imageSmoothingEnabled = false;
            ctx.globalAlpha = q.dim ? 0.4 : 1;
            if (q.shadow) {
                const img = q.shadowCache.get('Shadow.png');
                if (img) ctx.drawImage(img, 0, 0, q.layout.cell, q.layout.cell, 0, 0, size, size);
            }
            drawCells(ctx, cellsToDraw(q.sel, q.layout, q.order, q.anim, q.facing, frame, q.highlight), q.cache, q.layout.cell, q.scale);
            ctx.globalAlpha = 1;
            if (q.cellOverlay) {
                ctx.strokeStyle = '#ff3fa4';
                ctx.lineWidth = 1;
                ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
                ctx.strokeStyle = 'rgba(255,63,164,0.35)';
                ctx.beginPath();
                ctx.moveTo(size / 2 + 0.5, 0); ctx.lineTo(size / 2 + 0.5, size);
                ctx.moveTo(0, size / 2 + 0.5); ctx.lineTo(size, size / 2 + 0.5);
                ctx.stroke();
            }
        });
    }, [clock]);

    return <canvas ref={canvas} className={`cv-canvas cv-bg-${p.background} ${p.className ?? ''}`} width={p.layout.cell * p.scale} height={p.layout.cell * p.scale} />;
}
