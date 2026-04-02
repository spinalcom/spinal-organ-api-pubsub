import { Socket, Server } from "socket.io";
import { SpinalContext, SpinalGraph, SpinalNode } from "spinal-model-graph";
import { IConfig } from "../interfaces";
export interface ISpinalIOMiddleware {
    config: IConfig;
    conn: spinal.FileSystem;
    getGraph: () => Promise<SpinalGraph | undefined>;
    getProfileGraph: (socket?: Socket) => Promise<SpinalGraph | undefined>;
    tokenCheckMiddleware?: (io: Server) => void;
    getNode: (nodeId: string | number, contextId?: string | number, socket?: Socket) => Promise<SpinalNode | undefined>;
    getNodeWithServerId: (server_id: number, socket?: Socket) => Promise<SpinalNode | undefined>;
    getNodeWithStaticId: (nodeId: string, contextId: string | number, socket?: Socket) => Promise<SpinalNode | undefined>;
    getContext: (contextId: number | string, socket?: Socket) => Promise<SpinalContext | undefined>;
}
