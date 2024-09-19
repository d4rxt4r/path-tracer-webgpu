/* global Materials */

import * as ti from '../lib/taichi.js';

import { new_ray } from './Ray.js';
import { MAT_TYPE, get_record_from_struct } from '../const.js';
import { random_unit_vec3, reflect_vec3, refract_vec3 } from './Vector.js';
import { texture_color_value } from './Texture.js';

/**
 * @typedef TMaterial
 * @property {number} type
 * @property {import('./Vector.js').vec3} attenuation - цвет
 * @property {number} k - коэффициент
 * @property {number} tex id
 */

const Material = ti.types.struct({
    type: ti.i32,
    attenuation: ti.types.vector(ti.f32, 3),
    k: ti.f32,
    tex: ti.i32,
});

/**
 * @typedef TScatterRecord
 * @property {boolean} scatter
 * @property {boolean} skip_pdf
 * @property {import('./Ray.js').TRay} skip_pdf_ray
 */

const ScatterRecord = ti.types.struct({
    scatter: ti.i32,
    skip_pdf: ti.i32,
    skip_pdf_ray: ti.types.struct({
        origin: ti.types.vector(ti.f32, 3),
        direction: ti.types.vector(ti.f32, 3),
        time: ti.f32,
    }),
});

const new_scatter_record = () => {
    return {
        scatter: false,
        skip_pdf: false,
        skip_pdf_ray: {
            origin: [0.0, 0.0, 0.0],
            direction: [0.0, 0.0, 0.0],
            time: 0.0,
        },
    };
};

const base_mat = get_record_from_struct(Material);
const init_materials = async (mat_list, world_materials) => {
    for (let i = 0; i < mat_list.length; i++) {
        await world_materials.set([i], { ...base_mat, ...mat_list[i] });
    }
};

/**
 * Calculates the scatter direction and albedo of a ray
 * @param {number} mat_index
 * @param {import('./Ray.js').TRay} r_in
 * @param {import('./Hittable.js').HitRecord} rec
 * @param {TScatterRecord} srec
 */
const material_scatter = (mat_index, r_in, rec, srec) => {
    const mat = Materials[mat_index];
    if (mat.type === MAT_TYPE.LAMBERTIAN) {
        lambertian_scatter(r_in, rec, mat, srec);
    } else if (mat.type === MAT_TYPE.METAL) {
        metal_scatter(r_in, rec, mat, srec);
    } else if (mat.type === MAT_TYPE.DIELECTRIC) {
        dielectric_scatter(r_in, rec, mat, srec);
    } else if (mat.type === MAT_TYPE.ISOTROPIC) {
        isotropic_scatter(r_in, rec, mat, srec);
    }
};

const material_scattering_pdf = (r_in, mat, rec, scattered) => {
    let res = 0.0;

    if (mat.type === MAT_TYPE.LAMBERTIAN) {
        res = lambertian_scattering_pdf(r_in, rec, scattered);
    }
    if (mat.type === MAT_TYPE.ISOTROPIC) {
        res = isotropic_scattering_pdf();
    }

    return res;
};

/**
 * Scatters a ray according to Lambertian distribution
 * @param {import('./Ray.js').TRay} r_in
 * @param {import('./Hittable.js').HitRecord} rec
 * @param {TMaterial} mat
 * @param {TScatterRecord} srec
 */
const lambertian_scatter = (r_in, rec, mat, srec) => {
    srec.scatter = true;
    srec.skip_pdf = false;
};

const lambertian_scattering_pdf = (r_in, rec, scattered) => {
    const cos_theta = ti.dot(rec.normal, ti.normalized(scattered.direction));
    let res = cos_theta / Math.PI;
    if (cos_theta < 0) res = 0;
    return res;
};

/**
 * Scatters a ray with metal reflection
 * @param {import('./Ray.js').TRay} r_in
 * @param {import('./Hittable.js').HitRecord} rec
 * @param {TMaterial} mat
 * @param {TScatterRecord} srec
 */
const metal_scatter = (r_in, rec, mat, srec) => {
    let reflected = reflect_vec3(r_in.direction, rec.normal);
    reflected = ti.normalized(reflected) + mat.k * random_unit_vec3();
    const scattered = new_ray(rec.p, reflected, r_in.time);
    srec.scatter = ti.dot(scattered.direction, rec.normal) > 0;
    srec.skip_pdf = true;
    srec.skip_pdf_ray = scattered;
};

/**
 * Use Schlick's approximation for reflectance.
 * @param {number} cosine
 * @param {number} refraction_index
 */
const material_reflectance = (cosine, refraction_index) => {
    let r0 = (1 - refraction_index) / (1 + refraction_index);
    r0 = r0 * r0;
    return r0 + (1 - r0) * ti.pow(1 - cosine, 5);
};

/**
 * Scatters a ray with dielectric reflection
 * @param {import('./Ray.js').TRay} r_in
 * @param {import('./Hittable.js').HitRecord} rec
 * @param {TMaterial} mat
 * @param {TScatterRecord} srec
 */
const dielectric_scatter = (r_in, rec, mat, srec) => {
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

    srec.scatter = true;
    srec.skip_pdf = true;
    srec.skip_pdf_ray = new_ray(rec.p, direction, r_in.time);
};

const isotropic_scatter = (r_in, rec, mat, srec) => {
    srec.scatter = true;
};

const isotropic_scattering_pdf = () => {
    return 1 / (4 * Math.PI);
};

const emitted_light = (matId, rec) => {
    let res = [0.0, 0.0, 0.0];
    if (rec.front_face) {
        const mat = Materials[matId];
        if (mat.type === MAT_TYPE.LIGHT) {
            res = mat.attenuation;
            if (mat.k > 0) {
                res *= mat.k;
            }
        }
    }
    return res;
};

const get_mat_data = (mat, rec) => {
    let attenuation = mat.attenuation;
    if (mat.tex > 0) {
        attenuation = texture_color_value(mat.tex, rec.u, rec.v, rec.p);
    }
    return {
        attenuation,
    };
};

export {
    Material,
    ScatterRecord,
    new_scatter_record,
    init_materials,
    material_scatter,
    lambertian_scatter,
    metal_scatter,
    material_reflectance,
    dielectric_scatter,
    isotropic_scatter,
    emitted_light,
    material_scattering_pdf,
    lambertian_scattering_pdf,
    isotropic_scattering_pdf,
    get_mat_data,
};
