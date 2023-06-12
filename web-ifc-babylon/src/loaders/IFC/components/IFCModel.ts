import { Mesh } from '@babylonjs/core';
import type { IFCManager } from './IFCManager';

/**
 * Represents an IFC model. This object is returned by the `IFCLoader` after loading an IFC.
 * @geometry `THREE.Buffergeometry`, see Three.js documentation.
 * @materials `THREE.Material[]`, see Three.js documentation.
 * @manager contains all the logic to work with IFC.
 */
export class IFCModel extends Mesh {

    private static modelIdCounter = 0;

    static dispose() {
        IFCModel.modelIdCounter = 0;
    }

    modelID = IFCModel.modelIdCounter++;
    ifcManager: IFCManager | null = null;

    setIFCManager(manager: IFCManager) {
        this.ifcManager = manager;
    }
}
