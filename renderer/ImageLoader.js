let codecs;
export const image_url = (src) => new URL(src, new URL('../', import.meta.url)).href;
const load_script = (path) =>
    new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = new URL(path, import.meta.url).href;
        script.onload = resolve;
        script.onerror = () => {
            script.remove();
            reject(new Error(`Cannot load image decoder: ${path}`));
        };
        document.head.appendChild(script);
    });

const load_tiff_codecs = () => {
    if (!codecs) {
        codecs = load_script('../lib/image-codecs/pako.min.js').then(() => load_script('../lib/image-codecs/UTIF.js'));
        codecs.catch(() => {
            codecs = null;
        });
    }
    return codecs;
};

export class ImageLoader {
    constructor() {
        this.cache = new Map();
    }

    load(src) {
        const url = image_url(src);
        if (!this.cache.has(url)) {
            const promise = this.decode(url).catch((error) => {
                this.cache.delete(url);
                throw new Error(`Image ${src.length > 200 ? src.slice(0, 80) + '…' : src}: ${error.message}`, { cause: error });
            });
            this.cache.set(url, promise);
        }
        return this.cache.get(url);
    }

    invalidate(src) {
        this.cache.delete(image_url(src));
    }

    async decode(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        const signature = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
        const tiff =
            signature.length === 4 &&
            ((signature[0] === 73 && signature[1] === 73 && signature[2] === 42) ||
                (signature[0] === 77 && signature[1] === 77 && signature[3] === 42));
        if (tiff) {
            await load_tiff_codecs();
            const decoder = window.UTIF;
            const page = decoder.decode(buffer).find((ifd) => ifd.t256 && ifd.t257);
            if (!page) throw new Error('TIFF contains no image');
            this.validate_size(page.t256[0], page.t257[0]);
            if (page.t274 && page.t274[0] !== 1) throw new Error('Unsupported TIFF orientation');
            decoder.decodeImage(buffer, page);
            const rgba = decoder.toRGBA8(page);
            if (rgba.length !== page.width * page.height * 4) throw new Error('Invalid TIFF pixel data');
            return { width: page.width, height: page.height, rgba };
        }
        const bitmap = await createImageBitmap(new Blob([buffer]), {
            premultiplyAlpha: 'none',
            colorSpaceConversion: 'none',
        });
        try {
            this.validate_size(bitmap.width, bitmap.height);
            const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
            const context = canvas.getContext('2d', { willReadFrequently: true });
            context.drawImage(bitmap, 0, 0);
            return {
                width: bitmap.width,
                height: bitmap.height,
                rgba: context.getImageData(0, 0, bitmap.width, bitmap.height).data,
            };
        } finally {
            bitmap.close();
        }
    }

    validate_size(width, height) {
        if (![width, height].every((n) => Number.isInteger(n) && n > 0 && n <= 4094))
            throw new Error('Image dimensions must fit the 4096×4096 texture atlas');
    }
}
