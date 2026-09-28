/* global Scene, Materials, BVHTree */
import * as ti from '../lib/taichi.js';
import { register_kernel_scope } from '../renderer/KernelScope.js';
import { create_renderer } from '../renderer/Renderer.js';
import { get_camera_settings } from '../classes/Camera.js';
import { default_settings } from '../classes/GUI.js';
import { hit_aabb } from '../classes/AABB.js';
import { hit_scene, hit_object } from '../classes/Scene.js';
import { new_hit_record } from '../classes/Hittable.js';
import { get_interval } from '../classes/Interval.js';
import { new_ray } from '../classes/Ray.js';
import { mixed_pdf_value, mixed_pdf_generate } from '../classes/PDF.js';
import { random_unit_vec3, random_in_unit_disk_vec3 } from '../classes/Vector.js';

const scene = {
    objects: [
        { type: 1, center: [0, 0, -3], radius: 1, mat: 0 },
        { type: 2, Q: [-2, -1, -5], u: [4, 0, 0], v: [0, 2, 0], mat: 0 },
    ],
    lights: [{ type: 2, Q: [-2, -1, -5], u: [4, 0, 0], v: [0, 2, 0] }],
    materials: [{ type: 1, attenuation: [0.8, 0.8, 0.8] }],
};
const renderer = await create_renderer(document.createElement('canvas'), { scenes: [scene], width: 16, height: 16 });
await renderer.loadScene(scene);
renderer.setCamera(get_camera_settings(default_settings, 16, 16));
const output = ti.Vector.field(4, ti.f32, 8192);
register_kernel_scope({ ...renderer.fields, output });
const intersections = ti.kernel(() => {
    for (let i of ti.range(8192)) {
        const origin = [ti.f32(i % 32) / 16 - 1, ti.f32(i % 17) / 17 - 0.5, 0.0];
        const r = new_ray(origin, [0.0, 0.0, -1.0], 0.0);
        const rec = new_hit_record();
        const primitive = hit_object(Scene[i % 2], r, get_interval(0.001, 100.0), rec);
        const aabb = hit_aabb(r, get_interval(0.001, 100.0), BVHTree[0].bbox);
        const bvh = hit_scene(r, get_interval(0.001, 100.0), rec);
        output[i] = [ti.f32(primitive), ti.f32(aabb), ti.f32(bvh), rec.t];
    }
});
const sampling = ti.kernel(() => {
    for (let i of ti.range(8192)) {
        const sphere = random_unit_vec3();
        const disk = random_in_unit_disk_vec3();
        output[i] = [sphere.x, sphere.z, disk.x, disk.y];
    }
});
const pdf = ti.kernel(() => {
    for (let i of ti.range(8192)) {
        const rec = new_hit_record();
        rec.normal = [0.0, 0.0, 1.0];
        rec.p = [ti.f32(i % 32) / 32 - 0.5, 0.0, -6.0];
        const ray = new_ray(rec.p, [0.0, 0.0, 1.0], 0.0);
        const direction = mixed_pdf_generate(ray, Materials[0], rec, 0.5);
        output[i] = [mixed_pdf_value(ray, Materials[0], rec, direction, 0.5), direction.x, direction.y, direction.z];
    }
});
window.micro = { intersections, sampling, pdf, read: () => output.toArray() };
