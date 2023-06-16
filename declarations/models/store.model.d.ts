import { Lst, Model } from 'spinal-core-connectorjs';
import { INodeId } from '../interfaces';
export declare class PubSubStore extends Model {
    constructor();
    addToStore(userSecretId: string, data: INodeId | INodeId[]): Promise<Lst>;
    deleteToStore(userSecretId: string, id: INodeId): Promise<boolean>;
    getUserStoreLst(userSecretId: string, createIfNotExist?: boolean): Promise<void | Lst>;
    reset(): void;
    findIndex(userData: Lst, id: INodeId): number;
    private _compareOptions;
    private _deleteModelAttributes;
    private _loadUserData;
}
