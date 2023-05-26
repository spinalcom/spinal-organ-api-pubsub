import { Lst, Model } from 'spinal-core-connectorjs';
import { INodeId } from '../interfaces';
export declare class PubSubStore extends Model {
    constructor();
    addToStore(userSecretId: string, data: INodeId | INodeId[]): Lst;
    deleteToStore(userSecretId: string, id: INodeId): boolean;
    getIds(userSecretId: string): Lst;
    reset(): void;
    findIndex(userSecretId: string, id: INodeId): number;
    private _compareOptions;
    private _deleteModelAttributes;
}
