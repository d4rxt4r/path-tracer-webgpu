/**
 * Clamp a number.
 * @param {number} x
 * @param {number} min
 * @param {number} max
 */
const clamp = (x, min, max) => {
    let res = x;
    if (x < min) res = min;
    if (x > max) res = max;
    return res;
};

/**
 * Convert degrees to radians.
 * @param {number} degrees
 */
const degrees_to_radians = (degrees) => {
    return degrees * (Math.PI / 180);
};

/**
 * Generate a random number between min and max.
 * @param {number} min
 * @param {number} max
 */
const random_f32 = (min, max) => {
    return min + (max - min) * Math.random();
};

const random_i32 = (min, max) => {
    return min + Math.floor(Math.random() * (max - min + 1));
};

const round = (num) => Math.round((num + Number.EPSILON) * 1000) / 1000;

function throttle(mainFunction, delay) {
    let timerFlag = null;

    return (...args) => {
        if (timerFlag === null) {
            mainFunction(...args);
            timerFlag = setTimeout(() => {
                timerFlag = null;
            }, delay);
        }
    };
}

export { round, random_i32, random_f32, clamp, degrees_to_radians, throttle };
