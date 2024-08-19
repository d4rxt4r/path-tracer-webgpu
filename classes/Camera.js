import * as ti from "../lib/taichi.js";
import { degrees_to_radians } from "./Math.js";

const initialize_camera = (image_width, image_height) => {
    const samples_per_pixel = 50;
    const max_depth = 50;
    const pixel_samples_scale = 1.0 / samples_per_pixel;

    // Determine viewport dimensions.
    const vfov = 20;              // Vertical view angle (field of view)
    const lookfrom = [13, 2, 3];   // Point camera is looking from
    const lookat = [0, 0, 0];  // Point camera is looking at
    const vup = [0, 1, 0];     // Camera-relative "up" direction

    const camera_center = lookfrom;
    const focal_length = (lookfrom - lookat).norm();

    const theta = degrees_to_radians(vfov);
    const h = Math.tan(theta / 2);
    const viewport_height = 2.0 * h * focal_length;
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
    const viewport_upper_left = camera_center - (focal_length * w) - viewport_u / 2 - viewport_v / 2;
    const pixel00_loc = viewport_upper_left + 0.5 * (pixel_delta_u + pixel_delta_v);

    return {
        focal_length,
        viewport_height,
        viewport_width,
        camera_center,
        viewport_u,
        viewport_v,
        pixel_delta_u,
        pixel_delta_v,
        viewport_upper_left,
        pixel00_loc,
        image_height,
        image_width,
        samples_per_pixel,
        pixel_samples_scale,
        max_depth,
        vfov,
    };
}


export {
    initialize_camera
}