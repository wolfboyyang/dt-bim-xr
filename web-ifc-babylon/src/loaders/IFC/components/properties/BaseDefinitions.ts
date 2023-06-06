import {PropertySerializer} from "./PropertySerializer";
import { AbstractMesh } from "@babylonjs/core";

export interface PropertyAPI {
    getItemProperties(modelID: number, elementID: number, recursive: boolean): Promise<any>;

    getAllItemsOfType(modelID: number, type: number, verbose: boolean): Promise<any[]>;

    getPropertySets(modelID: number, elementID: number, recursive: boolean): Promise<any[]>;

    getTypeProperties(modelID: number, elementID: number, recursive: boolean): Promise<any[]>;

    getMaterialsProperties(modelID: number, elementID: number, recursive: boolean): Promise<any[]>;

    getSpatialStructure(modelID: number, includeProperties?: boolean): Promise<any>;

    getHeaderLine(modelID: number, headerType: number): Promise<any>;

}

export interface PropertyManagerAPI extends PropertyAPI {
    getExpressId(geometry: AbstractMesh, faceIndex: number): number;
    serializer?: PropertySerializer;
}