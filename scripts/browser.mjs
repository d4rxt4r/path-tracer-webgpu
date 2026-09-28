import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';

export const root = resolve(import.meta.dirname, '..');
export function sourceProvenance() {
    const collect = (dir) =>
        readdirSync(resolve(root, dir), { withFileTypes: true }).flatMap((entry) => {
            const path = `${dir}/${entry.name}`;
            return entry.isDirectory() ? collect(path) : path.endsWith('.js') ? [path] : [];
        });
    const hash = createHash('sha256');
    for (const path of ['app.js', 'const.js', 'scenes.js', ...collect('classes'), ...collect('renderer')].sort()) {
        hash.update(path)
            .update('\0')
            .update(readFileSync(resolve(root, path), 'utf8').replace(/\r\n/g, '\n'))
            .update('\0');
    }
    return {
        currentRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root }).toString().trim(),
        workingTreeDirty: !!execFileSync('git', ['status', '--porcelain'], { cwd: root }).toString().trim(),
        firstPartySha256NormalizedLF: hash.digest('hex'),
    };
}
const cache = new Map();
const mime = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
export function historicalSource(ref, path) {
    const key = `${ref}:${path}`;
    if (!cache.has(key)) cache.set(key, execFileSync('git', ['show', key], { cwd: root, maxBuffer: 20_000_000 }).toString());
    return cache.get(key);
}

export async function openBrowser() {
    const server = createServer(async (req, res) => {
        try {
            const url = new URL(req.url, 'http://localhost');
            if (url.pathname === '/favicon.ico') {
                res.writeHead(204);
                res.end();
                return;
            }
            let path = decodeURIComponent(url.pathname).replace(/^\//, '') || 'index.html';
            let content;
            if (path.startsWith('legacy/')) {
                path = path.slice(7);
                const ref = process.env.BASELINE_REF || '24ad391';
                content = path.startsWith('lib/') ? await readFile(resolve(root, path)) : historicalSource(ref, path);
                if (path === 'app.js') {
                    content = content.replace(
                        'const image_width = 1200;',
                        'const image_width = Number(new URLSearchParams(location.search).get("width") || 320);',
                    );
                    content = content.replace(
                        'let scene_index = 0;',
                        'let scene_index = Number(new URLSearchParams(location.search).get("scene") || 0);',
                    );
                    if (process.env.PRINT_WGSL) content = content.replace('await ti.init();', 'await ti.init({printWGSL:true});');
                    content = content.replace(
                        'const main = async () => {',
                        'const main = async () => { const started = performance.now();',
                    );
                    content = content.replace(
                        '    full_pass();\n\n    window.rerender',
                        `    window.bench = {
                        setupMs: performance.now() - started,
                        reset: clear_color_buffer,
                        trace: () => render(get_camera_settings(gui.get_values(), image_width, image_height)),
                        tone: (samples) => tone_map(samples),
                        present: () => canvas.setImage(pixels_buffer),
                        pixels: () => pixels_buffer.toArray(),
                        colors: () => color_buffer.toArray(),
                    };\n\n    window.rerender`,
                    );
                }
            } else {
                const target = resolve(root, path);
                if (!target.startsWith(root + sep)) throw new Error('Invalid path');
                content = await readFile(target);
            }
            res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
            res.end(content);
        } catch (error) {
            res.writeHead(404);
            res.end(error.message);
        }
    });
    await new Promise((done) => server.listen(0, '127.0.0.1', done));
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const origin = `http://127.0.0.1:${server.address().port}`;
    return {
        browser,
        origin,
        close: async () => {
            await browser.close();
            await new Promise((done) => server.close(done));
        },
    };
}

export async function seededPage(browser, expectedErrors = []) {
    const page = await browser.newPage();
    await page.addInitScript(() => {
        let seed = 123456789;
        Math.random = () => {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            return seed / 4294967296;
        };
    });
    page.on('pageerror', (error) => console.error(error.message));
    page.on('console', (msg) => {
        if (msg.type() === 'error' && !expectedErrors.some((text) => msg.text().includes(text))) console.error(msg.text());
    });
    return page;
}
