import { readFile } from 'node:fs/promises';
import { root, seededPage } from './browser.mjs';
import { resolve } from 'node:path';

export async function check_image_loading(run) {
    const page = await seededPage(run.browser, ['404']);
    const normal = await readFile(resolve(root, 'res/earth/2k_earth_normal_map.tif'));
    let broken = true;
    await page.route('**/res/earth/retry-normal.tif', (route) =>
        route.fulfill({ status: broken ? 404 : 200, body: broken ? 'Missing map' : normal }),
    );
    await page.goto(`${run.origin}/tests/bench.html?width=160&scene=0&fused=1`);
    await page.waitForFunction(() => !!window.bench, { timeout: 120000 });
    const results = await page.evaluate(async () => {
        const { SCENE_LIST } = await import('/scenes.js');
        const renderer = window.bench;
        const earth = SCENE_LIST.find((scene) => scene.name === 'Earth-mapped sphere');
        const withoutLight = {
            ...earth,
            objects: [earth.objects[0]],
            lights: [],
            textures: [earth.textures[0]],
            materials: [{ ...earth.materials[0], tex: 0, normal_tex: 0, height_tex: 0 }],
        };
        await renderer.loadScene(withoutLight);
        const { default_settings } = await import('/classes/GUI.js');
        const { get_camera_settings } = await import('/classes/Camera.js');
        renderer.setCamera(get_camera_settings({ ...default_settings, ...earth.camera }, 160, 90));
        await renderer.reset();
        await renderer.renderSample();
        const radiance = (await renderer.colors()).flat(2);
        const results = [
            {
                name: 'Earth city emission remains visible without external light',
                pass: radiance.every(Number.isFinite) && radiance.some((value) => value > 0.05),
            },
        ];
        const before = JSON.stringify(await renderer.fields.Scene.toArray());
        const counts = JSON.stringify(await renderer.fields.COUNTER.toArray());
        const debug = renderer.getBvhDebugData();
        const invalid = {
            ...earth,
            textures: earth.textures.map((tex, i) => (i === 1 ? { ...tex, src: 'res/earth/retry-normal.tif' } : tex)),
        };
        let error;
        try {
            await renderer.loadScene(invalid);
        } catch (failure) {
            error = failure.message;
        }
        results.push({
            name: 'missing image identifies source and preserves accepted GPU scene',
            value: error,
            pass:
                error?.includes('retry-normal.tif') &&
                counts === JSON.stringify(await renderer.fields.COUNTER.toArray()) &&
                before === JSON.stringify(await renderer.fields.Scene.toArray()) &&
                debug === renderer.getBvhDebugData(),
        });
        window.retryImageScene = invalid;
        return results;
    });
    broken = false;
    results.push(
        await page.evaluate(async () => {
            await window.bench.loadScene(window.retryImageScene);
            await window.bench.reset();
            await window.bench.renderSample();
            const colors = (await window.bench.colors()).flat(2);
            return {
                name: 'failed image decoding can be retried on the same renderer',
                pass: colors.every(Number.isFinite) && colors.some((v) => v > 0),
            };
        }),
    );
    let smaller = false;
    const fixtures = await page.evaluate(() => {
        const image = (size) => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = size;
            canvas.getContext('2d').fillRect(0, 0, size, size);
            return canvas.toDataURL();
        };
        return { large: image(6), small: image(2) };
    });
    await page.route('**/tests/fixtures/retry-size.png', (route) =>
        route.fulfill({
            contentType: 'image/png',
            body: Buffer.from((smaller ? fixtures.small : fixtures.large).split(',')[1], 'base64'),
        }),
    );
    results.push(
        await page.evaluate(async (src) => {
            const { create_image_textures } = await import('/renderer/ImageTextures.js');
            window.smallImageAtlas = create_image_textures({ size: 12 });
            window.retrySizeTextures = [src, 'tests/fixtures/retry-size.png'].map((src) => ({
                type: 3,
                src,
                color_space: 'linear',
                wrap_u: 0,
                wrap_v: 0,
            }));
            try {
                await window.smallImageAtlas.prepare(window.retrySizeTextures);
            } catch (error) {
                return {
                    name: 'atlas overflow reports the offending source',
                    pass: error.message.includes('retry-size.png') && error.message.includes('atlas'),
                };
            }
            return { name: 'atlas overflow reports the offending source', pass: false };
        }, fixtures.large),
    );
    smaller = true;
    results.push(
        await page.evaluate(async () => {
            try {
                const records = await window.smallImageAtlas.prepare(window.retrySizeTextures);
                return { name: 'atlas retry rereads a corrected image size', pass: records[1].image_rect[2] === 2 };
            } catch (error) {
                return { name: 'atlas retry rereads a corrected image size', value: error.message, pass: false };
            }
        }),
    );
    await page.close();

    const app = await seededPage(run.browser);
    let release;
    let started;
    const delayed = new Promise((resolve) => {
        release = resolve;
    });
    const requested = new Promise((resolve) => {
        started = resolve;
    });
    await app.route('**/res/earth/2k_earth_normal_map.tif', async (route) => {
        started();
        await delayed;
        await route.continue();
    });
    await app.goto(run.origin);
    await app.waitForFunction(() => document.getElementById('scene-loading').hidden, { timeout: 120000 });
    const select = app.locator('.lil-gui select').first();
    await select.selectOption({ label: 'Earth-mapped sphere' });
    await requested;
    results.push({
        name: 'scene indicator stays visible while an Earth map is decoding',
        pass: await app.locator('#scene-loading').isVisible(),
    });
    await select.selectOption({ index: 1 });
    release();
    await app.waitForFunction(() => document.getElementById('scene-loading').hidden, { timeout: 120000 });
    results.push({
        name: 'scene switch during image loading settles on the newer selection',
        pass: (await select.evaluate((element) => element.selectedIndex === 1)) && (await app.locator('#render-error').count()) === 0,
    });
    await app.close();
    return results;
}
