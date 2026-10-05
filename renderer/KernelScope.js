import * as ti from '../lib/taichi.js';

import { EPS, MAX_F32, OBJ_TYPE, MAT_TYPE, TEX_TYPE } from '../const.js';
import { random_i32, random_f32, degrees_to_radians } from '../classes/Math.js';
import { linear_to_gamma, process_color } from '../classes/Color.js';
import { new_ray, ray_at, ray_color, get_ray, sample_square, defocus_disk_sample, translate_ray, rotate_ray } from '../classes/Ray.js';
import { hit_object, hit_scene } from '../classes/Scene.js';
import { hit_aabb, get_aabb_axis } from '../classes/AABB.js';
import { new_onb, transform_onb } from '../classes/ONB.js';
import {
    obj_pdf_value,
    generate_obj_pdf,
    mixed_pdf_value,
    mixed_pdf_generate,
    sphere_pdf_value,
    sphere_pdf_generate,
    quad_pdf_value,
    quad_pdf_generate,
    cosine_pdf_value,
    cosine_pdf_generate,
    lights_pdf_value,
    generate_lights_pdf,
    unit_sphere_pdf_generate,
    unit_sphere_pdf_value,
} from '../classes/PDF.js';
import {
    new_scatter_record,
    material_scatter,
    material_reflectance,
    lambertian_scatter,
    metal_scatter,
    dielectric_scatter,
    isotropic_scatter,
    emitted_light,
    emitted_light_value,
    material_scattering_pdf,
    lambertian_scattering_pdf,
    isotropic_scattering_pdf,
    get_mat_data,
} from '../classes/Material.js';
import { new_hit_record, set_face_normal } from '../classes/Hittable.js';
import { hit_sphere, get_sphere_center, get_sphere_uv } from '../classes/Sphere.js';
import { initialize_camera } from '../classes/Camera.js';
import {
    random_unit_vec3,
    random_range_vec3,
    random_in_unit_sphere_vec3,
    random_on_hemisphere_vec3,
    random_in_unit_disk_vec3,
    random_cosine_direction_vec3,
    random_to_sphere,
    near_zero_vec3,
    reflect_vec3,
    refract_vec3,
    get_rotation_matrix,
} from '../classes/Vector.js';
import { get_interval, get_interval_universal, interval_clamp, interval_contains, interval_surrounds } from '../classes/Interval.js';
import { texture_color_value, get_solid_texture_value, get_checker_texture_value, image_texture_value } from '../classes/Texture.js';
import { surface_derivatives, apply_surface_maps } from '../classes/SurfaceMaps.js';
import { get_quad_bbox, get_quad_d, get_quad_normal, get_quad_w, hit_quad, quad_is_interior } from '../classes/Quad.js';
import { hit_constant_medium } from '../classes/ConstantMedium.js';
import { hit_box, box_local_ray, box_interval } from '../classes/Box.js';

export function register_kernel_scope(fields) {
    ti.addToKernelScope({ image_maps_enabled: false, emission_enabled: fields.image_maps_enabled ?? false, ...fields });
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
        hit_constant_medium,
        hit_box,
        box_local_ray,
        box_interval,
        // AABB
        hit_aabb,
        get_aabb_axis,
        // ONB
        new_onb,
        transform_onb,
        // PDF
        obj_pdf_value,
        generate_obj_pdf,
        mixed_pdf_value,
        mixed_pdf_generate,
        sphere_pdf_value,
        sphere_pdf_generate,
        quad_pdf_value,
        quad_pdf_generate,
        cosine_pdf_value,
        cosine_pdf_generate,
        lights_pdf_value,
        generate_lights_pdf,
        unit_sphere_pdf_generate,
        unit_sphere_pdf_value,
        // Color
        process_color,
        linear_to_gamma,
        // Materials
        new_scatter_record,
        material_scatter,
        lambertian_scatter,
        metal_scatter,
        material_reflectance,
        dielectric_scatter,
        isotropic_scatter,
        emitted_light,
        emitted_light_value,
        material_scattering_pdf,
        lambertian_scattering_pdf,
        isotropic_scattering_pdf,
        get_mat_data,
        // Textures
        texture_color_value,
        image_texture_value,
        surface_derivatives,
        apply_surface_maps,
        get_solid_texture_value,
        get_checker_texture_value,
        // Vector
        random_range_vec3,
        random_unit_vec3,
        random_in_unit_sphere_vec3,
        random_on_hemisphere_vec3,
        random_in_unit_disk_vec3,
        random_cosine_direction_vec3,
        random_to_sphere,
        near_zero_vec3,
        reflect_vec3,
        refract_vec3,
        get_rotation_matrix,
        // Interval
        get_interval,
        get_interval_universal,
        interval_clamp,
        interval_surrounds,
        interval_contains,
        // Math
        random_i32,
        random_f32,
        degrees_to_radians,
    });
}
