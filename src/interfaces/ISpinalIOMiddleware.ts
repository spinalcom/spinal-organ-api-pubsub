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

import { Socket, Server } from "socket.io";
import { SpinalContext, SpinalGraph, SpinalNode } from "spinal-model-graph";
import { IConfig } from "../interfaces";

export interface ISpinalIOMiddleware {
    config: IConfig;
    conn: spinal.FileSystem;
    getGraph: () => Promise<SpinalGraph>;
    getProfileGraph: (socket?: Socket) => Promise<SpinalGraph>;
    tokenCheckMiddleware?: (io: Server) => void;
    getNode: (nodeId: string | number, contextId?: string | number, socket?: Socket) => Promise<SpinalNode>;
    getNodeWithServerId: (server_id: number, socket?: Socket) => Promise<SpinalNode>;
    getNodeWithStaticId: (nodeId: string, contextId: string | number, socket?: Socket) => Promise<SpinalNode>;
    getContext: (contextId: number | string, socket?: Socket) => Promise<SpinalContext>;
}