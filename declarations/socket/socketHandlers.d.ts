import { Server, Socket } from "socket.io";
import { IAction, ISpinalIOMiddleware } from '../interfaces';
import { SpinalNode } from "spinal-model-graph";
export declare class SocketHandler {
    private io;
    private spinalIOMiddleware;
    constructor(io: Server, spinalIOMiddleware: ISpinalIOMiddleware);
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
}
export default SocketHandler;
