import { Server } from 'socket.io';
export declare function runSocketServer(hubConnection?: spinal.FileSystem, server?: Server): Promise<Server>;
