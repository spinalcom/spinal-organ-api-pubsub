import { FileSystem } from "spinal-core-connectorjs";
import { ISpinalIOMiddleware, IConfig } from "./interfaces";
import { SpinalContext, SpinalGraph, SpinalNode } from "spinal-model-graph";
export declare class Middleware implements ISpinalIOMiddleware {
    config: IConfig;
    conn: FileSystem;
    loadedPtr: Map<number, any>;
    constructor(connect?: spinal.FileSystem, argConfig?: IConfig);
    getNode(nodeId: string | number, contextId?: string | number): Promise<SpinalNode>;
    getNodeWithServerId(server_id: number): Promise<SpinalNode>;
    getNodeWithStaticId(nodeId: string, contextId: string | number): Promise<SpinalNode<any>>;
    getGraph(): Promise<SpinalGraph>;
    getProfileGraph(): Promise<SpinalGraph>;
    getContext(contextId: number | string): Promise<SpinalContext>;
}
