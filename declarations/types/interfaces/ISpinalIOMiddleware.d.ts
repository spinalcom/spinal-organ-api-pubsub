import { Socket, Server } from "socket.io";
import { SpinalContext, SpinalGraph, SpinalNode } from "spinal-model-graph";
import { IConfig } from "spinal-organ-api-pubsub/src/types/interfaces/IConfig";
export interface ISpinalIOMiddleware {
    config: IConfig;
    conn: spinal.FileSystem;
    loadedPtr: Map<number, any>;
    getGraph: () => Promise<SpinalGraph>;
    getProfileGraph: (profileId?: string) => Promise<SpinalGraph>;
    tokenCheckMiddleware?: (io: Server) => void;
    getNode: (nodeId: string | number, contextId?: string | number, socket?: Socket) => Promise<SpinalNode>;
    getNodeWithServerId: (server_id: number, socket?: Socket) => Promise<SpinalNode>;
    getNodeWithStaticId: (nodeId: string, contextId: string | number, socket?: Socket) => Promise<SpinalNode>;
    getContext: (contextId: number | string, socket?: Socket) => Promise<SpinalContext>;
}
