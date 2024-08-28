import * as ti from './lib/taichi.js';
await ti.init();

import { EPS, MAX_F32, OBJ_TYPE, MAT_TYPE } from './const.js';
import { clamp, degrees_to_radians, random_f32 } from './classes/Math.js';
import { linear_to_gamma, process_color } from './classes/Color.js';
import { ray_at, ray_color, get_ray, sample_square, defocus_disk_sample } from './classes/Ray.js';
import { Scene, init_scene, hit_scene } from './classes/Scene.js';
import {
    Materials,
    material_scatter,
    material_reflectance,
    lambertian_scatter,
    metal_scatter,
    dielectric_scatter,
} from './classes/Material.js';
import { set_face_normal } from './classes/Hittable.js';
import { hit_sphere } from './classes/Sphere.js';
import { CameraSettingCPU, initialize_camera, get_camera_settings } from './classes/Camera.js';
// eslint-disable-next-line no-unused-vars
import { scene_1, scene_1_mat, scene_2, scene_2_mat } from './scenes.js';
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

let total_samples = 0;
let camera_moving = false;
const aspectRatio = 16.0 / 9.0;
const image_width = 800;
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
    get_ray,
    sample_square,
    defocus_disk_sample,
    ray_at,
    ray_color,
    // Hittable
    set_face_normal,
    hit_scene,
    hit_sphere,
    // Color
    linear_to_gamma,
    process_color,
    // Materials
    material_scatter,
    lambertian_scatter,
    metal_scatter,
    material_reflectance,
    dielectric_scatter,
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

await init_scene(scene_1, scene_1_mat);
ti.addToKernelScope({ Scene, Materials });

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

const { gui, controllers, get_values } = createGui();
gui.onChange(() => {
    fast_pass();
});

function move_camera(event) {
    if (camera_moving) {
        const x_diff = event.pageX - prev_mouse_pos.x;
        const y_diff = event.pageY - prev_mouse_pos.y;

        controllers.cam_x.setValue(controllers.cam_x.getValue() + x_diff / 100);
        controllers.cam_y.setValue(controllers.cam_y.getValue() + y_diff / 100);

        prev_mouse_pos.x = event.pageX;
        prev_mouse_pos.y = event.pageY;
    }
}

const prev_mouse_pos = {
    x: 0,
    y: 0,
};
htmlCanvas.addEventListener('mousedown', (event) => {
    prev_mouse_pos.x = event.pageX;
    prev_mouse_pos.y = event.pageY;
    camera_moving = true;
});
htmlCanvas.addEventListener('mouseup', () => {
    camera_moving = false;
    full_pass();
});
htmlCanvas.addEventListener('mousemove', move_camera);

const fast_pass = () => {
    const camera_settings = get_camera_settings(get_values(), image_width, image_height);
    clear_color_buffer();
    render(camera_settings);
    total_samples = 1;
    tone_map(total_samples);
    canvas.setImage(pixelsBuffer);
};

const full_pass = () => {
    const camera_settings = get_camera_settings(get_values(), image_width, image_height);
    const { spp } = get_values();
    if (total_samples < spp) {
        render(camera_settings);
        total_samples += 1;
        tone_map(total_samples);
        canvas.setImage(pixelsBuffer);
        requestAnimationFrame(full_pass);
    }
};

full_pass();
