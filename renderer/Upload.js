import { object_defaults, material_defaults, texture_defaults, node_defaults } from './SceneData.js';

export async function upload_records(field, records, fallback) {
    const capacity = field.dimensions[0];
    if (records.length > capacity) throw new Error(`Field capacity exceeded: ${records.length} > ${capacity}`);
    await field.fromArray(Array.from({ length: capacity }, (_, i) => records[i] ?? fallback));
}

export async function upload_scene(prepared, fields) {
    const uploads = [
        [fields.Scene, prepared.objects, object_defaults],
        [fields.Lights, prepared.lights, object_defaults],
        [fields.Materials, prepared.materials, material_defaults],
        [fields.Textures, prepared.textures, texture_defaults],
        [fields.BVHTree, prepared.bvh, node_defaults],
    ];
    // Validate every capacity before any field is changed.
    for (const [field, records] of uploads) {
        if (records.length > field.dimensions[0])
            throw new Error(`Scene exceeds field capacity: ${records.length} > ${field.dimensions[0]}`);
    }
    for (const [field, records, fallback] of uploads) await upload_records(field, records, fallback);
    await fields.COUNTER.fromArray(prepared.counts);
}
