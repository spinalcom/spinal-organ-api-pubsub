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
exports.SocketHandler = void 0;
const utils_1 = require("../utils");
const lib_1 = require("../lib");
const SessionStore_1 = require("./SessionStore");
class SocketHandler {
    constructor(io) {
        this.io = io;
        this.connection();
    }
    connection() {
        this.io.on("connection", (socket) => {
            const sessionId = socket["sessionID"];
            socket.emit(lib_1.SESSION_EVENT, sessionId);
            console.log(`${sessionId} is connected`);
            const old_subscribed_data = SessionStore_1.default.getSubscribedData(sessionId);
            console.log(old_subscribed_data);
            this.subscribe(socket, old_subscribed_data);
            this.unsubscribe(socket);
            this.disconnect(socket);
        });
    }
    subscribe(socket, oldIds) {
        socket.on(lib_1.SUBSCRIBE_EVENT, (...args) => __awaiter(this, void 0, void 0, function* () {
            const sessionId = socket["sessionID"];
            console.log("received subscribe request from", sessionId);
            const { obj: nodes, ids: idsFormatted } = yield this._checkAndFormatParams(args, oldIds);
            const result = idsFormatted.map((item) => (0, utils_1.getRoomNameFunc)(item.nodeId, item.contextId, nodes, item.options));
            socket.emit(lib_1.SUBSCRIBED, result.length == 1 ? result[0] : result);
            const idsToSave = yield this._bindNodes(socket, result, nodes);
            SessionStore_1.default.saveSubscriptionData(sessionId, idsToSave);
        }));
    }
    unsubscribe(socket) {
        socket.on(lib_1.UNSUBSCRIBE_EVENT, (...args) => __awaiter(this, void 0, void 0, function* () {
            const sessionId = socket["sessionID"];
            console.log("received unsubscribe request from", sessionId);
            const { obj: nodes, ids: idsFormatted } = yield this._checkAndFormatParams(args);
            const result = idsFormatted.map((item) => (0, utils_1.getRoomNameFunc)(item.nodeId, item.contextId, nodes, item.options));
            const idsToRemove = yield this._leaveRoom(socket, result, nodes);
            socket.emit(lib_1.UNSUBSCRIBED, result.length == 1 ? result[0] : result);
            SessionStore_1.default.deleteSubscriptionData(sessionId, idsToRemove);
        }));
    }
    disconnect(socket) {
        socket.on("disconnect", (reason) => {
            console.log(`${socket["sessionID"]} is disconnected for reason : ${reason}`);
        });
    }
    _checkAndFormatParams(args, oldIds) {
        let options = args[args.length - 1];
        options = typeof options === "object" ? options : {};
        let ids = args.slice(0, args.length - 1).concat(oldIds || []);
        return (0, utils_1.checkAndFormatIds)(ids, options);
    }
    _bindNodes(socket, result, nodes) {
        return result.reduce((arr, { error, nodeId, status, eventNames, options }) => {
            if (!error && status === lib_1.OK_STATUS) {
                const { node, contextNode } = nodes[nodeId];
                eventNames.forEach(roomId => socket.join(roomId));
                utils_1.spinalGraphUtils.bindNode(node, contextNode, options);
                arr.push({
                    nodeId: node.getId().get(),
                    contextId: contextNode.getId().get(),
                    options
                });
            }
            return arr;
        }, []);
    }
    _leaveRoom(socket, result, nodes) {
        return result.reduce((arr, { error, nodeId, status, eventNames, options }) => {
            if (!error && status === lib_1.OK_STATUS) {
                const { node, contextNode } = nodes[nodeId];
                eventNames.forEach(roomId => socket.leave(roomId));
                arr.push({
                    nodeId: node.getId().get(),
                    contextId: contextNode.getId().get(),
                    options
                });
            }
            return arr;
        }, []);
    }
}
exports.SocketHandler = SocketHandler;
exports.default = SocketHandler;
//# sourceMappingURL=socketHandlers.js.map