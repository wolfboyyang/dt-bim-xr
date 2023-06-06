import { Color3, Geometry, Material, Matrix, Mesh, Nullable, StandardMaterial, TransformNode, VertexData } from '@babylonjs/core';
import {
    PlacedGeometry,
    Color as ifcColor,
    IfcGeometry,
    IFCSPACE,
    FlatMesh,
    IFCOPENINGELEMENT,
    IFCPRODUCTDEFINITIONSHAPE
} from 'web-ifc';
import { IfcState, IfcMesh } from '../BaseDefinitions';

import { IFCModel } from './IFCModel';

export interface ParserProgress {
    loaded: number;
    total: number;
}

export interface OptionalCategories {
    [category: number]: boolean
}

export interface ParserAPI {
    parse(buffer: any, coordinationMatrix?: number[]): Promise<IFCModel>;

    getAndClearErrors(_modelId: number): void;

    setupOptionalCategories(config: OptionalCategories): Promise<void>;

    optionalCategories: OptionalCategories;
}

export interface GeometriesByMaterial {
    [materialID: string]: {
        material: Material,
        geometries: Mesh[]
    }
}

/**
 * Reads all the geometry of the IFC file and generates an optimized `THREE.Mesh`.
 */
export class IFCParser implements ParserAPI {
    loadedModels = 0;

    optionalCategories: OptionalCategories = {
        [IFCSPACE]: true,
        [IFCOPENINGELEMENT]: false
    };

    private geometriesByMaterials: Record<number, Mesh[]> = {};

    private loadingState = {
        total: 0,
        current: 0,
        step: 0.1
    }

    // Represents the index of the model in webIfcAPI
    private currentWebIfcID = -1;
    // When using JSON data for optimization, webIfcAPI is reinitialized every time a model is loaded
    // This means that currentID is always 0, while currentModelID is the real index of stored models
    private currentModelID = -1;

    // BVH is optional because when using workers we have to apply it in the main thread,
    // once the model has been serialized and reconstructed
    constructor(private state: IfcState) {
    }

    async setupOptionalCategories(config: OptionalCategories) {
        this.optionalCategories = config;
    }

    async parse(buffer: any, coordinationMatrix?: number[]): Promise<IFCModel> {

        if (this.state.api?.wasmModule === undefined) await this.state.api?.Init();
        await this.newIfcModel(buffer);

        this.loadedModels++;
        if (coordinationMatrix && coordinationMatrix.length === 16) {
            await this.state.api?.SetGeometryTransformation(this.currentWebIfcID, coordinationMatrix);
        }
        return this.loadAllGeometry(this.currentWebIfcID);
    }

    getAndClearErrors(_modelId: number) {
        return this.state.api?.GetAndClearErrors(_modelId);
    }

    private notifyProgress(loaded: number, total: number) {
        if (this.state.onProgress) this.state.onProgress({ loaded, total });
    }

    private async newIfcModel(buffer: ArrayBuffer) {
        const data = new Uint8Array(buffer);
        this.currentWebIfcID = await this.state.api?.OpenModel(data, this.state.webIfcSettings)!;
        this.currentModelID = this.state.useJSON ? this.loadedModels : this.currentWebIfcID;
        this.state.models[this.currentModelID] = {
            modelID: this.currentModelID,
            mesh: {} as IfcMesh,
            types: {},
            jsonData: {}
        };
    }

    private async loadAllGeometry(modelID: number): Promise<IFCModel> {
        const model = new IFCModel(modelID.toString());

        this.addOptionalCategories(modelID);
        await this.initializeLoadingState(modelID);

        this.state.api?.StreamAllMeshes(modelID, (mesh: FlatMesh) => {
            this.updateLoadingState();
            // only during the lifetime of this function call, the geometry is available in memory
            this.streamMesh(modelID, mesh);
        });

        this.notifyLoadingEnded();

        Object.values(this.geometriesByMaterials).forEach(async (geometries) => {

            const geometry = await Mesh.MergeMeshesAsync(geometries, true, true) as Mesh;
            geometry.freezeWorldMatrix();
            geometry.parent = model;
        });

        this.geometriesByMaterials = {};

        this.state.models[this.currentModelID].mesh = model;
        return model;
    }

    private async initializeLoadingState(modelID: number) {
        const shapes = await this.state.api!.GetLineIDsWithType(modelID, IFCPRODUCTDEFINITIONSHAPE);
        this.loadingState.total = shapes?.size();
        this.loadingState.current = 0;
        this.loadingState.step = 0.1;
    }

    private notifyLoadingEnded() {
        this.notifyProgress(this.loadingState.total, this.loadingState.total);
    }

    private updateLoadingState() {
        const realCurrentItem = Math.min(this.loadingState.current++, this.loadingState.total);
        if (realCurrentItem / this.loadingState.total >= this.loadingState.step) {
            const currentProgress = Math.ceil(this.loadingState.total * this.loadingState.step);
            this.notifyProgress(currentProgress, this.loadingState.total);
            this.loadingState.step += 0.1;
        }
    }

