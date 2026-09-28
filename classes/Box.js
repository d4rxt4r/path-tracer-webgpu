import * as ti from '../lib/taichi.js';
import { MAX_F32, OBJ_TYPE } from '../const.js';
import vf from './Vector.js';
import { get_aabb_points } from './AABB.js';
import { new_ray, ray_at } from './Ray.js';
import { set_face_normal } from './Hittable.js';
import { interval_contains } from './Interval.js';

export const BoxData = ti.types.struct({
    center: ti.types.vector(ti.f32, 3),
    half_size: ti.types.vector(ti.f32, 3),
    axis_x: ti.types.vector(ti.f32, 3),
    axis_y: ti.types.vector(ti.f32, 3),
    axis_z: ti.types.vector(ti.f32, 3),
});
export const box_defaults = { center: [0, 0, 0], half_size: [1, 1, 1], axis_x: [1, 0, 0], axis_y: [0, 1, 0], axis_z: [0, 0, 1] };

export const rotate_vector = (vector, rotation) =>
    rotation.reduce((value, angle, axis) => {
        if (angle === 0) return value;
        const unit = [0, 0, 0];
        unit[axis] = 1;
        return vf.rotateAxisAngle(value, unit, (angle * Math.PI) / 180);
    }, vector);

export function prepare_box(box) {
    const offset = box.offset ?? [0, 0, 0];
    const rotation = box.rotation ?? [0, 0, 0];
    for (const vector of [box.min, box.max, offset, rotation]) {
        if (!Array.isArray(vector) || vector.length !== 3 || !vector.every(Number.isFinite))
            throw new Error('Box coordinates and transforms must be finite vec3 values');
    }
    const min = vf.min(box.min, box.max);
    const max = vf.max(box.min, box.max);
    const half_size = vf.scale(vf.sub(max, min), 0.5);
    if (!half_size.every((value) => Number.isFinite(value) && value > 0)) throw new Error('Box size must be positive on every axis');
    return {
        center: vf.add(rotate_vector(vf.add(min, half_size), rotation), offset),
        half_size,
        axis_x: rotate_vector([1, 0, 0], rotation),
        axis_y: rotate_vector([0, 1, 0], rotation),
        axis_z: rotate_vector([0, 0, 1], rotation),
    };
}

export function get_box_bbox(box) {
    // Extrema of the eight rotated corners, without allocating a corner array.
    const extent = [0, 1, 2].map(
        (i) =>
            Math.abs(box.axis_x[i]) * box.half_size[0] +
            Math.abs(box.axis_y[i]) * box.half_size[1] +
            Math.abs(box.axis_z[i]) * box.half_size[2],
    );
    return get_aabb_points(vf.sub(box.center, extent), vf.add(box.center, extent));
}

// Sampling targets only: visible box geometry stays one analytic BVH primitive.
export function box_light_quads(object) {
    const box = prepare_box(object);
    const dx = vf.scale(box.axis_x, 2 * box.half_size[0]);
    const dy = vf.scale(box.axis_y, 2 * box.half_size[1]);
    const dz = vf.scale(box.axis_z, 2 * box.half_size[2]);
    const min = vf.sub(box.center, vf.scale(vf.add(vf.add(dx, dy), dz), 0.5));
    const face = (Q, u, v) => ({ type: OBJ_TYPE.QUAD, Q, u, v, mat: object.mat ?? 0 });
    return [
        face(vf.add(min, dz), dx, dy),
        face(vf.add(vf.add(min, dx), dz), vf.scale(dz, -1), dy),
        face(vf.add(min, dx), vf.scale(dx, -1), dy),
        face(min, dz, dy),
        face(vf.add(vf.add(min, dy), dz), dx, vf.scale(dz, -1)),
        face(min, dx, dz),
    ];
}

export const box_local_ray = (box, ray) => {
    const origin = ray.origin - box.center;
    return new_ray(
        [ti.dot(origin, box.axis_x), ti.dot(origin, box.axis_y), ti.dot(origin, box.axis_z)],
        [ti.dot(ray.direction, box.axis_x), ti.dot(ray.direction, box.axis_y), ti.dot(ray.direction, box.axis_z)],
        ray.time,
    );
};

export const box_interval = (box, ray) => {
    const result = {
        hit: ray.direction.normSqr() > 0,
        min: -ti.f32(MAX_F32),
        max: ti.f32(MAX_F32),
        enter_axis: 0,
        exit_axis: 0,
        enter_sign: 0.0,
        exit_sign: 0.0,
    };
    for (let axis of ti.static(ti.range(3))) {
        const origin = ray.origin[axis];
        const direction = ray.direction[axis];
        const half = box.half_size[axis];
        if (direction === 0) {
            if (origin < -half || origin > half) result.hit = false;
        } else {
            const a = (-half - origin) / direction;
            const b = (half - origin) / direction;
            const near = ti.min(a, b);
            const far = ti.max(a, b);
            let sign = -1.0;
            if (direction < 0) sign = 1.0;
            // The first nonparallel slab supplies real faces, even beyond the finite ray limit.
            if (result.enter_sign === 0 || near > result.min) {
                result.min = near;
                result.enter_axis = axis;
                result.enter_sign = sign;
            }
            if (result.exit_sign === 0 || far < result.max) {
                result.max = far;
                result.exit_axis = axis;
                result.exit_sign = -sign;
            }
            if (result.max < result.min) result.hit = false;
        }
    }
    return result;
};

export const hit_box = (object, box, ray, ray_t, rec) => {
    const local_ray = box_local_ray(box, ray);
    const interval = box_interval(box, local_ray);
    let hit = interval.hit;
    let t = interval.min;
    let axis = interval.enter_axis;
    let sign = interval.enter_sign;
    if (!interval_contains(ray_t, t)) {
        t = interval.max;
        axis = interval.exit_axis;
        sign = interval.exit_sign;
        if (!interval_contains(ray_t, t)) hit = false;
    }
    if (hit) {
        let normal = box.axis_x;
        if (axis === 1) normal = box.axis_y;
        else if (axis === 2) normal = box.axis_z;
        rec.t = t;
        rec.p = ray_at(ray, t);
        rec.mat = object.mat;
        set_face_normal(rec, ray, sign * normal);
        const uvw = (ray_at(local_ray, t) + box.half_size) / (2 * box.half_size);
        rec.u = uvw.x;
        rec.v = uvw.y;
        if (axis === 0) {
            rec.u = uvw.z;
            if (sign > 0) rec.u = 1 - uvw.z;
        } else if (axis === 1) {
            rec.v = uvw.z;
            if (sign > 0) rec.v = 1 - uvw.z;
        } else if (sign < 0) rec.u = 1 - uvw.x;
    }
    return hit;
};
