import { Server } from 'socket.io';
import { spinalGraphUtils } from './utils';
import { SpinalGraph } from 'spinal-env-viewer-graph-service';
export declare function runSocketServer(server?: Server, hubConnection?: spinal.FileSystem, graph?: SpinalGraph): Promise<Server>;
export { spinalGraphUtils };
