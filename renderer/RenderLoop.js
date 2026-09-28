// One frame in flight; updates replace desired state rather than spawning another loop.
export class RenderLoop {
    constructor(
        renderer,
        {
            schedule = (callback) => globalThis.requestAnimationFrame(callback),
            cancel = (id) => globalThis.cancelAnimationFrame(id),
            onFrame = () => {},
            onError = console.error,
        } = {},
    ) {
        Object.assign(this, { renderer, schedule, cancel, onFrame, onError });
        this.revision = 0;
        this.frame = null;
        this.busy = false;
        this.desired = null;
    }

    update(state) {
        this.revision++;
        this.desired = state;
        if (this.frame !== null) this.cancel(this.frame);
        this.frame = null;
        this.queue();
    }

    stop() {
        this.revision++;
        this.desired = null;
        if (this.frame !== null) this.cancel(this.frame);
        this.frame = null;
    }

    queue() {
        if (!this.busy && this.desired && this.frame === null) this.frame = this.schedule(() => this.tick());
    }

    async tick() {
        this.frame = null;
        this.busy = true;
        const revision = this.revision;
        const state = this.desired;
        try {
            if (!state) return;
            if (state.scene !== this.scene) {
                await this.renderer.loadScene(state.scene);
                this.scene = state.scene;
                this.camera = null;
            }
            if (revision !== this.revision) return;
            if (state.camera !== this.camera) {
                this.renderer.setCamera(state.camera);
                await this.renderer.reset();
                this.camera = state.camera;
            }
            if (revision !== this.revision) return;
            await this.renderer.renderSample();
            if (revision !== this.revision) return;
            this.onFrame(this.renderer.samples);
            if (this.renderer.samples >= (state.preview ? 1 : state.spp)) this.desired = null;
        } catch (error) {
            if (revision === this.revision) {
                this.stop();
                this.onError(error);
            }
        } finally {
            this.busy = false;
            this.queue();
        }
    }
}
