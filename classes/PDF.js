/* global Lights, COUNTER */
import * as ti from '../lib/taichi.js';

import { MAX_F32, OBJ_TYPE } from '../const.js';
import { random_cosine_direction_vec3, random_to_sphere, random_unit_vec3 } from './Vector.js';
import { new_onb, transform_onb } from './ONB.js';
import { new_hit_record } from './Hittable.js';
import { hit_quad } from './Quad.js';
import { new_ray } from './Ray.js';
import { get_interval } from './Interval.js';
import { get_sphere_center, hit_sphere } from './Sphere.js';
import { random_i32 } from './Math.js';

const pdf_value = (obj, origin, direction, r_time) => {
    let res = 0.0;
    if (obj.type === OBJ_TYPE.SPHERE) res = sphere_pdf_value(obj, origin, direction, r_time);
    if (obj.type === OBJ_TYPE.QUAD) res = quad_pdf_value(obj, origin, direction);
    return res;
};
const generate_pdf = (obj, origin, r_time) => {
    let res = [1.0, 0.0, 0.0];
    if (obj.type === OBJ_TYPE.SPHERE) res = sphere_pdf_generate(obj, origin, r_time);
    if (obj.type === OBJ_TYPE.QUAD) res = quad_pdf_generate(obj, origin);
    return res;
};

const mixed_pdf_value = (p1, p2) => {
    const weight = 0.5;
    return weight * p1 + (1 - weight) * p2;
};
const generate_mixed_pdf = (p1, p2) => {
    const weight = 0.5;
    let res = p2;
    if (ti.random() < weight) {
        res = p1;
    }
    return res;
};

const lights_pdf_value = (origin, direction, r_time) => {
    const weight = 1.0 / COUNTER[1];
    let sum = 0.0;

    for (let i of ti.range(COUNTER[1])) {
        sum += weight * pdf_value(Lights[i], origin, direction, r_time);
    }

    return sum;
};
const generate_lights_pdf = (origin, r_time) => {
    const rand_int = random_i32(0, COUNTER[1] - 1);
    const rand_obj = Lights[rand_int];

    return generate_pdf(rand_obj, origin, r_time);
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
    pdf_value,
    generate_pdf,
    generate_mixed_pdf,
    mixed_pdf_value,
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
