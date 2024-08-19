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

const process_color = (color) => {
    const intensity = get_interval(0.0, 0.999);
    const r = linear_to_gamma(color.r);
    const g = linear_to_gamma(color.g);
    const b = linear_to_gamma(color.b);

    return [interval_clamp(r, intensity), interval_clamp(g, intensity), interval_clamp(b, intensity), 1.0];
};

export { linear_to_gamma, process_color };
