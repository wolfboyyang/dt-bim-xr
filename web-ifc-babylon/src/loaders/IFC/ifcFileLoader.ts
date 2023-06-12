// modified from https://github.com/anders-lundgren/web-ifc-babylon/blob/master/src/IfcLoader.ts
import "@babylonjs/loaders/glTF";
import type {
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
    SceneLoader,
} from "@babylonjs/core";
import { IFCManager } from "./components/IFCManager";

export class IFCFileLoader implements ISceneLoaderPluginAsync, ISceneLoaderPluginFactory {
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

    private _ifcManager: IFCManager;

    constructor() {
        this._ifcManager = new IFCManager();
        this._ifcManager.setOnProgress((event) => {
            console.log(`${Math.trunc(event.loaded / event.total * 100)}% loaded`);
        });
    }

    public setupCoordinationMatrix(m: number[]) {
        this._ifcManager.setupCoordinationMatrix(m);
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
        if (!scene.useRightHandedSystem) {
            const mToggle_YZ = [
                1, 0, 0, 0,
                0, -1, 0, 0,
                0, 0, -1, 0,
                0, 0, 0, -1];
            this._ifcManager.setupCoordinationMatrix(mToggle_YZ);
        }
        else this._ifcManager.clearCoordinationMatrix();

        const model = await this._ifcManager.parse(data, scene, this._assetContainer);
        return {
            meshes: [model],
            particleSystems: [],
            skeletons: [],
            animationGroups: [],
            transformNodes: [],
            geometries: [],
            lights: [],
        };

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
        return new IFCFileLoader();
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

}

if (SceneLoader) {
    SceneLoader.RegisterPlugin(new IFCFileLoader());
}