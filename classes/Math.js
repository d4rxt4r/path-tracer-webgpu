/**
 * @param {number} x
 * @param {number} min
 * @param {number} max
 */
const clamp = (x, min, max) => {
    let res = x;
    if (x < min) res = min;
    if (x > max) res = max;
    return res;
}

const linear_to_gamma = (linear_component) => {
    let res = 0.0;
    if (linear_component > 0)
        res = Math.sqrt(linear_component);

    return res;
}

const degrees_to_radians = (degrees) => {
    return degrees * (Math.PI / 180);
}

const random = (min, max) => {
    return min + (max - min) * Math.random();
}

export {
    random,
    clamp,
    linear_to_gamma,
    degrees_to_radians,
}