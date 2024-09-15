import * as ti from '../lib/taichi.js';

import { new_hit_record } from './Hittable.js';
import { hit_scene } from './Scene.js';
import { MAX_F32 } from '../const.js';
import { material_scatter, emitted_light } from './Material.js';
import { random_in_unit_disk_vec3, get_rotation_matrix } from './Vector.js';
import { get_interval } from './Interval.js';

/**
 * @typedef Ray
 * @property {import('./Vector').vec3} origin
 * @property {import('./Vector').vec3} direction
 * @property {number} time
 */

/**
 * @param {import('./Vector').vec3} origin
 * @param {import('./Vector').vec3} direction
 * @param {number} time
 * @return {Ray}
 */
const new_ray = (origin, direction, time = 0) => {
    return {
        origin,
        direction,
        time,
    };
};

/**
 * @param {Ray} ray
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
 * @return {Ray}
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
 * @param {Ray} ray
 * @param {number} max_depth
 * @return {import('./Vector').vec4} color
 */
const ray_color = (r, background_color, max_depth) => {
    let final_color = [0.0, 0.0, 0.0];
    let current_attenuation = [1.0, 1.0, 1.0];
    const background = background_color;

    let depth = 0;
    while (depth < max_depth) {
        depth += 1;
        const rec = new_hit_record();

        if (!hit_scene(r, get_interval(ti.f32(0.001), ti.f32(MAX_F32)), rec)) {
            final_color += current_attenuation * background;
            break;
        }

        const mat_data = material_scatter(rec.mat, r, rec);
        const emitted = emitted_light(rec.mat);
        final_color += current_attenuation * emitted;

        const scattered = mat_data.scattered;
        const attenuation = mat_data.albedo;
        if (!mat_data.scatter) {
            break;
        }

        r = scattered;
        current_attenuation *= attenuation;
    }

    return final_color;
};

/**
 * @param {Ray} r
 * @param {import('./Vector').vec3} offset
 * @return {Ray}
 */
const translate_ray = (r, offset) => {
    return new_ray(r.origin - offset, r.direction, r.time);
};

/**
 * @param {Ray} r
 * @param {import('./Vector').vec3} rotation
 * @return {Ray}
 */
const rotate_ray = (r, rotation) => {
    const rot_mat = get_rotation_matrix(rotation);
    return new_ray(ti.matmul(rot_mat, r.origin), ti.matmul(rot_mat, r.direction), r.time);
};

export { new_ray, get_ray, sample_square, defocus_disk_sample, ray_at, ray_color, translate_ray, rotate_ray };
