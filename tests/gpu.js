import * as ti from '../lib/taichi.js';
import { register_kernel_scope } from '../renderer/KernelScope.js';
import { Hittable, new_hit_record } from '../classes/Hittable.js';
import { Material } from '../classes/Material.js';
import { BVHNode } from '../classes/BVHTree.js';
import { Texture } from '../classes/Texture.js';
import { init_scene, hit_scene, hit_object } from '../classes/Scene.js';
import { hit_aabb } from '../classes/AABB.js';
import { sphere_pdf_value, sphere_pdf_generate, quad_pdf_value, mixed_pdf_generate, mixed_pdf_value } from '../classes/PDF.js';
import { get_interval } from '../classes/Interval.js';
import { new_ray } from '../classes/Ray.js';
import { get_sphere_center } from '../classes/Sphere.js';
import { hit_constant_medium } from '../classes/ConstantMedium.js';
import { random_cosine_direction_vec3 } from '../classes/Vector.js';

async function run() {
    await ti.init();
    const Scene = ti.field(Hittable, 16);
    const Lights = ti.field(Hittable, 16);
    const Materials = ti.field(Material, 16);
    const Textures = ti.field(Texture, 16);
    const BVHTree = ti.field(BVHNode, 31);
    const COUNTER = ti.field(ti.i32, 4);
    register_kernel_scope({ Scene, Lights, Materials, Textures, BVHTree, COUNTER });
    const results = [];
    const check = (name, value, expected, tolerance = 1e-5) => {
        const pass = Number.isFinite(value) && Math.abs(value - expected) <= tolerance;
        results.push({ name, value, expected, pass });
        if (!pass) console.error(`FAIL ${name}: ${value}, expected ${expected}`);
    };
    const load = (objects, lights = [], materials = [{ type: 1, attenuation: [1, 1, 1] }]) =>
        init_scene({ objects, lights, materials, textures: [] }, Scene, Lights, BVHTree, Materials, Textures, COUNTER);
    const sphere = { type: 1, center: [0, 0, -3], radius: 1, mat: 0 };
    const quad = { type: 2, Q: [-1, -1, -2], u: [2, 0, 0], v: [0, 2, 0], mat: 0 };
    // COUNTER[4] is added by the corrected loader. Keep legacy input length compatible before the fix.
    await load([sphere, quad]);
    const pdf = ti.kernel(() => {
        const miss = sphere_pdf_value(Scene[0], [0, 0, 0], [0, 1, 0], 0);
        const square = quad_pdf_value(Scene[1], [0, 0, 0], [0, 0, -1]);
        const inside = sphere_pdf_value(Scene[0], [0, 0, -3], [0, 0, 1], 0);
        let far = Scene[0];
        far.center = [0.0, 0.0, -100000.0];
        far.center2 = far.center;
        const distant = sphere_pdf_value(far, [0, 0, 0], [0, 0, -1], 0);
        return [miss, square, inside, distant];
    });
    const values = await pdf();
    check('sphere light PDF is zero for a miss', values[0], 0);
    check('quad solid-angle PDF at normal incidence', values[1], 1);
    check('sphere PDF from inside is uniform', values[2], 1 / (4 * Math.PI));
    check('distant sphere PDF stays finite', values[3], 1e10 / Math.PI, 2000);
    const motion = ti.kernel(() => get_sphere_center(ti.f32([3, 2, 1]), ti.f32([-3, -2, -1]), 0.5));
    for (const [i, value] of (await motion()).entries()) check(`negative endpoint interpolation ${i}`, value, 0);
    const aabb = ti.kernel(() => {
        const box = { x: { min: 0.0, max: 1.0 }, y: { min: 0.0, max: 1.0 }, z: { min: 0.0, max: 1.0 } };
        const face = hit_aabb(new_ray([0, 0.5, -1], [0, 0, 1], 0.0), get_interval(0.0, 100.0), box);
        const outside = hit_aabb(new_ray([-1, 0.5, -1], [0, 0, 1], 0.0), get_interval(0.0, 100.0), box);
        return [ti.i32(face), ti.i32(outside)];
    });
    const slab = await aabb();
    check('parallel ray on AABB face hits', slab[0], 1);
    check('parallel ray outside AABB misses', slab[1], 0);
    const intersection = ti.kernel({ origin: ti.types.vector(ti.f32, 3), direction: ti.types.vector(ti.f32, 3) }, (origin, direction) => {
        const rec = new_hit_record();
        const hit = hit_scene(new_ray(origin, direction, 0.5), get_interval(0.001, 1000.0), rec);
        return [ti.f32(hit), rec.t, rec.normal.x, rec.normal.y, rec.normal.z];
    });
    await load([{ ...sphere, center: [0, 0, 0], offset: [2, -2, 0] }]);
    const transformed = await intersection([2, -2, 3], [0, 0, -1]);
    check('zero-sum translation still moves an object', transformed[0], 1);
    check('translated sphere distance', transformed[1], 2);
    await load([{ ...quad, rotation: [0, 90, 0], offset: [1, -1, 0] }]);
    const rotated = await intersection([2, -1, 0], [-1, 0, 0]);
    check('rotated quad world-space intersection', rotated[1], 3);
    check('rotated quad world-space normal', rotated[2], 1);
    const uv = ti.kernel(() => {
        const rec = new_hit_record();
        hit_scene(new_ray([2.0, -1.0, 0.0], [-1.0, 0.0, 0.0], 0.0), get_interval(0.001, 100.0), rec);
        return [rec.u, rec.v];
    });
    const coords = await uv();
    check('quad scalar U coordinate', coords[0], 0.5);
    check('quad scalar V coordinate', coords[1], 0.5);
    await load([{ ...sphere, center2: [0, 0, -5] }]);
    check('moving sphere BVH covers the complete trajectory', (await intersection([0, 0, 0], [0, 0, -1]))[1], 3);
    try {
        await load([]);
    } catch (error) {
        results.push({ name: 'empty scene loads', pass: false, error: error.message });
    }
    check('empty GPU scene misses', (await intersection([0, 0, 0], [0, 0, -1]))[0], 0);
    const noLights = ti.kernel(() => {
        const rec = new_hit_record();
        rec.normal = [0, 0, 1];
        const ray = new_ray([0, 0, 1], [0, 0, -1], 0.0);
        const direction = mixed_pdf_generate(ray, Materials[0], rec, 1);
        return mixed_pdf_value(ray, Materials[0], rec, direction, 1);
    });
    const noLightPdf = await noLights();
    results.push({
        name: 'no-light scene falls back to material sampling',
        value: noLightPdf,
        pass: Number.isFinite(noLightPdf) && noLightPdf > 0,
    });
    await load([{ type: 3, center: [0, 0, 0], radius: 1, mat: 0 }], [], [{ type: 5, attenuation: [1, 1, 1], k: 1 }]);
    const samples = ti.Vector.field(4, ti.f32, 8192);
    ti.addToKernelScope({ samples });
    const distributions = ti.kernel(() => {
        for (const i of ti.range(8192)) {
            const rec = new_hit_record();
            const hit1 = hit_constant_medium(Scene[0], new_ray([0, 0, -2], [0, 0, 1], 0.0), get_interval(0.001, 100), rec);
            const hit2 = hit_constant_medium(Scene[0], new_ray([0, 0, -2], [0, 0, 2], 0.0), get_interval(0.001, 100), rec);
            const unit = sphere_pdf_generate(Scene[0], [0.0, 0.0, 0.0], 0.0);
            const cosine = random_cosine_direction_vec3();
            samples[i] = [ti.f32(hit1), ti.f32(hit2), unit.z, cosine.z];
        }
    });
    await distributions();
    const data = await samples.toArray();
    const mean = (column) => data.reduce((sum, row) => sum + row[column], 0) / data.length;
    check('medium hit probability for unit ray', mean(0), 1 - Math.exp(-2), 0.025);
    check('medium hit probability is invariant to direction magnitude', mean(1), 1 - Math.exp(-2), 0.025);
    check('uniform sphere light sampling mean', mean(2), 0, 0.03);
    check('cosine hemisphere sampling mean', mean(3), 2 / 3, 0.03);
    // Independent analytic nearest-sphere distances, compared against GPU BVH and linear traversal.
    const objects = Array.from({ length: 12 }, (_, i) => ({
        type: 1,
        center: [(i % 4) * 3 - 4.5, Math.floor(i / 4) * 3 - 3, -10 - i],
        radius: 1,
        mat: 0,
    }));
    await load(objects);
    const linear = ti.kernel({ origin: ti.types.vector(ti.f32, 3), direction: ti.types.vector(ti.f32, 3) }, (origin, direction) => {
        const rec = new_hit_record();
        let closest = 1000.0;
        let found = false;
        let i = 0;
        while (i < COUNTER[0]) {
            if (hit_object(Scene[i], new_ray(origin, direction, 0.5), get_interval(0.001, closest), rec)) {
                closest = rec.t;
                found = true;
            }
            i += 1;
        }
        return [ti.f32(found), closest];
    });
    for (let i = 0; i < objects.length; i++) {
        const origin = [objects[i].center[0], objects[i].center[1], 0];
        const expected = Math.min(
            ...objects.filter((o) => o.center[0] === origin[0] && o.center[1] === origin[1]).map((o) => -o.center[2] - 1),
        );
        check(`BVH nearest hit ${i}`, (await intersection(origin, [0, 0, -1]))[1], expected);
        check(`linear nearest hit ${i}`, (await linear(origin, [0, 0, -1]))[1], expected);
    }
    return results;
}
window.gpuResults = run().then((results) => {
    document.getElementById('result').textContent = JSON.stringify(results, null, 2);
    return results;
});
