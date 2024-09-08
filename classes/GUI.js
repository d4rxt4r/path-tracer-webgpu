import { SCENE_SELECT } from '../scenes.js';

/**
 * @typedef GUISettings
 * @property {number} scene
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
    scene: 0,

    cam_x: 0.0,
    cam_y: 0.0,
    cam_z: 2.0,

    at_x: 0.0,
    at_y: 0.0,
    at_z: 0.0,

    spp: 50,
    max_depth: 50,

    vfov: 40,

    defocus_angle: 0.0,
    focus_dist: 10.0,
};

const createGui = (user_settings = {}) => {
    // eslint-disable-next-line no-undef
    const gui = new lil.GUI();

    const settings = {
        ...default_settings,
        ...user_settings,
    };

    const controllers = Object.fromEntries(Object.keys(settings).map((key) => [key, gui.add(settings, key)]));

    controllers.scene.options(SCENE_SELECT);
    controllers.at_x.step(0.01).listen(false);
    controllers.at_y.step(0.01).listen(false);
    controllers.at_z.step(0.01).listen(false);
    controllers.cam_x.step(0.01).listen(false);
    controllers.cam_y.step(0.01).listen(false);
    controllers.cam_z.step(0.01).listen(false);
    controllers.spp.min(1).max(2000).step(1).listen(false);
    controllers.max_depth.min(1).max(200).step(1).listen(false);
    controllers.focus_dist.min(0.01).listen(false);
    controllers.defocus_angle.min(0).max(2).step(0.01).listen(false);
    controllers.vfov.min(1).max(110).step(1).listen(false);

    gui.get_values = function () {
        return this.save().controllers;
    };

    return {
        gui,
        controllers,
    };
};

export { createGui };
