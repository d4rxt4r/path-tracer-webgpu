import * as ti from "./lib/taichi.js";
await ti.init();

import { EPS, MAX_F32, OBJ_TYPE, MAT_TYPE } from './const.js';
import { clamp, linear_to_gamma, degrees_to_radians } from "./classes/Math.js";
import { ray_at, get_bg_color, ray_color, get_ray, sample_square, defocus_disk_sample } from "./classes/Ray.js";
import { Scene, init_scene, hit_scene } from "./classes/Scene.js";
import {
    Materials,
    material_scatter,
    material_reflectance,
    lambertian_scatter,
    metal_scatter,
    dielectric_scatter,
} from "./classes/Material.js";
import { set_face_normal } from './classes/Hittable.js';
import { hit_sphere } from './classes/Sphere.js';
import { initialize_camera } from "./classes/Camera.js";
// eslint-disable-next-line
import { scene_1, scene_1_mat, scene_2, scene_2_mat } from "./scenes.js";
import {
    random_range_f32,
    random_unit_vec3,
    random_range_vec3,
    random_in_unit_sphere_vec3,
    random_on_hemisphere_vec3,
    random_in_unit_disk_vec3,
    near_zero_vec3,
    reflect_vec3,
    refract_vec3,
} from "./classes/Vector.js";

const aspectRatio = 16.0 / 9.0;
const image_width = 400;
const image_height = Number.parseInt(image_width / aspectRatio);
const canvasSize = [image_width, image_height];

const htmlCanvas = document.getElementById("canvas");
htmlCanvas.width = image_width;
htmlCanvas.height = image_height;

let canvas = new ti.Canvas(htmlCanvas);
const pixels = ti.Vector.field(4, ti.f32, canvasSize);

ti.addToKernelScope({
    EPS,
    MAX_F32,
    OBJ_TYPE,
    MAT_TYPE,
    image_height,
    image_width,
    pixels,
    // Camera
    initialize_camera,
    // Ray
    get_ray,
    sample_square,
    defocus_disk_sample,
    ray_at,
    get_bg_color,
    ray_color,
    // Hittable
    set_face_normal,
    hit_scene,
    hit_sphere,
    // Materials
    material_scatter,
    lambertian_scatter,
    metal_scatter,
    material_reflectance,
    dielectric_scatter,
    // Vector
    random_range_f32,
    random_range_vec3,
    random_unit_vec3,
    random_in_unit_sphere_vec3,
    random_on_hemisphere_vec3,
    random_in_unit_disk_vec3,
    near_zero_vec3,
    reflect_vec3,
    refract_vec3,
    // Math
    clamp,
    linear_to_gamma,
    degrees_to_radians,
});

await init_scene(scene_1, scene_1_mat);
ti.addToKernelScope({ Scene, Materials });

const render = ti.kernel(() => {
    const camera_settings = initialize_camera(image_width, image_height);

    for (let I of ti.ndrange(image_width, image_height)) {
        const i = I[0];
        const j = I[1];

        let pixel_color = [0.0, 0.0, 0.0, 0.0];
        // eslint-disable-next-line
        for (let _ of ti.range(camera_settings.samples_per_pixel)) {
            const ray = get_ray(i, j, camera_settings);
            pixel_color += ray_color(ray, camera_settings.max_depth);
        }
        pixel_color *= camera_settings.pixel_samples_scale;

        pixels[(i, j)] = [
            ti.f32(1 * clamp(linear_to_gamma(pixel_color.r), 0.0, 0.999)),
            ti.f32(1 * clamp(linear_to_gamma(pixel_color.g), 0.0, 0.999)),
            ti.f32(1 * clamp(linear_to_gamma(pixel_color.b), 0.0, 0.999)),
            1.0
        ];
    }

    return camera_settings;
});

console.log(await render());
canvas.setImage(pixels);