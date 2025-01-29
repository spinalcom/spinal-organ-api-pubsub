import { Server, Socket } from "socket.io";
import { INodeId, IAction, ISpinalIOMiddleware } from "../interfaces";
import { SpinalNode } from "spinal-model-graph";
import { UpdateDataType } from "../types";
export declare class SocketHandler {
    private io;
    private spinalIOMiddleware;
    subscriptionMap: Map<string, {
        [key: string]: INodeId[];
    }>;
    constructor(io: Server, spinalIOMiddleware: ISpinalIOMiddleware);
    saveSubscriptionData(sessionId: string, eventName: string, subscription_data: INodeId): void;
    getSubscriptionData(eventName: string, sessionId: string): INodeId[];
    listenConnectionEvent(): void;
    listenSubscribeEvent(socket: Socket): void;
    listenUnsubscribeEvent(socket: Socket): void;
    listenDisconnectEvent(socket: Socket): void;
    sendSocketEvent(node: SpinalNode, model: UpdateDataType, eventName: string, action?: IAction, socket?: Socket): Promise<void>;
    private _subscribe;
    private _launchNodeBinding;
    _joinRoom(socket: Socket, subscription_data: INodeId, eventNames: string[]): string[];
    private _leaveRoom;
    private _checkAndFormatParams;
    _getSessionId(socket: Socket): string;
    private _setSessionMiddleware;
    private _getAllSocketInRooms;
}
export default SocketHandler;
