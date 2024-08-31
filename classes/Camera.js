import * as ti from '../lib/taichi.js';
await ti.init();

import { degrees_to_radians } from './Math.js';
import VectorFactory from './Vector.js';

const vf = new VectorFactory();

const CameraSettingCPU = ti.types.struct({
    pixel00_loc_x: ti.f32,
    pixel00_loc_y: ti.f32,
    pixel00_loc_z: ti.f32,
    pixel_delta_u_x: ti.f32,
    pixel_delta_u_y: ti.f32,
    pixel_delta_u_z: ti.f32,
    pixel_delta_v_x: ti.f32,
    pixel_delta_v_y: ti.f32,
    pixel_delta_v_z: ti.f32,
    defocus_angle: ti.f32,
    camera_center_x: ti.f32,
    camera_center_y: ti.f32,
    camera_center_z: ti.f32,
    defocus_disk_u_x: ti.f32,
    defocus_disk_u_y: ti.f32,
    defocus_disk_u_z: ti.f32,
    defocus_disk_v_x: ti.f32,
    defocus_disk_v_y: ti.f32,
    defocus_disk_v_z: ti.f32,
    max_depth: ti.i32,
});

/**
 * @typedef CameraSetting
 * @property {import("./Vector.js").vec3} pixel00_loc
 * @property {import("./Vector.js").vec3} pixel_delta_u
 * @property {import("./Vector.js").vec3} pixel_delta_v
 * @property {number} defocus_angle
 * @property {import("./Vector.js").vec3} camera_center
 * @property {import("./Vector.js").vec3} defocus_disk_u
 * @property {import("./Vector.js").vec3} defocus_disk_v
 * @property {number} max_depth
 */

const CameraSetting = ti.types.struct({
    pixel00_loc: ti.types.vector(ti.f32, 3),
    pixel_delta_u: ti.types.vector(ti.f32, 3),
    pixel_delta_v: ti.types.vector(ti.f32, 3),
    defocus_angle: ti.f32,
    camera_center: ti.types.vector(ti.f32, 3),
    defocus_disk_u: ti.types.vector(ti.f32, 3),
    defocus_disk_v: ti.types.vector(ti.f32, 3),
    max_depth: ti.i32,
});

/**
 * Initializes the camera
 * @returns {CameraSetting}
 */
const initialize_camera = (cam_set_cpu) => {
    return {
        pixel00_loc: [cam_set_cpu.pixel00_loc_x, cam_set_cpu.pixel00_loc_y, cam_set_cpu.pixel00_loc_z],
        pixel_delta_u: [cam_set_cpu.pixel_delta_u_x, cam_set_cpu.pixel_delta_u_y, cam_set_cpu.pixel_delta_u_z],
        pixel_delta_v: [cam_set_cpu.pixel_delta_v_x, cam_set_cpu.pixel_delta_v_y, cam_set_cpu.pixel_delta_v_z],
        defocus_angle: cam_set_cpu.defocus_angle,
        camera_center: [cam_set_cpu.camera_center_x, cam_set_cpu.camera_center_y, cam_set_cpu.camera_center_z],
        defocus_disk_u: [cam_set_cpu.defocus_disk_u_x, cam_set_cpu.defocus_disk_u_y, cam_set_cpu.defocus_disk_u_z],
        defocus_disk_v: [cam_set_cpu.defocus_disk_v_x, cam_set_cpu.defocus_disk_v_y, cam_set_cpu.defocus_disk_v_z],
        max_depth: cam_set_cpu.max_depth,
    };
};

/**
 * @param {import('./GUI.js').GUISettings} settings
 * @param {number} image_width
 * @param {number} image_height
 */
