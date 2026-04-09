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

import { Server, ServerOptions } from 'socket.io';
import { config } from './config';
import { spinalGraphUtils } from './utils';
import { SocketHandler } from './socket/socketHandlers';
import { ISpinalIOMiddleware } from './interfaces';
import { Middleware } from './Middleware';
import { SessionStore } from './store';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';

export async function runSocketServer(server?: Server, spinalIOMiddleware?: ISpinalIOMiddleware): Promise<Server> {
  let app: any = server || config.server?.port || 8888;
  spinalIOMiddleware = spinalIOMiddleware || new Middleware();

  const params: Partial<ServerOptions> = {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingTimeout: 30000,
    pingInterval: 25000,
    transports: ['websocket'],
  };

  const redisIsActive = process.env.ENABLE_REDIS_CACHE == "1";

  if (redisIsActive) {
    console.log('Redis cache is enabled, setting up Redis adapter for Socket.IO');

    const pubClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    const subClient = pubClient.duplicate();

    pubClient.on('error', (err) => console.error('Redis Pub Client Error:', err));
    subClient.on("error", (err) => console.error("Redis sub error:", err));

    params.adapter = createAdapter(pubClient, subClient);
  }

  const io = new Server(app, params);

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
