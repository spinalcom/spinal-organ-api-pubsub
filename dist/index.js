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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
exports.spinalGraphUtils = exports.Middleware = exports.runSocketServer = void 0;
const socket_io_1 = require("socket.io");
const config_1 = require("./config");
const utils_1 = require("./utils");
Object.defineProperty(exports, "spinalGraphUtils", { enumerable: true, get: function () { return utils_1.spinalGraphUtils; } });
const socketHandlers_1 = require("./socket/socketHandlers");
const Middleware_1 = require("./Middleware");
Object.defineProperty(exports, "Middleware", { enumerable: true, get: function () { return Middleware_1.Middleware; } });
const store_1 = require("./store");
function runSocketServer(server, spinalIOMiddleware) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        let app = server || ((_a = config_1.config.server) === null || _a === void 0 ? void 0 : _a.port) || 8888;
        const io = new socket_io_1.Server(app, { pingTimeout: 30000, pingInterval: 25000 });
        spinalIOMiddleware = spinalIOMiddleware || new Middleware_1.Middleware();
        const socketHandler = new socketHandlers_1.SocketHandler(io, spinalIOMiddleware);
        yield utils_1.spinalGraphUtils.init(socketHandler);
        yield store_1.SessionStore.getInstance().init(spinalIOMiddleware.conn);
        if (spinalIOMiddleware.logService)
            spinalIOMiddleware.logService.createLog('restart', 'restart');
        console.log('socket server is running');
        return io;
    });
}
exports.runSocketServer = runSocketServer;
///////////////////////////////////////////////////
//              Exports
///////////////////////////////////////////////////
__exportStar(require("./interfaces"), exports);
//# sourceMappingURL=index.js.map