/**
 * @typedef GUISettings
 * @property {number} cam_x
 * @property {number} cam_y
 * @property {number} cam_z
 * @property {number} at_x
 * @property {number} at_y
 * @property {number} at_z
 * @property {number} spp
 * @property {number} max_depth
 * @property {number} vfov
 * @property {number} defocus_angle
 * @property {number} focus_dist
 */

const default_settings = {
    cam_x: 0.0,
    cam_y: 0.0,
    cam_z: 2.0,

    at_x: 0.0,
    at_y: 0.0,
    at_z: 0.0,

    spp: 5,
    max_depth: 10,

    vfov: 40,

    defocus_angle: 0.0,
    focus_dist: 10.0,
};

const createGui = (settings = default_settings) => {
    // eslint-disable-next-line no-undef
    const gui = new lil.GUI();

    const controllers = Object.fromEntries(
        Object.keys(settings).map((key) => {
            return [key, gui.add(settings, key)];
        }),
    );

    controllers.at_x.step(0.001).listen(false);
    controllers.at_y.step(0.001).listen(false);
    controllers.at_z.step(0.001).listen(false);
    controllers.cam_x.step(0.001).listen(false);
    controllers.cam_y.step(0.001).listen(false);
    controllers.cam_z.step(0.001).listen(false);
    controllers.spp.min(1).max(500).step(1).listen(false);
    controllers.max_depth.min(1).max(100).listen(false);
    controllers.focus_dist.min(0.01).listen(false);
    controllers.defocus_angle.min(0).max(2).step(0.01).listen(false);
    controllers.vfov.min(1).max(110).step(1).listen(false);

    const get_values = () => {
        return gui.save().controllers;
    };

    return {
        gui,
        controllers,
        get_values,
    };
};

export { createGui };
