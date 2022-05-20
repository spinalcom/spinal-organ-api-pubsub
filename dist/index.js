"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSocketServer = void 0;
const socket_io_1 = require("socket.io");
const config = require("../config");
const utils_1 = require("./utils");
const socketHandlers_1 = require("./classes/socketHandlers");
const spinal_core_connectorjs_1 = require("spinal-core-connectorjs");
const socketMiddlewares_1 = require("./classes/socketMiddlewares");
const SessionStore_1 = require("./classes/SessionStore");
function runSocketServer(server, hubConnection, graph) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const app = server || ((_a = config.server) === null || _a === void 0 ? void 0 : _a.port) || 8888;
        const io = new socket_io_1.Server(app, { pingTimeout: 30000, pingInterval: 25000, maxHttpBufferSize: 1e8 });
        const connect = hubConnection || spinal_core_connectorjs_1.spinalCore.connect(`http://${config.spinalConnector.user}:${config.spinalConnector.password}@${config.spinalConnector.host}:${config.spinalConnector.port}/`);
        utils_1.spinalGraphUtils.setIo(io);
        yield utils_1.spinalGraphUtils.init(connect, graph);
        yield SessionStore_1.default.init(connect);
        (0, socketMiddlewares_1.storeMiddleWare)(io);
        new socketHandlers_1.SocketHandler(io);
        console.log("socket server is running");
        return io;
    });
}
exports.runSocketServer = runSocketServer;
if (config.runLocalServer == "true")
    runSocketServer();
//# sourceMappingURL=index.js.map