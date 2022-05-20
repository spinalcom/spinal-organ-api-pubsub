import { Server, Socket } from "socket.io";
import { INodeId } from '../lib';
export declare class SocketHandler {
    private io;
    constructor(io: Server);
    connection(): void;
    subscribe(socket: Socket, oldIds?: INodeId[]): void;
    unsubscribe(socket: Socket): void;
    disconnect(socket: Socket): void;
    private _checkAndFormatParams;
    private _bindNodes;
    private _leaveRoom;
}
export default SocketHandler;
