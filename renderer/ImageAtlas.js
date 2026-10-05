// CPU atlas layout and pixel conversion. Borders isolate hardware-filtered images.
const srgb = Float32Array.from({ length: 256 }, (_, i) => {
    const value = i / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
});

export class AtlasLayout {
    constructor(size = 4096) {
        this.size = size;
        this.x = 0;
        this.y = 0;
        this.rowHeight = 0;
    }

    clone() {
        return Object.assign(new AtlasLayout(this.size), this);
    }

    reserve(width, height) {
        if (![width, height].every((n) => Number.isInteger(n) && n > 0) || width + 2 > this.size || height + 2 > this.size)
            throw new Error(`Image exceeds ${this.size}×${this.size} texture atlas`);
        let { x, y, rowHeight } = this;
        if (x + width + 2 > this.size) {
            x = 0;
            y += rowHeight;
            rowHeight = 0;
        }
        if (y + height + 2 > this.size) throw new Error(`Texture atlas ${this.size}×${this.size} is full`);
        this.x = x + width + 2;
        this.y = y;
        this.rowHeight = Math.max(rowHeight, height + 2);
        return [x + 1, y + 1, width, height];
    }
}

export function image_pixel(image, x, y, texture) {
    const address = (value, size, repeat) => (repeat ? ((value % size) + size) % size : Math.max(0, Math.min(size - 1, value)));
    const offset = 4 * (address(y, image.height, texture.wrap_v) * image.width + address(x, image.width, texture.wrap_u));
    const r = image.rgba[offset];
    const g = image.rgba[offset + 1];
    const b = image.rgba[offset + 2];
    const height = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return texture.color_space === 'linear' ? [r / 255, g / 255, b / 255, height] : [srgb[r], srgb[g], srgb[b], height];
}
