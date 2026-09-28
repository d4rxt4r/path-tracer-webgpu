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
 * @property {import('./Vector.js').vec3} background
 * @property {number} lights_pdf_weight
 * @property {'off'|'overlay'|'only'} bvh_mode
 * @property {'level'|'leaves'} bvh_selection
 * @property {number} bvh_depth
 * @property {number} bvh_count
 */

export const default_settings = {
    scene: 0,

    cam_x: 0.0,
    cam_y: 0.0,
    cam_z: 2.0,

    at_x: 0.0,
    at_y: 0.0,
    at_z: 0.0,

    lights_pdf_weight: 0.5,

    spp: 50,
    max_depth: 50,

    vfov: 40,

    defocus_angle: 0.0,
    focus_dist: 10.0,

    background: [200, 220, 250],
};

const create_gui = (user_settings = {}) => {
    /* global lil */
    const gui = new lil.GUI();

    const settings = {
        ...default_settings,
        ...user_settings,
    };

    const controllers = Object.fromEntries(
        Object.keys(settings).map((key) => {
            if (key === 'background') {
                return [key, gui.addColor(settings, key, 255)];
            }

            return [key, gui.add(settings, key)];
        }),
    );

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
    controllers.lights_pdf_weight.min(0).max(1).step(0.01).listen(false);

    Object.assign(settings, { bvh_mode: 'off', bvh_selection: 'level', bvh_depth: 2, bvh_count: 0 });
    const bvh = gui.addFolder('BVH');
    controllers.bvh_mode = bvh.add(settings, 'bvh_mode', { Render: 'off', 'Render + BVH': 'overlay', 'BVH only': 'only' }).name('View');
    controllers.bvh_selection = bvh.add(settings, 'bvh_selection', { Level: 'level', Leaves: 'leaves' }).name('Nodes');
    controllers.bvh_depth = bvh.add(settings, 'bvh_depth', 0, 2, 1).name('Depth');
    controllers.bvh_count = bvh.add(settings, 'bvh_count').name('Selected nodes').disable();
    const update_bvh_controls = () => {
        controllers.bvh_selection.disable(settings.bvh_mode === 'off');
        controllers.bvh_depth.disable(settings.bvh_mode === 'off' || settings.bvh_selection === 'leaves');
    };
    update_bvh_controls();
    controllers.bvh_mode.onChange(update_bvh_controls);
    controllers.bvh_selection.onChange(update_bvh_controls);
    gui.set_bvh_info = (maxDepth, count) => {
        if (maxDepth !== null) {
            settings.bvh_depth = Math.min(settings.bvh_depth, maxDepth);
            controllers.bvh_depth.max(maxDepth).updateDisplay();
        }
        settings.bvh_count = count;
        controllers.bvh_count.updateDisplay();
        update_bvh_controls();
    };

    gui.get_values = function () {
        return { ...settings, background: Array.isArray(settings.background) ? [...settings.background] : settings.background };
    };

    return {
        gui,
        controllers,
    };
};

const copy_camera_settings = (user_settings = {}, controllers) => {
    const settings = {
        ...default_settings,
        ...user_settings,
    };

    Object.keys(settings).forEach((key) => {
        if (!key.startsWith('bvh_')) controllers[key].setValue(settings[key]);
    });
};

export { create_gui, copy_camera_settings };
