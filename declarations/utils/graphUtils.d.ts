import { SpinalNode, SpinalContext, SpinalGraph } from 'spinal-env-viewer-graph-service';
import { ISubscribeOptions } from '../lib';
import { Server, Socket } from "socket.io";
declare class SpinalGraphUtils {
    spinalConnection: spinal.FileSystem;
    private nodeBinded;
    private static instance;
    private io;
    private constructor();
    static getInstance(): SpinalGraphUtils;
    init(conn: spinal.FileSystem, graph?: SpinalGraph): Promise<SpinalGraph>;
    setIo(io: Server): void;
    getNode(nodeId: string | number, contextId?: string | number): Promise<SpinalNode<any>>;
    getNodeWithServerId(server_id: number): Promise<any>;
    getContext(contextId: number | string): Promise<SpinalContext>;
    getNodeWithStaticId(nodeId: string, contextId: string | number): Promise<SpinalNode<any>>;
    bindNode(node: SpinalNode<any>, context: SpinalContext<any>, options: ISubscribeOptions, eventName?: string, socket?: Socket): Promise<void>;
    bindContextTree(startNode: SpinalNode<any>, context: SpinalContext<any>, socket: Socket): void;
    bindChildNotInContext(node: SpinalNode<any>, socket: Socket): Promise<void>;
    rebindAllNodes(): Promise<void>;
    bindTreeNotInContext(node: SpinalNode<any>, socket: Socket): Promise<void>;
    private _getTreeNotInContext;
    private _rebindNode;
    private _unbindAllNodes;
    private _unbindNode;
    private _unbindBindProcess;
    private _bindAllChild;
    private _bindChildInContext;
    private _getRelationNameNotInContext;
    private _getRelationNames;
    private _bindInfoAndElement;
    private _addNodeToBindedNode;
    private _formatNode;
    private _sendSocketEvent;
    private _listenAddChildEvent;
    private _listenAddChildInContextEvent;
    private _listenRemoveChildEvent;
    private _listenAddChildrenEvent;
    private _activeEventSender;
    private _findNode;
    private _callbackListen;
}
export declare const spinalGraphUtils: SpinalGraphUtils;
export {};
