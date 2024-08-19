import * as ti from "../lib/taichi.js";
import { hit_scene } from "./Scene.js";
// import { random_on_hemisphere_vec3, random_unit_vec3 } from "./Vector.js";
import { MAX_F32 } from "../const.js";
import { material_scatter } from "./Material.js";
import { random_in_unit_disk_vec3 } from "./Vector.js";

/**
 * @typedef Ray
 * @property {import('./Vector').vec3} origin
 * @property {import('./Vector').vec4} direction
 */

/**
 * @param {Ray} ray
 * @param {number} t
 */
const ray_at = (ray, t) => {
    return ray.origin + t * ray.direction;
}

const sample_square = () => {
    // Returns the vector to a random point in the [-.5,-.5]-[+.5,+.5] unit square.
    return [ti.random() - 0.5, ti.random() - 0.5];
}

const defocus_disk_sample = (camera_settings) => {
    // Returns a random point in the camera defocus disk.
    const p = random_in_unit_disk_vec3();
    return camera_settings.camera_center + (p[0] * camera_settings.defocus_disk_u) + (p[1] * camera_settings.defocus_disk_v);
}

const get_ray = (i, j, camera_settings) => {
    // Construct a camera ray originating from the origin and directed at randomly sampled
    // point around the pixel location i, j.
    const offset = sample_square();
    const pixel_sample = camera_settings.pixel00_loc
        + ((i + offset.x) * camera_settings.pixel_delta_u)
        + ((j + offset.y) * camera_settings.pixel_delta_v);

    let ray_origin = ti.f32(camera_settings.camera_center);
    if (camera_settings.defocus_angle > 0) {
        ray_origin = defocus_disk_sample(camera_settings);
    }
    const ray_direction = pixel_sample - ray_origin;

    const ray = {
        origin: ray_origin,
        direction: ray_direction,
    }

    return ray;
}

const get_bg_color = (ray) => {
    const unit_direction = ti.normalized(ray.direction);
    const a = 0.5 * (unit_direction.y + 1.0);

    return (1.0 - a) * [1.0, 1.0, 1.0] + a * [0.5, 0.7, 1.0];
}

/**
 * @param {Ray} ray
 * @return {import('./Vector').vec4} color
 */
const ray_color = (ray, max_depth) => {
    let temp_ray = {
        origin: ti.f32(ray.origin),
        direction: ray.direction
    }

    let result_color = [1.0, 1.0, 1.0];
    let depth = max_depth;

    while (depth > 0) {
        let rec = {
            p: [0.0, 0.0, 0.0],
            normal: [0.0, 0.0, 0.0],
            t: 0.0,
            front_face: true,
            mat: -1,
        }

        if (hit_scene(temp_ray, 0.001, MAX_F32, rec)) {
            const mat_data = material_scatter(rec.mat, temp_ray, rec);
            if (mat_data.scatter) {
                temp_ray.origin = mat_data.scattered.origin;
                temp_ray.direction = mat_data.scattered.direction;

                result_color *= mat_data.albedo;
            } else {
                result_color *= 0.5;
            }
        } else {
            break;
        }

        depth -= 1;
    }

    return [result_color.rgb, 1.0];
}

export {
    get_ray,
    sample_square,
    defocus_disk_sample,
    ray_at,
    get_bg_color,
    ray_color
}