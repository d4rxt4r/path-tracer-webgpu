import * as ti from '../lib/taichi.js';
import { prepare_scene } from '../renderer/SceneData.js';
import { upload_scene } from '../renderer/Upload.js';
import { register_kernel_scope } from '../renderer/KernelScope.js';
import { Hittable, new_hit_record } from '../classes/Hittable.js';
import { Material } from '../classes/Material.js';
import { Texture } from '../classes/Texture.js';
import { BVHNode } from '../classes/BVHTree.js';
import { BoxData } from '../classes/Box.js';
import { hit_object } from '../classes/Scene.js';
import { new_ray } from '../classes/Ray.js';
import { get_interval } from '../classes/Interval.js';
import { dielectric_scatter, new_scatter_record } from '../classes/Material.js';

const bitmap_url = (pixels, width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0);
    return canvas.toDataURL();
};

async function run() {
    const { create_image_textures } = await import('../renderer/ImageTextures.js');
    const { ImageLoader } = await import('../renderer/ImageLoader.js');
    const { apply_surface_maps } = await import('../classes/SurfaceMaps.js');
    const { texture_color_value } = await import('../classes/Texture.js');
    const { emitted_light } = await import('../classes/Material.js');
    await ti.init();
    const images = create_image_textures({ size: 64 });
    const loader = new ImageLoader();
    const results = [];
    const check = (name, value, expected, tolerance = 0.002) => {
        results.push({
            name,
            value,
            expected,
            pass: Number.isFinite(value) && Math.abs(value - expected) <= tolerance,
        });
    };
    const color = bitmap_url([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255], 2, 2);
    const cached = await Promise.all([loader.load(color), loader.load(color)]);
    results.push({
        name: 'decoded image cache reuses one bitmap result',
        pass: cached[0] === cached[1],
    });
    for (const format of ['bmp', 'gif', 'avif']) {
        const decoded = await loader.load(`tests/fixtures/images/sample.${format}`);
        results.push({
            name: `${format} image loads through texture decoder`,
            pass: decoded.width === 2 && decoded.height === 2 && decoded.rgba[0] > decoded.rgba[1],
        });
    }
    const formatCanvas = new OffscreenCanvas(2, 2);
    formatCanvas.getContext('2d').fillRect(0, 0, 2, 2);
    for (const type of ['image/jpeg', 'image/webp']) {
        const url = URL.createObjectURL(await formatCanvas.convertToBlob({ type }));
        try {
            const decoded = await loader.load(url);
            results.push({ name: `${type} image loads through texture decoder`, pass: decoded.width === 2 && decoded.height === 2 });
        } finally {
            URL.revokeObjectURL(url);
        }
    }
    const gray = bitmap_url([128, 128, 128, 255], 1, 1);
    const normal = bitmap_url([255, 128, 255, 255], 1, 1);
    const flat = bitmap_url([128, 128, 255, 255], 1, 1);
    const slope = bitmap_url([0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255], 2, 2);
    const textures = [
        { type: 3, src: color, color_space: 'linear' },
        { type: 3, src: gray },
        { type: 3, src: normal, color_space: 'linear' },
        { type: 3, src: slope, color_space: 'linear' },
        { type: 3, src: flat, color_space: 'linear' },
        { type: 3, src: color, color_space: 'linear', wrap_u: 'repeat' },
    ];
    const Scene = ti.field(Hittable, 16);
    const Lights = ti.field(Hittable, 16);
    const Materials = ti.field(Material, 16);
    const Textures = ti.field(Texture, 16);
    const BVHTree = ti.field(BVHNode, 31);
    const Boxes = ti.field(BoxData, 16);
    const COUNTER = ti.field(ti.i32, 4);
    register_kernel_scope({
        Scene,
        Lights,
        Materials,
        Textures,
        BVHTree,
        Boxes,
        COUNTER,
        ImageAtlas: images.texture,
        image_maps_enabled: true,
    });
    const load = async (objects, material = {}) => {
        const prepared = prepare_scene({
            objects,
            textures,
            materials: [{ type: 1, attenuation: [0.2, 0.2, 0.2], ...material }],
        });
        prepared.textures = await images.prepare(prepared.textures);
        await upload_scene(prepared, {
            Scene,
            Lights,
            Materials,
            Textures,
            BVHTree,
            Boxes,
            COUNTER,
        });
    };
    const quad = { type: 2, Q: [-1, -1, 0], u: [2, 0, 0], v: [0, 2, 0], mat: 0 };
    await load([quad]);
    const samples = ti.kernel(() => {
        return [
            texture_color_value(1, 0.0, 1.0, [0.0, 0.0, 0.0]),
            texture_color_value(1, 0.0, 0.0, [0.0, 0.0, 0.0]),
            texture_color_value(1, 0.5, 0.5, [0.0, 0.0, 0.0]),
            texture_color_value(2, 0.5, 0.5, [0.0, 0.0, 0.0]),
            texture_color_value(6, 0.0, 1.0, [0.0, 0.0, 0.0]),
        ];
    });
    const values = await samples();
    check('top image row corresponds to v=1', values[0][0], 1);
    check('bottom image row corresponds to v=0', values[1][2], 1);
    for (let i = 0; i < 3; i++) check(`linear bilinear color channel ${i}`, values[2][i], 0.5);
    check('sRGB gray is converted before filtering', values[3][0], 0.21586);
    check('repeat seam filters the opposite edge', values[4][0], 0.5);
    check('repeat seam includes the other image column', values[4][1], 0.5);
    const mapped = ti.kernel(
        {
            origin: ti.types.vector(ti.f32, 3),
            direction: ti.types.vector(ti.f32, 3),
        },
        (origin, direction) => {
            const rec = new_hit_record();
            const ray = new_ray(origin, direction, 0.0);
            hit_object(Scene[0], ray, get_interval(0.001, 100.0), rec);
            apply_surface_maps(Scene[0], ray, rec, Materials[0]);
            return [rec.normal, emitted_light(Materials[0], rec), texture_color_value(1, rec.u, rec.v, rec.p)];
        },
    );
    await load([quad], { normal_tex: 3 });
    let result = await mapped([0, 0, 2], [0, 0, -1]);
    check('normal map changes a quad tangent normal', result[0][0], Math.SQRT1_2);
    await load([quad], { normal_tex: 3, normal_scale: 0 });
    result = await mapped([0, 0, 2], [0, 0, -1]);
    check('zero normal strength preserves geometry', result[0][2], 1);
    await load([quad], { height_tex: 4, height_scale: 0.1 });
    result = await mapped([0, 0, 2], [0, 0, -1]);
    results.push({
        name: 'height gradient tilts the normal down the slope',
        value: result[0],
        pass: result[0][0] < -0.02 && result[0][2] > 0.9,
    });
    await load([quad], { normal_tex: 3, height_tex: 4, height_scale: 0.1 });
    result = await mapped([0, 0, 2], [0, 0, -1]);
    results.push({
        name: 'height and normal maps combine without losing either',
        value: result[0],
        pass: result[0][0] > 0.5 && result[0][0] < 0.705,
    });
    await load([quad], { normal_tex: 3 });
    result = await mapped([0, 0, -2], [0, 0, 1]);
    check('backface retains oriented shading normal', result[0][2], -Math.SQRT1_2);
    await load([{ type: 1, center: [0, 0, 0], radius: 1, mat: 0 }], {
        normal_tex: 3,
        height_tex: 4,
        height_scale: 0.01,
    });
    result = await mapped([0, 3, 0], [0, -1, 0]);
    results.push({
        name: 'sphere poles have stable finite surface normals',
        value: result[0],
        pass: result[0].every(Number.isFinite) && result[0][1] > 0.5,
    });
    await load([quad], { height_tex: 5, height_scale: 0.3 });
    result = await mapped([0, 0, 2], [0, 0, -1]);
    check('constant height preserves the geometric normal', result[0][2], 1);
    await load([quad], { height_tex: 4, height_scale: 0 });
    result = await mapped([0, 0, 2], [0, 0, -1]);
    check('zero height strength preserves the geometric normal', result[0][2], 1);
    await load([{ ...quad, Q: [-0.001, -0.001, 0], u: [0.002, 0, 0], v: [0, 0.002, 0] }], { height_tex: 4, height_scale: 0.0001 });
    result = await mapped([0, 0, 0.01], [0, 0, -1]);
    check('height mapping is invariant under uniform scene scaling', result[0][0], -0.0499376);
    await load([{ ...quad, v: [1, 2, 0] }], { height_tex: 4, height_scale: 0.1 });
    result = await mapped([0.5, 0, 2], [0, 0, -1]);
    results.push({
        name: 'height gradient respects a skew quad metric',
        value: result[0],
        pass: result[0][0] < -0.04 && result[0][1] > 0.02,
    });
    await load([{ type: 1, center: [0, 0, 0], radius: 1, rotation: [0, 90, 0], mat: 0 }]);
    result = await mapped([3, 0, 0], [-1, 0, 0]);
    check('sphere image UV follows object rotation', result[2][1], 0);
    await load([{ type: 4, min: [-1, -1, -1], max: [1, 1, 1], mat: 0 }], { normal_tex: 3 });
    for (const [origin, direction, expected] of [
        [
            [3, 0, 0],
            [-1, 0, 0],
            [Math.SQRT1_2, 0, -Math.SQRT1_2],
        ],
        [
            [-3, 0, 0],
            [1, 0, 0],
            [-Math.SQRT1_2, 0, Math.SQRT1_2],
        ],
        [
            [0, 3, 0],
            [0, -1, 0],
            [Math.SQRT1_2, Math.SQRT1_2, 0],
        ],
        [
            [0, -3, 0],
            [0, 1, 0],
            [Math.SQRT1_2, -Math.SQRT1_2, 0],
        ],
        [
            [0, 0, 3],
            [0, 0, -1],
            [Math.SQRT1_2, 0, Math.SQRT1_2],
        ],
        [
            [0, 0, -3],
            [0, 0, 1],
            [-Math.SQRT1_2, 0, -Math.SQRT1_2],
        ],
    ]) {
        result = await mapped(origin, direction);
        check(
            `box face tangent basis from ${origin}`,
            result[0].reduce((sum, n, i) => sum + n * expected[i], 0),
            1,
        );
    }
    await load(
        [
            {
                type: 4,
                min: [-1, -1, -1],
                max: [1, 1, 1],
                rotation: [0, 30, 0],
                mat: 0,
            },
        ],
        { normal_tex: 3 },
    );
    result = await mapped([0, 0, 3], [0, 0, -1]);
    results.push({
        name: 'rotated box supports image normal maps',
        value: result[0],
        pass: result[0].every(Number.isFinite) && Math.abs(result[0][0]) > 0.2,
    });
    await load([quad], { emission_tex: 2, emission_strength: 2 });
    result = await mapped([0, 0, 2], [0, 0, -1]);
    check('diffuse material emits independently of external lighting', result[1][0], 0.43172);
    await load([quad], { emission_tex: 2, emission_threshold: 0.3 });
    result = await mapped([0, 0, 2], [0, 0, -1]);
    check('emission threshold removes dim background', result[1][0], 0);
    await load([quad], { type: 4, tex: 1, k: 2 });
    result = await mapped([0, 0, 2], [0, 0, -1]);
    check('light materials emit their image color', result[1][0], 1);
    await load([quad], { type: 3, k: 1.5 });
    const tir = ti.kernel(() => {
        let invalid = 0;
        let samples = 0;
        while (samples < 128) {
            samples += 1;
            const rec = new_hit_record();
            rec.front_face = false;
            rec.normal = [-0.1908089954, 0.0, 0.9816271834];
            rec.geometric_normal = [0.0, 0.0, 1.0];
            rec.mapped = true;
            const scatter = new_scatter_record();
            dielectric_scatter(new_ray([0, 0, 0], [0.7880107536, 0.0, -0.6156614753], 0.0), rec, Materials[0], scatter);
            if (scatter.skip_pdf_ray.direction.z <= 0) invalid += 1;
        }
        return invalid;
    });
    check('geometric refraction fallback preserves total internal reflection', await tir(), 0);
    const tif = await loader.load('../res/earth/2k_earth_normal_map.tif');
    results.push({
        name: 'actual Earth TIFF preserves linear RGB normals',
        pass: tif.width === 2048 && tif.height === 1024 && tif.rgba[0] === 128 && tif.rgba[2] === 255,
    });
    return results;
}
window.imageResults = run().catch((error) => [{ name: 'image texture setup', pass: false, value: error.stack }]);
window.imageResults.then((results) => {
    document.getElementById('result').textContent = JSON.stringify(results);
});
