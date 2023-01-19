import { Lst, Model } from "spinal-core-connectorjs";
import { INodeId } from "../lib";
export declare class PubSubStore extends Model {
    constructor();
    addToStore(userSecretId: string, data: INodeId | INodeId[]): Lst;
    deleteToStore(userSecretId: string, id: INodeId): boolean;
    getIds(userSecretId: string): Lst;
    reset(): void;
    findIndex(userSecretId: any, id: INodeId): number;
    private _compareOptions;
    private _deleteModelAttributes;
}
