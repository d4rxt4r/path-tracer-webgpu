import * as ti from './lib/taichi.js';

import { EPS, MAX_F32, OBJ_TYPE, MAT_TYPE, TEX_TYPE } from './const.js';
import { throttle, random_f32, degrees_to_radians } from './classes/Math.js';
import { linear_to_gamma, process_color } from './classes/Color.js';
import { new_ray, ray_at, ray_color, get_ray, sample_square, defocus_disk_sample, translate_ray, rotate_ray } from './classes/Ray.js';
import { init_scene, hit_object, hit_scene } from './classes/Scene.js';
import { hit_aabb, get_aabb_axis } from './classes/AABB.js';
import {
    Material,
    material_scatter,
    material_reflectance,
    lambertian_scatter,
    metal_scatter,
    dielectric_scatter,
    emitted_light,
} from './classes/Material.js';
import { Hittable, new_hit_record, set_face_normal } from './classes/Hittable.js';
import { hit_sphere, get_sphere_center, get_sphere_uv } from './classes/Sphere.js';
import { CameraSettingCPU, initialize_camera, get_camera_settings, init_camera_movement } from './classes/Camera.js';
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
    get_rotation_matrix,
} from './classes/Vector.js';
import { get_interval, interval_clamp, interval_contains, interval_surrounds } from './classes/Interval.js';
import { create_gui, copy_camera_settings } from './classes/GUI.js';
import { BVHNode } from './classes/BVHTree.js';
import { Texture, texture_color_value, get_solid_texture_value, get_checker_texture_value } from './classes/Texture.js';
import { get_quad_bbox, get_quad_d, get_quad_normal, get_quad_w, hit_quad, quad_is_interior } from './classes/Quad.js';

let total_samples = 0;
let frame_id = null;
const aspectRatio = 16.0 / 9.0;
const image_width = 1200;
const image_height = Number.parseInt(image_width / aspectRatio);
const canvasSize = [image_width, image_height];

const htmlCanvas = document.getElementById('canvas');
htmlCanvas.width = image_width;
htmlCanvas.height = image_height;

let scene_index = 0;
const { gui, controllers } = create_gui(SCENE_LIST[scene_index].camera);

init_camera_movement(htmlCanvas, controllers, gui.get_values.bind(gui));

const BVHTree = ti.field(BVHNode, 1000);
const Scene = ti.field(Hittable, 1000);
const Materials = ti.field(Material, 1000);
const Textures = ti.field(Texture, 100);

/* global Stats */
const stats = new Stats();
document.body.appendChild(stats.dom);

const main = async () => {
    await ti.init();

    let canvas = new ti.Canvas(htmlCanvas);
    const colorBuffer = ti.Vector.field(3, ti.f32, canvasSize);
    const pixelsBuffer = ti.Vector.field(4, ti.f32, canvasSize);

    ti.addToKernelScope({
        total_samples,
        image_width,
        image_height,
        colorBuffer,
        pixelsBuffer,
        BVHTree,
        Scene,
        Materials,
        Textures,
    });

    await init_scene(SCENE_LIST[scene_index], Scene, BVHTree, Materials, Textures);

    ti.addToKernelScope({
        EPS,
        MAX_F32,
        OBJ_TYPE,
        MAT_TYPE,
        TEX_TYPE,
        // Camera
        initialize_camera,
        // Ray
        new_ray,
        get_ray,
        sample_square,
        defocus_disk_sample,
        ray_at,
        ray_color,
        translate_ray,
        rotate_ray,
        // Hittable
        set_face_normal,
        new_hit_record,
        // Scene
        hit_scene,
        hit_object,
        // Primitives
        hit_sphere,
        get_sphere_center,
        get_sphere_uv,
        hit_quad,
        get_quad_bbox,
        get_quad_normal,
        get_quad_d,
        get_quad_w,
        quad_is_interior,
        // AABB
        hit_aabb,
        get_aabb_axis,
        // Color
        process_color,
        linear_to_gamma,
        // Materials
        material_scatter,
        lambertian_scatter,
        metal_scatter,
        material_reflectance,
        dielectric_scatter,
        emitted_light,
        // Textures
        texture_color_value,
        get_solid_texture_value,
        get_checker_texture_value,
        // Vector
        random_range_vec3,
        random_unit_vec3,
        random_in_unit_sphere_vec3,
        random_on_hemisphere_vec3,
        random_in_unit_disk_vec3,
        near_zero_vec3,
        reflect_vec3,
        refract_vec3,
        get_rotation_matrix,
        // Interval
        get_interval,
        interval_clamp,
        interval_surrounds,
        interval_contains,
        // Math
        random_f32,
        degrees_to_radians,
    });

    const render = ti.kernel({ camera_setting_from_cpu: CameraSettingCPU }, (camera_setting_from_cpu) => {
        const camera_settings = initialize_camera(camera_setting_from_cpu);
        for (let I of ti.ndrange(image_width, image_height)) {
            const i = I[0];
            const j = I[1];
            const ray = get_ray(i, j, camera_settings);
            colorBuffer[I] += ray_color(ray, camera_settings.background, camera_settings.max_depth);
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

    async function fast_pass() {
        const camera_settings = get_camera_settings(gui.get_values(), image_width, image_height);
        clear_color_buffer();

        stats.begin();

        render(camera_settings);
        total_samples = 1;
        tone_map(total_samples);
        canvas.setImage(pixelsBuffer);

        stats.end();
    }

    async function full_pass() {
        const gui_values = gui.get_values();
        const { spp } = gui_values;
        const camera_settings = get_camera_settings(gui_values, image_width, image_height);

        if (total_samples < spp) {
            stats.begin();

            render(camera_settings);
            total_samples += 1;
            tone_map(total_samples);
            canvas.setImage(pixelsBuffer);

            stats.end();

            frame_id = requestAnimationFrame(full_pass);
        }
    }

    const throttled_fast_pass = throttle(fast_pass, 30);

    gui.onChange(async (event) => {
        if (event.property === 'scene') {
            scene_index = event.value;
            copy_camera_settings(SCENE_LIST[scene_index].camera, controllers);
            main();
            return;
        }

        if (frame_id) {
            cancelAnimationFrame(frame_id);
            frame_id = null;
        }

        requestAnimationFrame(throttled_fast_pass);
    });

    gui.onFinishChange((event) => {
        if (event.property === 'scene') {
            return;
        }

        if (frame_id) {
            cancelAnimationFrame(frame_id);
            frame_id = null;
        }

        full_pass();
    });

    full_pass();
};

main();
