// modified from https://github.com/anders-lundgren/web-ifc-babylon/blob/master/src/IfcLoader.ts

import "@babylonjs/loaders/glTF";
import { IfcAPI } from "web-ifc/web-ifc-api";
import type {
    AbstractMesh,
    IndicesArray,
    ISceneLoaderAsyncResult,
    ISceneLoaderPlugin,
    ISceneLoaderPluginAsync,
    ISceneLoaderPluginExtensions,
    ISceneLoaderPluginFactory,
    Nullable,
    Scene,
} from "@babylonjs/core";
import {
    AssetContainer,
    Color3,
    Matrix,
    Mesh,
    SceneLoader,
    StandardMaterial,
    TransformNode,
    VertexData,
} from "@babylonjs/core";

export class IfcLoader implements ISceneLoaderPluginAsync, ISceneLoaderPluginFactory {
    /**
     * Defines the name of the plugin.
     */
    public name = "ifc";
    /**
     * Defines the extension the plugin is able to load.
     */
    public extensions: ISceneLoaderPluginExtensions = {
        ".ifc": { isBinary: true },
    };

    private _assetContainer: Nullable<AssetContainer> = null;

    constructor() {
    }

    public ifcAPI = new IfcAPI();

    async initialize() {
        await this.ifcAPI.Init();
    }

    /**
     * Imports one or more meshes from the loaded IFC data and adds them to the scene
     * @param meshesNames a string or array of strings of the mesh names that should be loaded from the file
     * @param scene the scene the meshes should be added to
     * @param data the IFC data to load
     * @param rootUrl root url to load from
     * @returns a promise containing the loaded meshes, particles, skeletons and animations
     */
    public async importMeshAsync(_meshesNames: any, scene: Scene, data: ArrayBuffer, _rootUrl: string): Promise<ISceneLoaderAsyncResult> {
        return this._loadIfcModel(data, scene, true).then((meshes) => {
            return {
                meshes,
                particleSystems: [],
                skeletons: [],
                animationGroups: [],
                transformNodes: [],
                geometries: [],
                lights: [],
            };
        });
    }

    /**
     * Load into an asset container.
     * @param scene The scene to load into
     * @param data The data to import
     * @param rootUrl The root url for scene and resources
     * @returns The loaded asset container
     */
    public loadAssetContainerAsync(scene: Scene, data: any, rootUrl: string): Promise<AssetContainer> {
        const container = new AssetContainer(scene);
        this._assetContainer = container;

        return this.importMeshAsync(null, scene, data, rootUrl)
            .then((result) => {
                result.meshes.forEach((mesh) => container.meshes.push(mesh));
                result.meshes.forEach((mesh) => {
                    const material = mesh.material;
                    if (material) {
                        // Materials
                        if (container.materials.indexOf(material) == -1) {
                            container.materials.push(material);

                            // Textures
                            const textures = material.getActiveTextures();
                            textures.forEach((t) => {
                                if (container.textures.indexOf(t) == -1) {
                                    container.textures.push(t);
                                }
                            });
                        }
                    }
                });
                this._assetContainer = null;
                return container;
            })
            .catch((ex) => {
                this._assetContainer = null;
                throw ex;
            });
    }

    /**
     * Instantiates a IFC file loader plugin.
     * @returns the created plugin
     */
    public createPlugin(): ISceneLoaderPluginAsync | ISceneLoaderPlugin {
        return new IfcLoader();
    }
    
    
    /**
     * If the data string can be loaded directly.
     * @returns if the data can be loaded directly
     */
    public canDirectLoad(): boolean {
        return false;
    }

    /**
     * Imports all objects from the loaded IFC data and adds them to the scene
     * @param scene the scene the objects should be added to
     * @param data the IFC data to load
     * @param rootUrl root url to load from
     * @returns a promise which completes when objects have been loaded to the scene
     */
    public loadAsync(scene: Scene, data: ArrayBuffer, rootUrl: string): Promise<void> {
        //Get the 3D model
        return this.importMeshAsync(null, scene, data, rootUrl).then(() => {
            // return void
        });
    }

    private async _loadIfcModel(data, scene, mergematerials): Promise<Array<AbstractMesh>> {
        if(this.ifcAPI.wasmModule == undefined) {
            await this.initialize();
        };

        const mToggle_YZ = [
            1, 0, 0, 0,
            0, -1, 0, 0,
            0, 0, -1, 0,
            0, 0, 0, -1];

        const modelID = await this.ifcAPI.OpenModel(new Uint8Array(data));
        await this.ifcAPI.SetGeometryTransformation(modelID, mToggle_YZ);
        const flatMeshes = this.getFlatMeshes(modelID);

        scene.blockMaterialDirtyMechanism = true;
        scene.useGeometryIdsMap = true;
        scene.useMaterialMeshMap = true;
        
        let nodecount = 0;
        let currentnode = 0;

        scene._blockEntityCollection = !!this._assetContainer;
        const mainObject = new Mesh("custom", scene);
        mainObject._parentContainer = this._assetContainer;
        scene._blockEntityCollection = false;
        
        let meshnode;

        let meshmaterials = new Map <number, Mesh>();

        for (let i = 0; i < flatMeshes.size(); i++) {
            const placedGeometries = flatMeshes.get(i).geometries;
            if (nodecount++%100 == 0) {
                currentnode ++;
                meshnode = new TransformNode ("node" + currentnode, scene);
                meshnode.parent = mainObject;
                meshmaterials = new Map <number, Mesh>();
            }
            for (let j = 0; j < placedGeometries.size(); j++) {
                this.getPlacedGeometry(modelID, placedGeometries.get(j), scene, meshnode, meshmaterials, mergematerials)
            }
        }

        return [mainObject];
    }

