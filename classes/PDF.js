/* global Lights, COUNTER */
import * as ti from '../lib/taichi.js';

import { MAX_F32, OBJ_TYPE, MAT_TYPE } from '../const.js';
import { random_cosine_direction_vec3, random_to_sphere, random_unit_vec3, reflect_vec3 } from './Vector.js';
import { new_onb, transform_onb } from './ONB.js';
import { new_hit_record } from './Hittable.js';
import { hit_quad } from './Quad.js';
import { new_ray } from './Ray.js';
import { get_interval } from './Interval.js';
import { get_sphere_center, hit_sphere } from './Sphere.js';
import { random_i32 } from './Math.js';

const obj_pdf_value = (obj, origin, direction, r_time) => {
    let res = 0.0;
    if (obj.type === OBJ_TYPE.SPHERE) res = sphere_pdf_value(obj, origin, direction, r_time);
    if (obj.type === OBJ_TYPE.QUAD) res = quad_pdf_value(obj, origin, direction);
    return res;
};
const generate_obj_pdf = (obj, origin, r_time) => {
    let res = [1.0, 0.0, 0.0];
    if (obj.type === OBJ_TYPE.SPHERE) res = sphere_pdf_generate(obj, origin, r_time);
    if (obj.type === OBJ_TYPE.QUAD) res = quad_pdf_generate(obj, origin);
    return res;
};

const mixed_pdf_value = (r_in, mat, rec, r_out) => {
    const light_weight = 0.5;
    const lights_pdf = lights_pdf_value(rec.p, r_out.direction, r_in.time);

    let material_pdf = 0.0;
    if (mat.type === MAT_TYPE.LAMBERTIAN) {
        material_pdf = cosine_pdf_value(rec.normal, r_out.direction);
    } else if (mat.type === MAT_TYPE.ISOTROPIC) {
        material_pdf = unit_sphere_pdf_value();
    }

    return light_weight * lights_pdf + (1 - light_weight) * material_pdf;
};

const mixed_pdf_generate = (r, mat, rec) => {
    let pdf_direction = [0.0, 0.0, 0.0];
    if (ti.random() < 0.5) {
        pdf_direction = generate_lights_pdf(rec.p, r.time);
    } else {
        if (mat.type === MAT_TYPE.LAMBERTIAN) {
            pdf_direction = cosine_pdf_generate(rec.normal);
        } else if (mat.type === MAT_TYPE.ISOTROPIC) {
            pdf_direction = unit_sphere_pdf_generate();
        }
    }
    return pdf_direction;
};

const lights_pdf_value = (origin, direction, r_time) => {
    const weight = 1.0 / COUNTER[1];
    let sum = 0.0;

    for (let i of ti.range(COUNTER[1])) {
        sum += weight * obj_pdf_value(Lights[i], origin, direction, r_time);
    }

    return sum;
};
const generate_lights_pdf = (origin, r_time) => {
    const rand_int = random_i32(0, COUNTER[1] - 1);
    const rand_obj = Lights[rand_int];

    return generate_obj_pdf(rand_obj, origin, r_time);
};

const sphere_pdf_value = (obj, origin, direction, r_time) => {
    const rec = new_hit_record();
    let res = 1.0;
    if (hit_sphere(obj, new_ray(origin, direction, r_time), get_interval(0.001, MAX_F32), rec)) {
        const center = get_sphere_center(obj.center, obj.center2, r_time);
        const dist_squared = (center - origin).normSqr();
        const cos_theta_max = Math.sqrt(1 - (obj.radius * obj.radius) / dist_squared);
        const solid_angle = 2 * Math.PI * (1 - cos_theta_max);
        res = 1 / solid_angle;
    }
    return res;
};
const sphere_pdf_generate = (obj, origin, r_time) => {
    const center = get_sphere_center(obj.center, obj.center2, r_time);
    const direction = center - origin;
    const distance_squared = direction.normSqr();
    const uvw = new_onb(direction);
    return transform_onb(uvw, random_to_sphere(obj.radius, distance_squared));
};

const quad_pdf_value = (obj, origin, direction) => {
    const rec = new_hit_record();
    let res = 0.0;
    if (hit_quad(obj, new_ray(origin, direction, 0), get_interval(0.001, MAX_F32), rec)) {
        const distance_squared = rec.t * rec.t * direction.normSqr();
        const cosine = ti.abs(ti.dot(direction, rec.normal) / direction.norm());
        const area = ti.norm(ti.cross(obj.u, obj.v));
        res = distance_squared / (cosine * area) - 1;
    }
    return res;
};
const quad_pdf_generate = (obj, origin) => {
    const p = obj.Q + ti.random() * obj.u + ti.random() * obj.v;
    return p - origin;
};

const unit_sphere_pdf_value = () => 1 / (4 * Math.PI);
const unit_sphere_pdf_generate = () => random_unit_vec3();

const cosine_pdf_value = (w, direction) => {
    const uvw = new_onb(w);
    const cosine_theta = ti.dot(ti.normalized(direction), uvw.w);
    return ti.max(0, cosine_theta / Math.PI);
};
const cosine_pdf_generate = (w) => {
    const uvw = new_onb(w);
    return transform_onb(uvw, random_cosine_direction_vec3());
};

export {
    obj_pdf_value,
    generate_obj_pdf,
    mixed_pdf_value,
    mixed_pdf_generate,
    lights_pdf_value,
    generate_lights_pdf,
    sphere_pdf_generate,
    sphere_pdf_value,
    quad_pdf_generate,
    quad_pdf_value,
    unit_sphere_pdf_value,
    unit_sphere_pdf_generate,
    cosine_pdf_value,
    cosine_pdf_generate,
};
