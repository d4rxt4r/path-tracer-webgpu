/* global Stats */
import { SCENE_LIST } from './scenes.js';
import { create_gui, copy_camera_settings } from './classes/GUI.js';
import { get_camera_settings, init_camera_movement } from './classes/Camera.js';
import { create_renderer } from './renderer/Renderer.js';
import { RenderLoop } from './renderer/RenderLoop.js';

async function main() {
    const htmlCanvas = document.getElementById('canvas');
    const { gui, controllers } = create_gui(SCENE_LIST[0].camera);
    const stats = new Stats();
    document.body.appendChild(stats.dom);
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
        onError: show_error,
    });
    let copying = false;
    const request_render = () => {
        try {
            const settings = gui.get_values();
            loop.update({
                scene: SCENE_LIST[settings.scene],
                camera: get_camera_settings(settings, htmlCanvas.width, htmlCanvas.height),
                spp: settings.spp,
            });
        } catch (error) {
            loop.stop();
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
        request_render();
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

function show_error(error) {
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
