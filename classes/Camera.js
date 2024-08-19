import * as ti from '../lib/taichi.js';
import { degrees_to_radians } from './Math.js';

/**
 * @typedef CameraSetting
 * @property {import("./Vector.js").vec3} camera_center
 * @property {import("./Vector.js").vec3} pixel_delta_u
 * @property {import("./Vector.js").vec3} pixel_delta_v
 * @property {import("./Vector.js").vec3} viewport_upper_left
 * @property {import("./Vector.js").vec3} pixel00_loc
 * @property {number} samples_per_pixel
 * @property {number} pixel_samples_scale
 * @property {number} max_depth
 * @property {number} defocus_angle
 * @property {import("./Vector.js").vec3} defocus_disk_u
 * @property {import("./Vector.js").vec3} defocus_disk_v
 */

const CameraSetting = ti.types.struct({
    camera_center: ti.types.vector(ti.f32, 3),
    pixel_delta_u: ti.types.vector(ti.f32, 3),
    pixel_delta_v: ti.types.vector(ti.f32, 3),
    viewport_upper_left: ti.types.vector(ti.f32, 3),
    pixel00_loc: ti.types.vector(ti.f32, 3),
    samples_per_pixel: ti.i32,
    pixel_samples_scale: ti.f32,
    max_depth: ti.i32,
    defocus_angle: ti.f32,
    defocus_disk_u: ti.types.vector(ti.f32, 3),
    defocus_disk_v: ti.types.vector(ti.f32, 3),
});

/**
 * Initializes the camera
 * @param {number} image_width
 * @param {number} image_height
 */
const initialize_camera = (image_width, image_height) => {
    const samples_per_pixel = 10;
    const max_depth = 100;
    const pixel_samples_scale = 1.0 / samples_per_pixel;

    // Determine viewport dimensions.
    const vfov = 20; // Vertical view angle (field of view)
    const lookfrom = [13, 2, 3]; // Point camera is looking from
    const lookat = [0, 0, 0]; // Point camera is looking at
    const vup = [0, 1, 0]; // Camera-relative "up" direction

    const defocus_angle = 0.5; // Variation angle of rays through each pixel
    const focus_dist = 10.4; // Distance from camera lookfrom point to plane of perfect focus

    const camera_center = lookfrom;

    const theta = degrees_to_radians(vfov);
    const h = Math.tan(theta / 2);
    const viewport_height = 2 * h * focus_dist;
    const viewport_width = viewport_height * (image_width / image_height);

    // Calculate the u,v,w unit basis vectors for the camera coordinate frame.
    const w = ti.normalized(lookfrom - lookat);
    const u = ti.normalized(ti.cross(vup, w));
    const v = ti.cross(w, u);

    // Calculate the vectors across the horizontal and down the vertical viewport edges.
    const viewport_u = viewport_width * u; // Vector across viewport horizontal edge
    const viewport_v = viewport_height * v; // Vector down viewport vertical edge

    // Calculate the horizontal and vertical delta vectors from pixel to pixel.
    const pixel_delta_u = viewport_u / image_width;
    const pixel_delta_v = viewport_v / image_height;

    // Calculate the location of the upper left pixel.
    const viewport_upper_left = camera_center - focus_dist * w - viewport_u / 2 - viewport_v / 2;
    const pixel00_loc = viewport_upper_left + 0.5 * (pixel_delta_u + pixel_delta_v);

    const defocus_radius = focus_dist * ti.tan(degrees_to_radians(defocus_angle / 2));
    const defocus_disk_u = u * defocus_radius;
    const defocus_disk_v = v * defocus_radius;

    return {
        camera_center,
        pixel_delta_u,
        pixel_delta_v,
        viewport_upper_left,
        pixel00_loc,
        samples_per_pixel,
        pixel_samples_scale,
        max_depth,
        defocus_angle,
        defocus_disk_u,
        defocus_disk_v,
    };
};

export { CameraSetting, initialize_camera };
