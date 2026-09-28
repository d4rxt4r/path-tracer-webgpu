import test from 'node:test';
import assert from 'node:assert/strict';
import { get_camera_settings } from '../classes/Camera.js';
import { default_settings } from '../classes/GUI.js';

test('camera pointing straight up still has a nonzero horizontal pixel step', () => {
    const camera = get_camera_settings({ ...default_settings, cam_x: 0, cam_y: 0, cam_z: 0, at_x: 0, at_y: 1, at_z: 0 }, 320, 180);
    assert.ok(Math.hypot(camera.pixel_delta_u_x, camera.pixel_delta_u_y, camera.pixel_delta_u_z) > 0);
});
test('degenerate camera is rejected instead of submitting zero-direction rays', () => {
    assert.throws(() => get_camera_settings({ ...default_settings, cam_x: 0, cam_y: 0, cam_z: 0 }, 320, 180), /camera/i);
});
