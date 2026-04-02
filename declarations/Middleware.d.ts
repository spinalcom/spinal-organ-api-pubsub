import { FileSystem } from "spinal-core-connectorjs";
import { ISpinalIOMiddleware, IConfig } from "./interfaces";
import { SpinalContext, SpinalGraph, SpinalNode } from "spinal-model-graph";
export declare class Middleware implements ISpinalIOMiddleware {
    config: IConfig;
    conn: FileSystem;
    iteratorGraph: AsyncGenerator<SpinalGraph, never> | undefined;
    constructor(connect?: spinal.FileSystem, argConfig?: IConfig);
    private geneGraph;
    getNode(nodeId: string | number, contextId?: string | number): Promise<SpinalNode | undefined>;
    getNodeWithServerId(server_id: number): Promise<SpinalNode | undefined>;
    getNodeWithStaticId(nodeId: string, contextId?: string | number): Promise<SpinalNode | undefined>;
    getGraph(): Promise<SpinalGraph | undefined>;
    getProfileGraph(): Promise<SpinalGraph | undefined>;
    getContext(contextId: number | string): Promise<SpinalContext | undefined>;
}
