import { make_bvh_projection, select_bvh_nodes, bvh_box_segments } from './BvhDebug.js';

const COLORS = ['#54d9ff', '#ffcc66', '#ff7ba8', '#99ef8b', '#c5a0ff', '#ff9d65'];

export class BvhView {
    constructor(canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.clear();
    }

    clear() {
        this.canvas.hidden = true;
        this.previous = null;
    }

    draw(data, camera, settings, width, height) {
        if (settings.mode === 'off') {
            this.clear();
            return 0;
        }
        const depth = Math.max(0, Math.min(data.maxDepth, Math.floor(settings.depth)));
        const key = `${settings.mode}/${settings.selection}/${depth}/${width}/${height}`;
        const nodes = select_bvh_nodes(data, settings.selection, depth);
        if (this.previous?.data === data && this.previous.camera === camera && this.previous.key === key) return nodes.length;
        this.previous = { data, camera, key };
        if (this.canvas.width !== width) this.canvas.width = width;
        if (this.canvas.height !== height) this.canvas.height = height;
        const ctx = this.context;
        ctx.clearRect(0, 0, width, height);
        if (settings.mode === 'only') {
            ctx.fillStyle = '#15171c';
            ctx.fillRect(0, 0, width, height);
        }
        const projection = make_bvh_projection(camera, width, height);
        const paths = new Map();
        for (const node of nodes) {
            let path = paths.get(node.depth);
            if (!path) {
                path = new Path2D();
                paths.set(node.depth, path);
            }
            for (const [x0, y0, x1, y1] of bvh_box_segments(projection, node.bounds)) {
                path.moveTo(x0, y0);
                path.lineTo(x1, y1);
            }
        }
        ctx.lineWidth = 1.25;
        for (const [level, path] of paths) {
            ctx.strokeStyle = COLORS[level % COLORS.length];
            ctx.stroke(path);
        }
        this.canvas.hidden = false;
        return nodes.length;
    }
}
