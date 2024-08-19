import * as ti from "../lib/taichi.js";
import { MAT_TYPE } from "../const.js";
import { random_unit_vec3, near_zero_vec3, reflect_vec3, refract_vec3 } from "./Vector.js";

const Material = ti.types.struct({
    type: ti.i32,
    attenuation: ti.types.vector(ti.f32, 3),
    k: ti.f32,
});

const Materials = ti.field(Material, 1000);

const material_scatter = (mat_index, r_in, rec) => {
    let res = {
        scatter: false,
        albedo: [0.0, 0.0, 0.0],
        scattered: {
            origin: rec.p,
            direction: r_in.direction
        },
    };

    const mat = Materials[[mat_index]];

    if (mat.type === MAT_TYPE.LAMBERTIAN) {
        res = lambertian_scatter(r_in, rec, mat);
    } else if (mat.type === MAT_TYPE.METAL) {
        res = metal_scatter(r_in, rec, mat);
    } else if (mat.type === MAT_TYPE.DIELECTRIC) {
        res = dielectric_scatter(r_in, rec, mat);
    }

    return res;
}

const lambertian_scatter = (r_in, rec, mat) => {
    let scatter_direction = rec.normal + random_unit_vec3();

    // Catch degenerate scatter direction
    if (near_zero_vec3(scatter_direction)) {
        scatter_direction = rec.normal;
    }

    return {
        scatter: true,
        albedo: mat.attenuation,
        scattered: {
            origin: rec.p,
            direction: scatter_direction
        }
    }
}

const metal_scatter = (r_in, rec, mat) => {
    let reflected = reflect_vec3(r_in.direction, rec.normal);
    reflected = ti.normalized(reflected) + (mat.k * random_unit_vec3());
    const scattered = {
        origin: rec.p,
        direction: reflected
    }

    return {
        scatter: ti.dot(scattered.direction, rec.normal) > 0,
        albedo: mat.attenuation,
        scattered,
    }
}

const material_reflectance = (cosine, refraction_index) => {
    // Use Schlick's approximation for reflectance.
    let r0 = (1 - refraction_index) / (1 + refraction_index);
    r0 = r0 * r0;
    return r0 + (1 - r0) * ti.pow((1 - cosine), 5);
}

const dielectric_scatter = (r_in, rec, mat) => {
    let ri = 1.0 / mat.k;
    if (!rec.front_face) {
        ri = mat.k;
    }

    const unit_direction = ti.normalized(r_in.direction);
    const cos_theta = ti.min(ti.dot(-unit_direction, rec.normal), 1.0);
    const sin_theta = Math.sqrt(1.0 - cos_theta * cos_theta);
    const cannot_refract = ri * sin_theta > 1.0;
    
    let direction = refract_vec3(unit_direction, rec.normal, ri);
    if (cannot_refract || material_reflectance(cos_theta, ri) > ti.random()) {
        direction = reflect_vec3(unit_direction, rec.normal);
    }

    return {
        scatter: true,
        albedo: mat.attenuation,
        scattered: {
            origin: rec.p,
            direction: direction
        }
    };
}

export {
    Materials,
    material_scatter,
    lambertian_scatter,
    metal_scatter,
    material_reflectance,
    dielectric_scatter,
}