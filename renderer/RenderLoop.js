// One frame in flight; updates replace desired state rather than spawning another loop.
export class RenderLoop {
    constructor(
        renderer,
        {
            schedule = (callback) => globalThis.requestAnimationFrame(callback),
            cancel = (id) => globalThis.cancelAnimationFrame(id),
            onFrame = () => {},
            onLoadingChange = () => {},
            onError = console.error,
        } = {},
    ) {
        Object.assign(this, { renderer, schedule, cancel, onFrame, onLoadingChange, onError });
        this.revision = 0;
        this.frame = null;
        this.busy = false;
        this.desired = null;
        this.loading = false;
    }

    update(state) {
        this.revision++;
        this.desired = state;
        this.setLoading(state.scene !== this.presentedScene);
        if (this.frame !== null) this.cancel(this.frame);
        this.frame = null;
        this.queue();
    }

    stop() {
        this.revision++;
        this.desired = null;
        if (this.frame !== null) this.cancel(this.frame);
        this.frame = null;
        this.setLoading(false);
    }

    setLoading(value) {
        if (this.loading === value) return;
        this.loading = value;
        this.onLoadingChange(value);
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
            this.presentedScene = state.scene;
            this.setLoading(false);
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