    // Some categories (like IfcSpace and IfcOpeningElement) need to be set explicitly
    private addOptionalCategories(modelID: number) {

        const optionalTypes: number[] = [];

        for (let key in this.optionalCategories) {
            if (this.optionalCategories.hasOwnProperty(key)) {
                const category = parseInt(key);
                if (this.optionalCategories[category]) optionalTypes.push(category);
            }
        }

        this.state.api?.StreamAllMeshesWithTypes(this.currentWebIfcID, optionalTypes, (mesh: FlatMesh) => {
            this.streamMesh(modelID, mesh);
        });
    }

    private streamMesh(modelID: number, mesh: FlatMesh) {
        const placedGeometries = mesh.geometries;
        const size = placedGeometries.size();

        for (let i = 0; i < size; i++) {
            const placedGeometry = placedGeometries.get(i);
            const geometry = this.getPlacedGeometry(modelID, mesh.expressID, placedGeometry)!;
            if (geometry !== null)
                this.storeGeometryByMaterial(placedGeometry.color, geometry);
        }
    }

    private getPlacedGeometry(modelID: number, expressID: number, placedGeometry: PlacedGeometry): Nullable<Mesh> {
        const geometry = this.getBufferGeometry(modelID, expressID, placedGeometry);
        if (geometry === null) return null;

        const matrix = Matrix.FromArray(placedGeometry.flatTransformation);

        // Some IFC files are not parsed correctly, leading to degenerated meshes
        try {
            geometry.bakeTransformIntoVertices(matrix);
        }
        catch {
            console.warn("Unable to bake transform matrix into vertex array. Some elements may be in the wrong position.");
        }

        return geometry;
    }

    private getBufferGeometry(modelID: number, expressID: number, placedGeometry: PlacedGeometry): Nullable<Mesh> {
        // WARNING: geometry must be deleted when requested from WASM
        const geometry = this.state.api?.GetGeometry(modelID, placedGeometry.geometryExpressID) as IfcGeometry;
        if (geometry.GetVertexDataSize() === 0) return null;
        const verts = this.state.api?.GetVertexArray(geometry.GetVertexData(), geometry.GetVertexDataSize()) as Float32Array;
        const indices = this.state.api?.GetIndexArray(geometry.GetIndexData(), geometry.GetIndexDataSize()) as Uint32Array;

        const buffer = this.ifcGeometryToBuffer(expressID, verts, indices);
        //@ts-ignore
        geometry.delete();
        return buffer;
    }

    private storeGeometryByMaterial(color: ifcColor, geometry: Mesh) {

        let colorid: number = Math.floor(color.x * 256) + Math.floor(color.y * 256 ** 2)
            + Math.floor(color.z * 256 ** 3) + Math.floor(color.w * 256 ** 4);
        if (this.geometriesByMaterials[colorid]) {
            this.geometriesByMaterials[colorid].push(geometry);
            return;
        }

        // Assume RGB components are in sRGB-Rec709-D65 colorspace
        const newMaterial = this.getMeshMaterial(color);
        newMaterial.freeze();
        geometry.material = newMaterial;
        this.geometriesByMaterials[colorid] = [geometry];
    }

    private ifcGeometryToBuffer(expressID: number, vertexData: Float32Array, indexData: Uint32Array): Mesh {
        const geometry = new Mesh(expressID.toString());
        geometry.freezeWorldMatrix();

        const posFloats = new Float32Array(vertexData.length / 2);
        const normFloats = new Float32Array(vertexData.length / 2);

        for (let i = 0; i < vertexData.length; i += 6) {
            posFloats[i / 2] = vertexData[i];
            posFloats[i / 2 + 1] = vertexData[i + 1];
            posFloats[i / 2 + 2] = vertexData[i + 2];

            normFloats[i / 2] = vertexData[i + 3];
            normFloats[i / 2 + 1] = vertexData[i + 4];
            normFloats[i / 2 + 2] = vertexData[i + 5];
        }

        const data = new VertexData();
        data.positions = posFloats;
        data.normals = normFloats;
        data.indices = indexData;

        data.applyToMesh(geometry);

        return geometry;
    }

    private getMeshMaterial(color: ifcColor): Material {
        const name = `(${Math.floor(color.x * 256)},${Math.floor(color.y * 256)},${Math.floor(color.z * 256)},${Math.floor(color.w * 256)})`;
        const material = new StandardMaterial(name);
        material.emissiveColor = new Color3(color.x, color.y, color.z);
        // if material has alpha - make it fully transparent for performance
        material.alpha = (color.w < 1.0 ? 0 : 1);
        material.sideOrientation = Mesh.DOUBLESIDE;
        material.backFaceCulling = false;
        material.disableLighting = true;

        return material;
    }
}
