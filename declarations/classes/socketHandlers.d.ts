import { Server, Socket } from "socket.io";
export declare class SocketHandler {
    private io;
    constructor(io: Server);
    connection(): void;
    listenSubscribeEvent(socket: Socket): void;
    listenUnsubscribeEvent(socket: Socket): void;
    listenDisconnectEvent(socket: Socket): void;
    private _subscribe;
    private _checkAndFormatParams;
    private _bindNodes;
    private _leaveRoom;
    private _getSessionId;
}
export default SocketHandler;
