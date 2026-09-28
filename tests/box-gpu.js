/* global Scene, Boxes */
import * as ti from '../lib/taichi.js';
import vf from '../classes/Vector.js';
import { create_renderer } from '../renderer/Renderer.js';
import { hit_scene } from '../classes/Scene.js';
import { hit_constant_medium } from '../classes/ConstantMedium.js';
import { new_hit_record } from '../classes/Hittable.js';
import { new_ray } from '../classes/Ray.js';
import { get_interval } from '../classes/Interval.js';
import { lights_pdf_value } from '../classes/PDF.js';
import { hit_box } from '../classes/Box.js';
import { MAX_F32 } from '../const.js';

window.boxResults = (async () => {
    const results = [];
    const check = (name, pass, value) => results.push({ name, pass, value });
    const rotation = [10, 35, -15];
    const offset = [4, -3, -6];
    const rotate = (v) =>
        rotation.reduce((p, a, i) => {
            const axis = [0, 0, 0];
            axis[i] = 1;
            return vf.rotateAxisAngle(p, axis, (a * Math.PI) / 180);
        }, v);
    const position = (v) => vf.add(rotate(v), offset);
    const box = { type: 4, min: [-1, -2, -3], max: [1, 2, 3], mat: 0, offset, rotation };
    // Independent legacy surface reference; no production box helper is used.
    const faces = [
        { Q: [-1, -2, 3], u: [2, 0, 0], v: [0, 4, 0] },
        { Q: [1, -2, 3], u: [0, 0, -6], v: [0, 4, 0] },
        { Q: [1, -2, -3], u: [-2, 0, 0], v: [0, 4, 0] },
        { Q: [-1, -2, -3], u: [0, 0, 6], v: [0, 4, 0] },
        { Q: [-1, 2, 3], u: [2, 0, 0], v: [0, 0, -6] },
        { Q: [-1, -2, -3], u: [2, 0, 0], v: [0, 0, 6] },
    ].map((face) => ({ ...face, type: 2, mat: 0, rotation, offset }));
    const materials = [
        { type: 1, attenuation: [0.8, 0.8, 0.8] },
        { type: 5, attenuation: [1, 1, 1], k: 0.3 },
    ];
    const scene = { objects: [box], lights: [box], materials };
    const renderer = await create_renderer(document.getElementById('canvas'), {
        scenes: [scene, { objects: faces, materials }],
        width: 64,
    });
    const hit = ti.kernel({ origin: ti.types.vector(ti.f32, 3), direction: ti.types.vector(ti.f32, 3) }, (origin, direction) => {
        const rec = new_hit_record();
        const found = hit_scene(new_ray(origin, direction, 0.5), get_interval(0.001, 1000.0), rec);
        return [ti.f32(found), rec.t, rec.normal.x, rec.normal.y, rec.normal.z, rec.u, rec.v, ti.f32(rec.front_face)];
    });
    const rays = [
        [
            [0.3, -0.7, 5],
            [0, 0, -1],
        ],
        [
            [3, -0.7, 0.4],
            [-1, 0, 0],
        ],
        [
            [0.3, -0.7, -5],
            [0, 0, 1],
        ],
        [
            [-3, -0.7, 0.4],
            [1, 0, 0],
        ],
        [
            [0.3, 4, 0.4],
            [0, -1, 0],
        ],
        [
            [0.3, -4, 0.4],
            [0, 1, 0],
        ],
        ...[
            [1, 0, 0],
            [-1, 0, 0],
            [0, 1, 0],
            [0, -1, 0],
            [0, 0, 1],
            [0, 0, -1],
        ].map((d) => [[0.3, -0.7, 0.4], d]),
        [
            [2, 0, -5],
            [0, 0, 1],
        ],
    ];
    await renderer.loadScene(scene);
    const actual = [];
    for (const [o, d] of rays) actual.push(await hit(position(o), rotate(d)));
    const pdf = ti.kernel(() => lights_pdf_value([4.0, -3.0, 5.0], [0.0, 0.0, -1.0], 0.0));
    const boxPdf = await pdf();
    await renderer.loadScene({ objects: faces, lights: faces, materials });
    for (let i = 0; i < rays.length; i++) {
        const expected = await hit(position(rays[i][0]), rotate(rays[i][1]));
        check(
            `BOX matches six QUAD surfaces, ray ${i}`,
            actual[i].every((v, j) => Number.isFinite(v) && Math.abs(v - expected[j]) < 0.0001),
        );
    }
    const quadPdf = await pdf();
    check('BOX light PDF matches its six surface targets', boxPdf > 0 && Math.abs(boxPdf - quadPdf) < 0.0001, boxPdf);
    await renderer.loadScene({ ...scene, objects: [{ ...box, rotation: [0, 0, 0], offset: [0, 0, 0] }] });
    check('BOX parallel ray on face hits', (await hit([1, 0, -5], [0, 0, 1]))[0] === 1);
    check('BOX parallel ray outside misses', (await hit([1.01, 0, -5], [0, 0, 1]))[0] === 0);
    const edge = await hit([1, 2, -5], [0, 0, 1]);
    check(
        'BOX ray through an edge hits at the correct distance',
        edge.every(Number.isFinite) && edge[0] === 1 && Math.abs(edge[1] - 2) < 1e-6,
    );
    check('BOX zero direction misses', (await hit([0, 0, 0], [0, 0, 0]))[0] === 0);
    const distantHit = ti.kernel({ speed: ti.f32 }, (speed) => {
        const rec = new_hit_record();
        const found = hit_box(Scene[0], Boxes[0], new_ray([0.0, 0.0, 0.0], [speed, 0.0, 0.0], 0.0), get_interval(0.001, MAX_F32), rec);
        return [ti.f32(found), rec.t, rec.normal.x];
    });
    check('BOX exit beyond the finite distance limit misses', (await distantHit(1e-10))[0] === 0);
    const scaledHit = await distantHit(1e-8);
    check(
        'BOX scaled ray exits within the finite distance limit',
        scaledHit[0] === 1 && Math.abs(scaledHit[1] / 1e8 - 1) < 1e-6 && scaledHit[2] === -1,
    );
    await renderer.loadScene({ objects: [{ type: 3, mat: 1, boundary: box }], materials });
    const mediumSamples = ti.Vector.field(4, ti.f32, 8192);
    const mediumRecords = ti.Vector.field(12, ti.f32, [8192, 4]);
    const snapshot = (found, rec) => [
        ti.f32(found),
        rec.t,
        rec.p.x,
        rec.p.y,
        rec.p.z,
        ti.f32(rec.mat),
        rec.normal.x,
        rec.normal.y,
        rec.normal.z,
        ti.f32(rec.front_face),
        rec.u,
        rec.v,
    ];
    ti.addToKernelScope({ mediumSamples, mediumRecords, snapshot });
    const distribution = ti.kernel(
        { origin: ti.types.vector(ti.f32, 3), direction: ti.types.vector(ti.f32, 3), inside: ti.types.vector(ti.f32, 3) },
        (origin, direction, inside) => {
            for (let i of ti.range(8192)) {
                const rec = new_hit_record();
                const a = hit_constant_medium(Scene[0], new_ray(origin, direction, 0.0), get_interval(0.0, 100.0), rec);
                mediumRecords[[i, 0]] = snapshot(a, rec);
                const b = hit_constant_medium(Scene[0], new_ray(origin, 2 * direction, 0.0), get_interval(0.0, 100.0), rec);
                mediumRecords[[i, 1]] = snapshot(b, rec);
                const c = hit_constant_medium(Scene[0], new_ray(inside, direction, 0.0), get_interval(0.0, 100.0), rec);
                mediumRecords[[i, 2]] = snapshot(c, rec);
                const d = hit_constant_medium(Scene[0], new_ray(origin, direction, 0.0), get_interval(0.0, 3.0), rec);
                mediumRecords[[i, 3]] = snapshot(d, rec);
                mediumSamples[i] = [ti.f32(a), ti.f32(b), ti.f32(c), ti.f32(d)];
            }
        },
    );
    await distribution(position([0, 0, -5]), rotate([0, 0, 1]), position([0, 0, 0]));
    const samples = await mediumSamples.toArray();
    const records = await mediumRecords.toArray();
    const intervals = [
        [2, 8],
        [1, 4],
        [0, 3],
        [2, 3],
    ];
    for (let scenario = 0; scenario < 4; scenario++) {
        const events = records.map((row) => row[scenario]).filter((row) => row[0] === 1);
        const origin = position(scenario === 2 ? [0, 0, 0] : [0, 0, -5]);
        const direction = rotate([0, 0, scenario === 1 ? 2 : 1]);
        check(
            `BOX medium scattering records stay inside clipped path, scenario ${scenario}`,
            events.length > 0 &&
                events.every((row) => {
                    const expected = vf.add(origin, vf.scale(direction, row[1]));
                    return (
                        row.every(Number.isFinite) &&
                        row[1] >= intervals[scenario][0] - 1e-5 &&
                        row[1] <= intervals[scenario][1] + 1e-5 &&
                        expected.every((v, i) => Math.abs(v - row[i + 2]) < 1e-4) &&
                        row.slice(5).every((v, i) => v === [1, 1, 0, 0, 1, 0, 0][i])
                    );
                }),
        );
    }
    for (const [column, length] of [6, 6, 3, 1].entries()) {
        const mean = samples.reduce((sum, row) => sum + row[column], 0) / samples.length;
        check(`rotated BOX medium probability, scenario ${column}`, Math.abs(mean - (1 - Math.exp(-0.3 * length))) < 0.025, mean);
    }
    await distribution(position([2, 0, -5]), rotate([0, 0, 1]), position([2, 0, 0]));
    check(
        'no scattering outside rotated BOX',
        (await mediumSamples.toArray()).flat().every((v) => v === 0),
    );
    return results;
})();
