import type { IfcState } from '../BaseDefinitions';

export class MemoryCleaner {
    constructor(private state: IfcState) {
    }

    async dispose() {
        Object.keys(this.state.models).forEach(modelID => {
            const model = this.state.models[parseInt(modelID, 10)];
            model.mesh?.dispose(false, true);

            model.mesh = null;
            model.types = null;
            model.jsonData = {};
        });

        this.state.api = null;
        this.state.models = {};
    }
}