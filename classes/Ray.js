/* global Materials */

import * as ti from '../lib/taichi.js';

import { new_hit_record } from './Hittable.js';
import { hit_scene } from './Scene.js';
import { MAX_F32 } from '../const.js';
import { new_scatter_record, material_scatter, material_scattering_pdf, emitted_light, get_mat_data } from './Material.js';
import { random_in_unit_disk_vec3, get_rotation_matrix } from './Vector.js';
import { get_interval } from './Interval.js';
import { mixed_pdf_value, mixed_pdf_generate } from './PDF.js';

/**
 * @typedef TRay
 * @property {import('./Vector').vec3} origin
 * @property {import('./Vector').vec3} direction
 * @property {number} time
 */

const Ray = ti.types.struct({
    origin: ti.types.vector(ti.f32, 3),
    direction: ti.types.vector(ti.f32, 3),
    time: ti.f32,
});

/**
 * @param {import('./Vector').vec3} origin
 * @param {import('./Vector').vec3} direction
 * @param {number} time
 * @return {TRay}
 */
const new_ray = (origin, direction, time = 0) => {
    return {
        origin,
        direction,
        time,
    };
};

/**
 * @param {TRay} ray
 * @param {number} t
 * @return {import('./Vector').vec3}
 */
const ray_at = (ray, t) => {
    return ray.origin + t * ray.direction;
};

/**
 * Returns the vector to a random point in the [-.5,-.5]-[+.5,+.5] unit square.
 * @return {import('./Vector').vec3}
 */
const sample_square = () => {
    return [ti.random() - 0.5, ti.random() - 0.5];
};

/**
 * Returns a random point in the camera defocus disk.
 * @param {import('./Camera.js').CameraSetting} camera_settings
 * @return {import('./Vector').vec3}
 */
const defocus_disk_sample = (camera_settings) => {
    const p = random_in_unit_disk_vec3();
    return camera_settings.camera_center + p[0] * camera_settings.defocus_disk_u + p[1] * camera_settings.defocus_disk_v;
};

/**
 * Construct a camera ray originating from the origin and directed at randomly sampled point around the pixel location i, j.
 * @param {number} i
 * @param {number} j
 * @param {import('./Camera.js').CameraSetting} camera_settings
 * @return {TRay}
 */
const get_ray = (i, j, camera_settings) => {
    const offset = sample_square();
    const pixel_sample =
        camera_settings.pixel00_loc + (i + offset.x) * camera_settings.pixel_delta_u + (j + offset.y) * camera_settings.pixel_delta_v;

    let ray_origin = ti.f32(camera_settings.camera_center);
    if (camera_settings.defocus_angle > 0) {
        ray_origin = defocus_disk_sample(camera_settings);
    }
    const ray_direction = pixel_sample - ray_origin;

    return new_ray(ray_origin, ray_direction, ti.random());
};

/**
 * Returns the color of the ray after hitting the scene.
 * @param {TRay} ray
 * @param {number} max_depth
 * @return {import('./Vector').vec4} color
 */
const ray_color = (r, background_color, max_depth) => {
    let final_color = [0.0, 0.0, 0.0];
    let current_attenuation = [1.0, 1.0, 1.0];
    let depth = 0;

    while (depth < max_depth) {
        depth += 1;
        const rec = new_hit_record();

        // If the ray hits nothing, return the accumulated color plus background
        if (!hit_scene(r, get_interval(ti.f32(0.001), ti.f32(MAX_F32)), rec)) {
            final_color += current_attenuation * background_color;
            break;
        }

        const mat = Materials[rec.mat];
        const mat_data = get_mat_data(mat, rec);

        const srec = new_scatter_record();
        material_scatter(rec.mat, r, rec, srec);

        final_color += current_attenuation * emitted_light(rec.mat, rec);

        // If the material doesn't scatter, return the accumulated color
        if (!srec.scatter) {
            break;
        }

        // If the material is specular, return the accumulated color
        if (srec.skip_pdf) {
            r = srec.skip_pdf_ray;
            current_attenuation *= mat_data.attenuation;
            continue;
        }

        const pdf_direction = mixed_pdf_generate(r, mat, rec);
        const scattered = new_ray(rec.p, pdf_direction, r.time);
        const pdf_val = mixed_pdf_value(r, mat, rec, scattered);
        const scattering_pdf = material_scattering_pdf(r, mat, rec, scattered);

        r = scattered;
        current_attenuation *= (mat_data.attenuation * scattering_pdf) / pdf_val;
    }

    return final_color;
};

/**
 * @param {TRay} r
 * @param {import('./Vector').vec3} offset
 * @return {TRay}
 */
const translate_ray = (r, offset) => {
    return new_ray(r.origin - offset, r.direction, r.time);
};

/**
 * @param {TRay} r
 * @param {import('./Vector').vec3} rotation
 * @return {TRay}
 */
const rotate_ray = (r, rotation) => {
    const rot_mat = get_rotation_matrix(rotation);
    return new_ray(ti.matmul(rot_mat, r.origin), ti.matmul(rot_mat, r.direction), r.time);
};

export { Ray, new_ray, get_ray, sample_square, defocus_disk_sample, ray_at, ray_color, translate_ray, rotate_ray };
