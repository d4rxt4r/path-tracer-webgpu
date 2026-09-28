/* global Stats */
import { SCENE_LIST } from './scenes.js';
import { create_gui, copy_camera_settings } from './classes/GUI.js';
import { get_camera_settings, init_camera_movement } from './classes/Camera.js';
import { create_renderer } from './renderer/Renderer.js';
import { RenderLoop } from './renderer/RenderLoop.js';
import { BvhView } from './renderer/BvhView.js';

async function main() {
    const htmlCanvas = document.getElementById('canvas');
    const bvhView = new BvhView(document.getElementById('bvh-canvas'));
    const { gui, controllers } = create_gui(SCENE_LIST[0].camera);
    const stats = new Stats();
    document.body.appendChild(stats.dom);
    // Allow the static loading status to paint before synchronous kernel initialization.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const renderer = await create_renderer(htmlCanvas, { scenes: SCENE_LIST });
    const loop = new RenderLoop(renderer, {
        schedule: (callback) =>
            requestAnimationFrame(() => {
                stats.begin();
                return callback();
            }),
        onFrame: () => {
            stats.end();
            document.getElementById('render-error')?.remove();
        },
        onError: (error) => {
            bvhView.clear();
            show_error(error);
        },
        onLoadingChange: (loading) => {
            if (loading) bvhView.clear();
            set_loading(loading);
        },
        onView: (state) => {
            if (state.bvh.mode === 'off') {
                bvhView.clear();
                gui.set_bvh_info(null, 0);
                return;
            }
            const data = renderer.getBvhDebugData();
            const count = bvhView.draw(data, state.camera, state.bvh, htmlCanvas.width, htmlCanvas.height);
            gui.set_bvh_info(data.maxDepth, count);
        },
    });
    let copying = false;
    let camera;
    const request_render = (preserveCamera = false) => {
        try {
            const settings = gui.get_values();
            const nextCamera = get_camera_settings(settings, htmlCanvas.width, htmlCanvas.height);
            if (!preserveCamera || JSON.stringify(camera) !== JSON.stringify(nextCamera)) {
                camera = nextCamera;
                bvhView.clear();
            }
            loop.update({
                scene: SCENE_LIST[settings.scene],
                camera,
                spp: settings.spp,
                bvh: { mode: settings.bvh_mode, selection: settings.bvh_selection, depth: settings.bvh_depth },
            });
        } catch (error) {
            loop.stop();
            bvhView.clear();
            show_error(error);
        }
    };
    gui.onChange((event) => {
        if (copying) return;
        if (event.property === 'scene') {
            copying = true;
            try {
                copy_camera_settings(SCENE_LIST[event.value].camera, controllers);
            } finally {
                copying = false;
            }
        }
        request_render(event.property.startsWith('bvh_'));
    });
    const dispose_movement = init_camera_movement(htmlCanvas, controllers, gui.get_values.bind(gui));
    window.rerender = request_render;
    window.addEventListener(
        'pagehide',
        () => {
            loop.stop();
            dispose_movement();
            gui.destroy();
            delete window.rerender;
        },
        { once: true },
    );
    request_render();
}

function set_loading(loading) {
    document.getElementById('scene-loading').hidden = !loading;
    document.getElementById('render-viewport').setAttribute('aria-busy', String(loading));
}

function show_error(error) {
    set_loading(false);
    console.error(error);
    let status = document.getElementById('render-error');
    if (!status) {
        status = document.createElement('p');
        status.id = 'render-error';
        status.setAttribute('role', 'alert');
        document.body.appendChild(status);
    }
    status.textContent = `Rendering stopped: ${error.message}`;
}

main().catch(show_error);
