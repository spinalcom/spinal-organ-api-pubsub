/*
 * Copyright 2022 SpinalCom - www.spinalcom.com
 *
 * This file is part of SpinalCore.
 *
 * Please read all of the following terms and conditions
 * of the Free Software license Agreement ("Agreement")
 * carefully.
 *
 * This Agreement is a legally binding contract between
 * the Licensee (as defined below) and SpinalCom that
 * sets forth the terms and conditions that govern your
 * use of the Program. By installing and/or using the
 * Program, you agree to abide by all the terms and
 * conditions stated or referenced herein.
 *
 * If you do not agree to abide by these terms and
 * conditions, do not demonstrate your acceptance and do
 * not install or use the Program.
 * You should have received a copy of the license along
 * with this file. If not, see
 * <http://resources.spinalcom.com/licenses.pdf>.
 */

import { Server } from 'socket.io';
import { config } from './config';
import { spinalGraphUtils } from './utils';
import { SocketHandler } from './socket/socketHandlers';
import { ISpinalIOMiddleware } from './interfaces';
import { Middleware } from './Middleware';
import { SessionStore } from './store';


export async function runSocketServer(server?: Server, spinalIOMiddleware?: ISpinalIOMiddleware): Promise<Server> {
  let app: any = server || config.server?.port || 8888;
  spinalIOMiddleware = spinalIOMiddleware || new Middleware();

  const io = new Server(app, { pingTimeout: 30000, pingInterval: 25000 });

  const socketHandler = new SocketHandler(io, spinalIOMiddleware);
  await spinalGraphUtils.init(socketHandler);
  await SessionStore.getInstance().init(spinalIOMiddleware.conn);

  console.log('socket server is running');
  return io;
}

///////////////////////////////////////////////////
//              Exports
///////////////////////////////////////////////////
export * from './interfaces';
export { Middleware, spinalGraphUtils };
