/* global image_width, image_height */
import * as ti from '../lib/taichi.js';
import { Hittable } from '../classes/Hittable.js';
import { Material } from '../classes/Material.js';
import { Texture } from '../classes/Texture.js';
import { BVHNode } from '../classes/BVHTree.js';
import { BoxData } from '../classes/Box.js';
import { CameraSettingCPU, initialize_camera } from '../classes/Camera.js';
import { get_ray, ray_color } from '../classes/Ray.js';
import { process_color } from '../classes/Color.js';
import { register_kernel_scope } from './KernelScope.js';
import { prepare_scene, scene_capacities } from './SceneData.js';
import { upload_scene, validate_scene_capacity } from './Upload.js';
import { prepare_bvh_debug } from './BvhDebug.js';
import { create_image_textures } from './ImageTextures.js';
import { TEX_TYPE } from '../const.js';

export async function create_renderer(htmlCanvas, { scenes, width = 1200, height = Math.floor((width * 9) / 16), fused = true }) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) throw new Error('Invalid render dimensions');
    const adapter = await navigator.gpu?.requestAdapter({
        powerPreference: 'high-performance',
    });
    if (!adapter) throw new Error('This browser/device does not support WebGPU');
    const storageLimit = Math.min(adapter.limits.maxStorageBufferBindingSize, 128 * 1024 * 1024);
    if (width * height * 7 * 4 > storageLimit) throw new Error('Render dimensions exceed WebGPU storage limits');
    const started = performance.now();
    await ti.init();
    const imageMapsEnabled = scenes.some((scene) => (scene.textures ?? []).some((texture) => texture.type === TEX_TYPE.IMAGE));
    if (imageMapsEnabled && adapter.limits.maxTextureDimension2D < 4096) throw new Error('Device texture dimensions are too small');
    const imageTextures = imageMapsEnabled ? create_image_textures() : null;
    const capacities = scene_capacities(scenes);
    const fields = {
        Scene: ti.field(Hittable, capacities.objects),
        Lights: ti.field(Hittable, capacities.lights),
        Materials: ti.field(Material, capacities.materials),
        Textures: ti.field(Texture, capacities.textures),
        BVHTree: ti.field(BVHNode, capacities.nodes),
        Boxes: ti.field(BoxData, capacities.boxes),
        COUNTER: ti.field(ti.i32, 4),
    };
    if (Object.values(fields).reduce((bytes, field) => bytes + field.sizeBytes, 0) > storageLimit)
        throw new Error('Scene exceeds WebGPU storage limits');
    // Keep read-only scene data out of the accumulation buffer's atomic storage binding.
    ti.materializeFields();
    htmlCanvas.width = width;
    htmlCanvas.height = height;
    const color_buffer = ti.Vector.field(3, ti.f32, [width, height]);
    const pixels_buffer = ti.Vector.field(4, ti.f32, [width, height]);
    register_kernel_scope({
        ...fields,
        color_buffer,
        pixels_buffer,
        image_width: width,
        image_height: height,
        ImageAtlas: imageTextures?.texture,
        image_maps_enabled: imageMapsEnabled,
    });
    const create_trace_kernel = (enabled) => {
        ti.addToKernelScope({ image_maps_enabled: enabled && imageMapsEnabled, emission_enabled: enabled });
        return fused
            ? ti.kernel({ camera_setting_from_cpu: CameraSettingCPU, sample_count: ti.i32 }, (camera_setting_from_cpu, sample_count) => {
                  const camera_settings = initialize_camera(camera_setting_from_cpu);
                  for (let I of ti.ndrange(image_width, image_height)) {
                      const ray = get_ray(I[0], I[1], camera_settings);
                      color_buffer[I] += ray_color(ray, camera_settings);
                      pixels_buffer[I] = process_color(color_buffer[I] / sample_count);
                  }
              })
            : ti.kernel({ camera_setting_from_cpu: CameraSettingCPU }, (camera_setting_from_cpu) => {
                  const camera_settings = initialize_camera(camera_setting_from_cpu);
                  for (let I of ti.ndrange(image_width, image_height)) {
                      const i = I[0];
                      const j = I[1];
                      const ray = get_ray(i, j, camera_settings);
                      color_buffer[I] += ray_color(ray, camera_settings);
                  }
              });
    };
    const traceKernels = new Map([[false, create_trace_kernel(false)]]);
    let activeTrace = traceKernels.get(false);
    const reset = ti.kernel(() => {
        for (const I of ti.ndrange(image_width, image_height)) color_buffer[I] = [0.0, 0.0, 0.0];
    });
    const tone = ti.kernel((sample_count) => {
        for (const I of ti.ndrange(image_width, image_height)) pixels_buffer[I] = process_color(color_buffer[I] / sample_count);
    });
    const canvas = new ti.Canvas(htmlCanvas);
    let camera;
    let samples = 0;
    let preparedBvh = [];
    let debugData = null;

    return {
        fields,
        setupMs: performance.now() - started,
        get samples() {
            return samples;
        },
        async loadScene(scene) {
            const start = performance.now();
            const prepared = prepare_scene(scene);
            validate_scene_capacity(prepared, fields);
            const preparedAt = performance.now();
            const hasImages = prepared.textures.some((texture) => texture.type === TEX_TYPE.IMAGE);
            if (hasImages) {
                if (!imageTextures) throw new Error('Image textures were not enabled when creating this renderer');
                prepared.textures = await imageTextures.prepare(prepared.textures);
            }
            const imagesAt = performance.now();
            const useMaps = hasImages || prepared.materials.some((material) => material.emission_tex > 0);
            if (!traceKernels.has(useMaps)) traceKernels.set(useMaps, create_trace_kernel(useMaps));
            const nextTrace = traceKernels.get(useMaps);
            await upload_scene(prepared, fields);
            activeTrace = nextTrace;
            preparedBvh = prepared.bvh;
            debugData = null;
            return {
                prepareMs: preparedAt - start,
                imageMs: imagesAt - preparedAt,
                uploadMs: performance.now() - imagesAt,
            };
        },
        getBvhDebugData() {
            return (debugData ??= prepare_bvh_debug(preparedBvh));
        },
        setCamera(value) {
            camera = value;
        },
        async reset() {
            await reset();
            samples = 0;
        },
        async trace() {
            if (!camera) throw new Error('Camera is not configured');
            if (fused) await activeTrace(camera, samples + 1);
            else await activeTrace(camera);
            samples++;
        },
        tone(count = samples) {
            if (!Number.isInteger(count) || count <= 0) return Promise.reject(new Error('Sample count must be positive'));
            return fused ? Promise.resolve() : tone(count);
        },
        present: () => canvas.setImage(pixels_buffer),
        async renderSample() {
            await this.trace();
            await this.tone();
            await this.present();
        },
        pixels: () => pixels_buffer.toArray(),
        colors: () => color_buffer.toArray(),
    };
}
