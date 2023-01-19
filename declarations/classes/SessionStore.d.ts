import { Lst } from "spinal-core-connectorjs";
import { PubSubStore } from "../models/store";
import { INodeId } from "../lib";
export declare class SessionStore {
    private static instance;
    private store;
    private constructor();
    static getInstance(): SessionStore;
    init(connect: spinal.FileSystem): Promise<PubSubStore>;
    getSubscribedData(userId: string): INodeId[];
    saveSubscriptionData(userId: string, data: INodeId | INodeId[]): Lst;
    deleteSubscriptionData(userId: string, data: INodeId | INodeId[]): boolean[];
    private _loadOrMakeConfigFile;
    private _createFile;
    private _scheduleReInit;
    private _reInitializeStore;
    test(): void;
}
declare const _default: SessionStore;
export default _default;
