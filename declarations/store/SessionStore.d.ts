import { Lst } from 'spinal-core-connectorjs';
import { PubSubStore } from '../models';
import { INodeId } from '../interfaces';
export declare class SessionStore {
    private static instance;
    private store;
    private constructor();
    static getInstance(): SessionStore;
    init(connect: spinal.FileSystem): Promise<PubSubStore>;
    getSubscribedData(userId: string): Promise<INodeId[]>;
    saveSubscriptionData(userId: string, data: INodeId | INodeId[]): Promise<Lst>;
    deleteSubscriptionData(userId: string, data: INodeId | INodeId[]): Promise<boolean>[];
    private _loadOrMakeConfigFile;
    private _createFile;
    private _scheduleReInit;
    private _reInitializeStore;
    test(): void;
}
