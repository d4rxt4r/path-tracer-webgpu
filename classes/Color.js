import { get_interval, interval_clamp } from './Interval.js';

/**
 * Convert linear color component to gamma color component.
 * @param {number} linear_component
 */
const linear_to_gamma = (linear_component) => {
    let res = 0.0;
    if (linear_component > 0) res = Math.sqrt(linear_component);

    return res;
};

const hex2rgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    return { r, g, b };
};

const process_color = (color) => {
    const intensity = get_interval(0.0, 0.999);
    const r = linear_to_gamma(color.r);
    const g = linear_to_gamma(color.g);
    const b = linear_to_gamma(color.b);

    return [interval_clamp(intensity, r), interval_clamp(intensity, g), interval_clamp(intensity, b), 1.0];
};

export { linear_to_gamma, process_color, hex2rgb };