const get_camera_settings = (settings, image_width, image_height) => {
    const { at_z, at_y, at_x, cam_z, cam_y, cam_x, vfov, max_depth, defocus_angle, focus_dist } = settings;

    const lookfrom = [cam_x, cam_y, cam_z];
    const lookat = [at_x, at_y, at_z];
    const vup = [0, 1, 0];

    const camera_center = lookfrom;

    const theta = degrees_to_radians(vfov);
    const h = Math.tan(theta / 2);

    const viewport_height = 2 * h * focus_dist;
    const viewport_width = viewport_height * (image_width / image_height);

    const w = vf.normalized(vf.sub(lookfrom, lookat));
    const u = vf.normalized(vf.cross(vup, w));
    const v = vf.cross(w, u);

    const viewport_u = vf.scale(u, viewport_width);
    const viewport_v = vf.scale(v, viewport_height);

    const pixel_delta_u = vf.scale(viewport_u, 1 / image_width);
    const pixel_delta_v = vf.scale(viewport_v, 1 / image_height);

    const viewport_upper_left = vf.sub(
        vf.sub(vf.sub(camera_center, vf.scale(w, focus_dist)), vf.scale(viewport_u, 0.5)),
        vf.scale(viewport_v, 0.5),
    );
    const pixel00_loc = vf.add(viewport_upper_left, vf.scale(vf.add(pixel_delta_u, pixel_delta_v), 0.5));

    const defocus_radius = focus_dist * Math.tan(degrees_to_radians(defocus_angle / 2));
    const defocus_disk_u = vf.scale(u, defocus_radius);
    const defocus_disk_v = vf.scale(v, defocus_radius);

    return {
        camera_center_x: camera_center[0],
        camera_center_y: camera_center[1],
        camera_center_z: camera_center[2],
        pixel_delta_u_x: pixel_delta_u[0],
        pixel_delta_u_y: pixel_delta_u[1],
        pixel_delta_u_z: pixel_delta_u[2],
        pixel_delta_v_x: pixel_delta_v[0],
        pixel_delta_v_y: pixel_delta_v[1],
        pixel_delta_v_z: pixel_delta_v[2],
        pixel00_loc_x: pixel00_loc[0],
        pixel00_loc_y: pixel00_loc[1],
        pixel00_loc_z: pixel00_loc[2],
        max_depth,
        defocus_angle,
        defocus_disk_u_x: defocus_disk_u[0],
        defocus_disk_u_y: defocus_disk_u[1],
        defocus_disk_u_z: defocus_disk_u[2],
        defocus_disk_v_x: defocus_disk_v[0],
        defocus_disk_v_y: defocus_disk_v[1],
        defocus_disk_v_z: defocus_disk_v[2],
    };
};

function init_camera_movement(canvas, controllers, get_values, render_func) {
    let camera_moving = false;

    function move_camera_at(event) {
        if (camera_moving) {
            const x_diff = event.pageX - prev_mouse_pos.x;
            const y_diff = event.pageY - prev_mouse_pos.y;

            controllers.at_x.setValue(controllers.at_x.getValue() - x_diff / 100);
            controllers.at_y.setValue(controllers.at_y.getValue() + y_diff / 100);

            prev_mouse_pos.x = event.pageX;
            prev_mouse_pos.y = event.pageY;
        }
    }

    /**
     * @param {KeyboardEvent} event
     */
    function move_camera(event) {
        const key = event.key;

        const vals = get_values();
        const forward_vec = vf.scale(vf.sub([vals.at_x, vals.at_y, vals.at_z], [vals.cam_x, vals.cam_y, vals.cam_z]), 0.08);

        const add_vec = (vec, op = 1) => {
            controllers.cam_x.setValue(vals.cam_x + vec[0] * op);
            controllers.cam_y.setValue(vals.cam_y + vec[1] * op);
            controllers.cam_z.setValue(vals.cam_z + vec[2] * op);
            controllers.at_x.setValue(vals.at_x + vec[0] * op);
            controllers.at_y.setValue(vals.at_y + vec[1] * op);
            controllers.at_z.setValue(vals.at_z + vec[2] * op);
        };

        if (key === 'w') {
            add_vec(forward_vec);
        }
        if (key === 's') {
            add_vec(forward_vec, -1);
        }
        if (key === 'a') {
            const left_vec = vf.scale(vf.cross([0, 1, 0], forward_vec), 0.3);
            add_vec(left_vec);
        }
        if (key === 'd') {
            const right_vec = vf.scale(vf.cross(forward_vec, [0, 1, 0]), 0.3);
            add_vec(right_vec);
        }
    }

    function throttle(mainFunction, delay) {
        let timerFlag = null;

        return (...args) => {
            if (timerFlag === null) {
                mainFunction(...args);
                timerFlag = setTimeout(() => {
                    timerFlag = null;
                }, delay);
            }
        };
    }

    const throttledMove = throttle(move_camera, 30);
    const throttledMoveAt = throttle(move_camera_at, 60);

    const prev_mouse_pos = {
        x: 0,
        y: 0,
    };
    canvas.addEventListener('mousedown', (event) => {
        prev_mouse_pos.x = event.pageX;
        prev_mouse_pos.y = event.pageY;
        camera_moving = true;
    });
    canvas.addEventListener('mouseup', () => {
        camera_moving = false;
        render_func();
    });
    canvas.addEventListener('mousemove', throttledMoveAt);
    window.addEventListener('keydown', throttledMove);
    window.addEventListener('keyup', () => {
        render_func();
    });
}

export { CameraSetting, CameraSettingCPU, initialize_camera, get_camera_settings, init_camera_movement };
