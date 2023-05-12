import { Server, Socket } from 'socket.io';
import { INodeId, IAction, ISpinalIOMiddleware } from '../interfaces';
import { SpinalNode } from 'spinal-model-graph';
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
    sendSocketEvent(node: SpinalNode, model: {
        info: {
            [key: string]: any;
        };
        element: {
            [key: string]: any;
        };
    }, eventName: string, action?: IAction): Promise<void>;
    private _subscribe;
    private _checkAndFormatParams;
    private _bindNodes;
    private _leaveRoom;
    private _getSessionId;
    private _setSessionMiddleware;
    private _getAllSocketInRooms;
}
export default SocketHandler;
