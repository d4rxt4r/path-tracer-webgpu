import * as ti from './lib/taichi.js';
await ti.init();

import { EPS, MAX_F32, OBJ_TYPE, MAT_TYPE } from './const.js';
import { throttle, clamp, degrees_to_radians, random_f32 } from './classes/Math.js';
import { linear_to_gamma, process_color } from './classes/Color.js';
import { new_ray, ray_at, ray_color, get_ray, sample_square, defocus_disk_sample } from './classes/Ray.js';
import { Scene, init_scene, hit_scene } from './classes/Scene.js';
import { hit_aabb, get_aabb_axis } from './classes/AABB.js';
import {
    Materials,
    material_scatter,
    material_reflectance,
    lambertian_scatter,
    metal_scatter,
    dielectric_scatter,
    emitted_light,
} from './classes/Material.js';
import { set_face_normal } from './classes/Hittable.js';
import { hit_sphere, get_sphere_center } from './classes/Sphere.js';
import { CameraSettingCPU, initialize_camera, get_camera_settings, init_camera_movement } from './classes/Camera.js';
// eslint-disable-next-line no-unused-vars
import { SCENE_LIST } from './scenes.js';
import {
    random_unit_vec3,
    random_range_vec3,
    random_in_unit_sphere_vec3,
    random_on_hemisphere_vec3,
    random_in_unit_disk_vec3,
    near_zero_vec3,
    reflect_vec3,
    refract_vec3,
} from './classes/Vector.js';
import { get_interval, interval_clamp, interval_surrounds } from './classes/Interval.js';
import { createGui } from './classes/GUI.js';
import { BVHTree } from './classes/BVHTree.js';

const scene_index = 1;
const { gui, controllers } = createGui(SCENE_LIST[scene_index].camera);

gui.onChange(async (event) => {
    // TODO: fix scene change, uniform doesnt updates :(
    // if (event.property === 'scene') {
    //     await init_scene(SCENE_LIST[event.value]);
    // }

    requestAnimationFrame(throttled_fast_pass);
});

gui.onFinishChange(() => {
    requestAnimationFrame(throttled_full_pass);
});

await init_scene(SCENE_LIST[scene_index]);

ti.addToKernelScope({ BVHTree, Scene, Materials });

let total_samples = 0;
const aspectRatio = 16.0 / 9.0;
const image_width = document.body.clientWidth;
const image_height = Number.parseInt(image_width / aspectRatio);
const canvasSize = [image_width, image_height];

const htmlCanvas = document.getElementById('canvas');
htmlCanvas.width = image_width;
htmlCanvas.height = image_height;

let canvas = new ti.Canvas(htmlCanvas);
const colorBuffer = ti.Vector.field(3, ti.f32, canvasSize);
const pixelsBuffer = ti.Vector.field(4, ti.f32, canvasSize);

ti.addToKernelScope({
    EPS,
    MAX_F32,
    OBJ_TYPE,
    MAT_TYPE,
    image_height,
    image_width,
    colorBuffer,
    pixelsBuffer,
    total_samples,
    // Camera
    initialize_camera,
    // Ray
    new_ray,
    get_ray,
    sample_square,
    defocus_disk_sample,
    ray_at,
    ray_color,
    // Hittable
    set_face_normal,
    hit_scene,
    hit_sphere,
    get_sphere_center,
    // AABB
    hit_aabb,
    get_aabb_axis,
    // Color
    linear_to_gamma,
    process_color,
    // Materials
    material_scatter,
    lambertian_scatter,
    metal_scatter,
    material_reflectance,
    dielectric_scatter,
    emitted_light,
    // Vector
    random_range_vec3,
    random_unit_vec3,
    random_in_unit_sphere_vec3,
    random_on_hemisphere_vec3,
    random_in_unit_disk_vec3,
    near_zero_vec3,
    reflect_vec3,
    refract_vec3,
    // Interval
    get_interval,
    interval_clamp,
    interval_surrounds,
    // Math
    clamp,
    random_f32,
    degrees_to_radians,
});

const render = ti.kernel({ camera_setting_from_cpu: CameraSettingCPU }, (camera_setting_from_cpu) => {
    const camera_settings = initialize_camera(camera_setting_from_cpu);
    for (let I of ti.ndrange(image_width, image_height)) {
        const i = I[0];
        const j = I[1];
        const ray = get_ray(i, j, camera_settings);
        colorBuffer[I] += ray_color(ray, camera_settings.max_depth);
    }
});

const clear_color_buffer = ti.kernel(() => {
    for (const I of ti.ndrange(image_width, image_height)) {
        colorBuffer[I] = [0.0, 0.0, 0.0];
    }
});

const tone_map = ti.kernel((total_samples) => {
    for (const I of ti.ndrange(image_width, image_height)) {
        pixelsBuffer[I] = process_color(colorBuffer[I] / total_samples);
    }
});

ti.addToKernelScope({
    tone_map,
    clear_color_buffer,
});

const fast_pass = () => {
    const camera_settings = get_camera_settings(gui.get_values(), image_width, image_height);
    clear_color_buffer();
    render(camera_settings);
    total_samples = 1;
    tone_map(total_samples);
    canvas.setImage(pixelsBuffer);
};

const full_pass = () => {
    const gui_values = gui.get_values();
    const { spp } = gui_values;

    const camera_settings = get_camera_settings(gui_values, image_width, image_height);

    if (total_samples < spp) {
        render(camera_settings);
        total_samples += 1;
        tone_map(total_samples);
        canvas.setImage(pixelsBuffer);
        requestAnimationFrame(full_pass);
    }
};

const throttled_fast_pass = throttle(fast_pass, 10);
const throttled_full_pass = throttle(full_pass, 10);

fast_pass();
init_camera_movement(htmlCanvas, controllers, gui.get_values.bind(gui), full_pass);
