import * as ti from '../lib/taichi.js';
import { TEX_TYPE } from '../const.js';
import { AtlasLayout, image_pixel } from './ImageAtlas.js';
import { ImageLoader, image_url } from './ImageLoader.js';

// One native filtered texture and one reusable 4 MiB upload buffer, independent of image count.
export function create_image_textures({ size = 4096 } = {}) {
    const texture = new ti.Texture(4, [size, size], 1, {
        wrapModeU: ti.WrapMode.ClampToEdge,
        wrapModeV: ti.WrapMode.ClampToEdge,
    });
    const loader = new ImageLoader();
    const records = new Map();
    let layout = new AtlasLayout(size);
    let staging;
    let upload;
    const batchSize = 256 * 1024;

    const upload_image = async (image, config, rect) => {
        if (!staging) {
            ti.materializeFields();
            staging = ti.Vector.field(4, ti.f32, batchSize);
            upload = ti.kernel(
                {
                    atlas: ti.template(),
                    pixels: ti.template(),
                    origin: ti.types.vector(ti.i32, 2),
                    row_width: ti.i32,
                    start: ti.i32,
                    count: ti.i32,
                },
                (atlas, pixels, origin, row_width, start, count) => {
                    for (const i of ti.range(count)) {
                        const pixel = start + i;
                        ti.textureStore(atlas, origin + [pixel % row_width, ti.i32(pixel / row_width)], pixels[i]);
                    }
                },
            );
        }
        const width = image.width + 2;
        const count = width * (image.height + 2);
        const values = new Float32Array(batchSize * 4);
        for (let start = 0; start < count; start += batchSize) {
            const chunk = Math.min(batchSize, count - start);
            for (let i = 0; i < chunk; i++) {
                const pixel = start + i;
                values.set(image_pixel(image, (pixel % width) - 1, Math.floor(pixel / width) - 1, config), i * 4);
            }
            await staging.fromArray1D(values);
            await upload(texture, staging, [rect[0] - 1, rect[1] - 1], width, start, chunk);
        }
    };

    return {
        texture,
        async prepare(textures) {
            const nextLayout = layout.clone();
            const pending = new Map();
            const output = [];
            // Decode and reserve the complete scene before uploading any new pixels.
            for (const config of textures) {
                if (config.type !== TEX_TYPE.IMAGE) {
                    output.push(config);
                    continue;
                }
                const key = JSON.stringify([image_url(config.src), config.color_space, config.wrap_u, config.wrap_v]);
                let rect = records.get(key) ?? pending.get(key)?.rect;
                if (!rect) {
                    const image = await loader.load(config.src);
                    try {
                        rect = nextLayout.reserve(image.width, image.height);
                    } catch (error) {
                        loader.invalidate(config.src);
                        throw new Error(`Image ${config.src}: ${error.message}`, {
                            cause: error,
                        });
                    }
                    pending.set(key, { image, config, rect });
                }
                output.push({ ...config, image_rect: rect });
            }
            for (const { image, config, rect } of pending.values()) await upload_image(image, config, rect);
            layout = nextLayout;
            for (const [key, { rect }] of pending) records.set(key, rect);
            return output;
        },
    };
}
