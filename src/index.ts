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
import * as config from "../config"
import { spinalGraphUtils } from './utils';
import { SocketHandler } from "./classes/socketHandlers"
import { spinalCore } from 'spinal-core-connectorjs';
import { storeMiddleWare } from './classes/socketMiddlewares';
import sessionStorage from './classes/SessionStore';
import { SpinalGraph } from 'spinal-env-viewer-graph-service';

export async function runSocketServer(server?: Server, hubConnection?: spinal.FileSystem, graph?: SpinalGraph): Promise<Server> {
    const app = server || config.server?.port || 8888;
    const io = new Server(app, { pingTimeout: 30000, pingInterval: 25000, maxHttpBufferSize: 1e8 });
    const connect = hubConnection || spinalCore.connect(`http://${config.spinalConnector.user}:${config.spinalConnector.password}@${config.spinalConnector.host}:${config.spinalConnector.port}/`)

    spinalGraphUtils.setIo(io);
    await spinalGraphUtils.init(connect, graph);
    await sessionStorage.init(connect);

    storeMiddleWare(io);
    new SocketHandler(io);

    console.log("socket server is running");
    return io;
}


if (config.runLocalServer == "true") runSocketServer();