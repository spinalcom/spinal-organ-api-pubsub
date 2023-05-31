import { Server } from 'socket.io';
import { spinalGraphUtils } from './utils';
import { ISpinalIOMiddleware } from './interfaces';
import { Middleware } from './Middleware';
export declare function runSocketServer(server?: Server, spinalIOMiddleware?: ISpinalIOMiddleware): Promise<Server>;
export * from './interfaces';
export { Middleware, spinalGraphUtils };