    getFlatMeshes(modelID) {
        const flatMeshes = this.ifcAPI.LoadAllGeometry(modelID);
        return flatMeshes;
    }

    async getPlacedGeometry(modelID, placedGeometry, scene, mainObject, meshmaterials, mergematerials) {
        const meshgeometry = this.getBufferGeometry(modelID, placedGeometry, scene);
        if (meshgeometry != null) {
            const m = placedGeometry.flatTransformation;

            const matrix = new Matrix();
            matrix.setRowFromFloats(0, m[0], m[1], m[2], m[3]);
            matrix.setRowFromFloats(1, m[4], m[5], m[6], m[7]);
            matrix.setRowFromFloats(2, m[8], m[9], m[10], m[11]);
            matrix.setRowFromFloats(3, m[12], m[13], m[14], m[15]);

            // Some IFC files are not parsed correctly, leading to degenerated meshes
            try {
                meshgeometry.bakeTransformIntoVertices(matrix);
            }
            catch {
                console.warn("Unable to bake transform matrix into vertex array. Some elements may be in the wrong position.");
            }

            let color = placedGeometry.color;
            let colorid:number = Math.floor(color.x*256)+Math.floor(color.y*256**2)+Math.floor(color.z*256**3)+Math.floor(color.w*256**4);

            if (mergematerials && meshmaterials.has(colorid)) {
                const tempmesh: Mesh = meshmaterials.get(colorid);

                meshgeometry.material = tempmesh.material;
                const mergedmesh = Mesh.MergeMeshes([tempmesh, meshgeometry], true, true);
                mergedmesh!.name = colorid.toString(16);

                mergedmesh!.material!.freeze();
                mergedmesh!.freezeWorldMatrix();

                meshmaterials.set(colorid, mergedmesh);
                mergedmesh!.parent = mainObject;

            }
            else {
                const newMaterial = this.getMeshMaterial(color, scene)
                meshgeometry.material = newMaterial;

                meshgeometry.material.freeze();
                meshgeometry.freezeWorldMatrix();

                meshmaterials.set(colorid, meshgeometry);
                meshgeometry.parent = mainObject;
            }        

            return meshgeometry;
        }
        else return null;
    }

     getBufferGeometry(modelID, placedGeometry, scene) {
        const geometry = this.ifcAPI.GetGeometry(modelID, placedGeometry.geometryExpressID);
        if (geometry.GetVertexDataSize() !== 0) {
            const vertices = this.ifcAPI.GetVertexArray(geometry.GetVertexData(), geometry.GetVertexDataSize());
            const indices = this.ifcAPI.GetIndexArray(geometry.GetIndexData(), geometry.GetIndexDataSize());

            scene._blockEntityCollection = !!this._assetContainer;
            const mesh = new Mesh("custom", scene);
            mesh._parentContainer = this._assetContainer;
            scene._blockEntityCollection = false;

            const vertexData = this.getVertexData(vertices, indices);
            vertexData.applyToMesh(mesh, false);

            return mesh;
        }
        else return null;
    }

    getVertexData(vertices: Float32Array, indices: IndicesArray) {
        const positions = new Array(Math.floor(vertices.length / 2));
        const normals = new Array(Math.floor(vertices.length / 2));
        for (let i = 0; i < vertices.length / 6; i++) {
            positions[i * 3 + 0] = vertices[i * 6 + 0];            
            positions[i * 3 + 1] = vertices[i * 6 + 1];            
            positions[i * 3 + 2] = vertices[i * 6 + 2];            
            normals[i * 3 + 0] = vertices[i * 6 + 3];            
            normals[i * 3 + 1] = vertices[i * 6 + 4];            
            normals[i * 3 + 2] = vertices[i * 6 + 5];            
        }
        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.normals = normals;
        vertexData.indices = indices;

        return vertexData;
    }

    getMeshMaterial(color, scene) {
        const myMaterial = new StandardMaterial("myMaterial", scene);

        myMaterial.emissiveColor = new Color3(color.x, color.y, color.z);
        // if material has alpha - make it fully transparent for performance
        myMaterial.alpha = (color.w<1.0?0:1);
        myMaterial.sideOrientation = Mesh.DOUBLESIDE;
        myMaterial.backFaceCulling = false;
        myMaterial.disableLighting = true;    

        return myMaterial;
    }
}

if (SceneLoader) {
    //Add this loader into the register plugin
    SceneLoader.RegisterPlugin(new IfcLoader());
}