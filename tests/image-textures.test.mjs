import test from 'node:test';
import assert from 'node:assert/strict';
import { prepare_scene } from '../renderer/SceneData.js';
import { TEX_TYPE } from '../const.js';

const scene = (textures, material = {}) => ({
    objects: [{ type: 1, center: [0, 0, 0], radius: 1, mat: 0 }],
    materials: [{ attenuation: [1, 1, 1], ...material }],
    textures,
});

test('image descriptors retain their source and normalize sampling defaults', () => {
    const prepared = prepare_scene(scene([{ type: TEX_TYPE.IMAGE, src: 'res/a.png' }], { tex: 1 }));
    assert.equal(prepared.textures[1].src, 'res/a.png');
    assert.equal(prepared.textures[1].color_space, 'srgb');
    assert.equal(prepared.textures[1].wrap_u, 0);
    assert.equal(prepared.materials[0].normal_scale, 1);
    assert.equal(prepared.materials[0].height_scale, 0);
});

test('independent map references are validated before upload', () => {
    const textures = [
        {
            type: TEX_TYPE.IMAGE,
            src: 'res/a.png',
            color_space: 'linear',
            wrap_u: 'repeat',
        },
    ];
    const prepared = prepare_scene(scene(textures, { height_tex: 1, normal_tex: 1, emission_tex: 1 }));
    assert.equal(prepared.textures[1].wrap_u, 1);
    for (const key of ['height_tex', 'normal_tex', 'emission_tex']) {
        assert.throws(() => prepare_scene(scene(textures, { [key]: 2 })), /texture reference/i);
    }
    for (const key of ['height_scale', 'normal_scale', 'emission_strength', 'emission_threshold']) {
        assert.throws(() => prepare_scene(scene(textures, { [key]: NaN })), /map|emission/i);
    }
});

test('invalid image sources and sampling options are rejected', () => {
    for (const change of [{ src: '' }, { color_space: 'wrong' }, { wrap_u: 'wrong' }]) {
        assert.throws(() => prepare_scene(scene([{ type: TEX_TYPE.IMAGE, src: 'a.png', ...change }])), /image|texture/i);
    }
    assert.throws(() => prepare_scene(scene([{ type: TEX_TYPE.IMAGE, src: 'n.png' }], { normal_tex: 1 })), /linear/i);
});

test('surface maps cannot be assigned to volume materials', () => {
    const value = scene([{ type: TEX_TYPE.IMAGE, src: 'h.png', color_space: 'linear' }], { type: 5, k: 0.01, height_tex: 1 });
    value.objects[0] = {
        type: 3,
        boundary: { type: 1, center: [0, 0, 0], radius: 1 },
        mat: 0,
    };
    assert.throws(() => prepare_scene(value), /surface|medium/i);
});

test('pixel conversion preserves raw heights and linear map channels', async () => {
    const module = await import('../renderer/ImageAtlas.js');
    const image = {
        width: 1,
        height: 1,
        rgba: new Uint8Array([128, 128, 255, 0]),
    };
    const color = module.image_pixel(image, 0, 0, {
        color_space: 'srgb',
        wrap_u: 0,
        wrap_v: 0,
    });
    assert.ok(Math.abs(color[0] - 0.21586) < 0.00001);
    const normal = module.image_pixel(image, 0, 0, {
        color_space: 'linear',
        wrap_u: 0,
        wrap_v: 0,
    });
    assert.ok(Math.abs(normal[0] - 128 / 255) < 1e-6);
    assert.equal(normal[2], 1);
    assert.ok(Math.abs(normal[3] - color[3]) < 1e-6);
});

test('atlas borders wrap horizontally and clamp vertically without mixing images', async () => {
    const { AtlasLayout, image_pixel } = await import('../renderer/ImageAtlas.js');
    const layout = new AtlasLayout(10);
    assert.deepEqual(layout.reserve(2, 1), [1, 1, 2, 1]);
    assert.deepEqual(layout.reserve(2, 1), [5, 1, 2, 1]);
    assert.deepEqual(layout.reserve(4, 1), [1, 4, 4, 1]);
    assert.throws(() => layout.reserve(9, 1), /atlas/i);
    const image = {
        width: 2,
        height: 1,
        rgba: new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]),
    };
    const config = { color_space: 'linear', wrap_u: 1, wrap_v: 0 };
    assert.deepEqual(image_pixel(image, -1, -1, config).slice(0, 3), [0, 1, 0]);
    assert.deepEqual(image_pixel(image, 2, 1, config).slice(0, 3), [1, 0, 0]);
});
