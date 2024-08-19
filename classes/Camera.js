import * as ti from "../lib/taichi.js";
import { degrees_to_radians } from "./Math.js";

const initialize_camera = (image_width, image_height) => {
    const samples_per_pixel = 100;
    const max_depth = 50;
    const pixel_samples_scale = 1.0 / samples_per_pixel;

    // Determine viewport dimensions.
    const vfov = 20;              // Vertical view angle (field of view)
    const lookfrom = [-2, 2, 1];   // Point camera is looking from
    const lookat = [0, 0, -1];  // Point camera is looking at
    const vup = [0, 1, 0];     // Camera-relative "up" direction

    const defocus_angle = 10.0;  // Variation angle of rays through each pixel
    const focus_dist = 3.4;    // Distance from camera lookfrom point to plane of perfect focus

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
    const viewport_u = viewport_width * u;    // Vector across viewport horizontal edge
    const viewport_v = viewport_height * v;  // Vector down viewport vertical edge

    // Calculate the horizontal and vertical delta vectors from pixel to pixel.
    const pixel_delta_u = viewport_u / image_width;
    const pixel_delta_v = viewport_v / image_height;

    // Calculate the location of the upper left pixel.
    const viewport_upper_left = camera_center - (focus_dist * w) - viewport_u / 2 - viewport_v / 2;
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
}


export {
    initialize_camera
}