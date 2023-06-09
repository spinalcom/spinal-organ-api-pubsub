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
const spinal_service_pubsub_logs_1 = require("spinal-service-pubsub-logs");
const utils_1 = require("../utils");
const constants_1 = require("../constants");
const store_1 = require("../store");
const uuid_1 = require("uuid");
const sessionStore = store_1.SessionStore.getInstance();
class SocketHandler {
    constructor(io, spinalIOMiddleware) {
        this.io = io;
        this.spinalIOMiddleware = spinalIOMiddleware;
        this.subscriptionMap = new Map();
        if (this.spinalIOMiddleware.tokenCheckMiddleware != undefined)
            this.spinalIOMiddleware.tokenCheckMiddleware(this.io);
        this._setSessionMiddleware();
        this.listenConnectionEvent();
    }
    saveSubscriptionData(sessionId, eventName, subscription_data) {
        const data = this.subscriptionMap.get(eventName) || {};
        if (!data[sessionId])
            data[sessionId] = [];
        data[sessionId].push(subscription_data);
        data[sessionId] = data[sessionId].filter((v, i, a) => a.findIndex((v2) => ['nodeId', 'contextId'].every((k) => v2[k] === v[k])) === i);
        this.subscriptionMap.set(eventName, data);
    }
    getSubscriptionData(eventName, sessionId) {
        const data = this.subscriptionMap.get(eventName);
        if (!data)
            return [];
        return data[sessionId] || [];
    }
    listenConnectionEvent() {
        this.io.on('connection', (socket) => __awaiter(this, void 0, void 0, function* () {
            const sessionId = this._getSessionId(socket);
            socket.emit(constants_1.SESSION_EVENT, sessionId);
            // log
            yield this._createLog(socket, spinal_service_pubsub_logs_1.CONNECTION_EVENT, `connected`);
            console.log(`${sessionId} is connected`);
            const old_subscribed_data = sessionStore.getSubscribedData(sessionId);
            if (old_subscribed_data && old_subscribed_data.length > 0)
                yield this._subscribe(socket, old_subscribed_data, false);
            this.listenSubscribeEvent(socket);
            this.listenUnsubscribeEvent(socket);
            this.listenDisconnectEvent(socket);
        }));
    }
    listenSubscribeEvent(socket) {
        socket.on(constants_1.SUBSCRIBE_EVENT, (...args) => __awaiter(this, void 0, void 0, function* () {
            const sessionId = this._getSessionId(socket);
            console.log('get subscribe request from', sessionId);
            yield this._subscribe(socket, args);
            yield this._createLog(socket, spinal_service_pubsub_logs_1.RECEIVE_EVENT, `${spinal_service_pubsub_logs_1.RECEIVE_EVENT}_${constants_1.SUBSCRIBE_EVENT}_event`);
        }));
    }
    listenUnsubscribeEvent(socket) {
        socket.on(constants_1.UNSUBSCRIBE_EVENT, (...args) => __awaiter(this, void 0, void 0, function* () {
            const sessionId = socket['sessionId'];
            console.log('received unsubscribe request from', sessionId);
            const { obj: nodes, ids: idsFormatted } = yield this._checkAndFormatParams(socket, args);
            const result = idsFormatted.map((item) => (0, utils_1.getRoomNameFunc)(item.nodeId, item.contextId, nodes, item.options));
            const idsToRemove = yield this._leaveRoom(socket, result, nodes);
            // for (const iterator of result) {
            //   socket.emit(UNSUBSCRIBED, iterator);
            // }
            yield sessionStore.deleteSubscriptionData(sessionId, idsToRemove);
            // log
            yield this._createLog(socket, spinal_service_pubsub_logs_1.RECEIVE_EVENT, `${spinal_service_pubsub_logs_1.RECEIVE_EVENT}_${constants_1.UNSUBSCRIBED}_event`);
        }));
    }
    listenDisconnectEvent(socket) {
        socket.on('disconnect', (reason) => __awaiter(this, void 0, void 0, function* () {
            console.log(`${socket['sessionId']} is disconnected for reason : ${reason}`);
            yield this._createLog(socket, spinal_service_pubsub_logs_1.DISCONNECTION_EVENT, 'disconnected');
        }));
    }
    sendSocketEvent(node, model, eventName, action, socket) {
        return __awaiter(this, void 0, void 0, function* () {
            const status = constants_1.OK_STATUS;
            const dataFormatted = yield (0, utils_1._formatNode)(node, model);
            const data = {
                event: action || {
                    name: eventName,
                    type: constants_1.EVENT_NAMES.updated,
                    nodeId: node.getId().get(),
                },
                node: dataFormatted,
            };
            console.log(`(${dataFormatted.info.name} changed) send new data with socket`, data);
            const sockets = socket
                ? [socket]
                : yield this._getAllSocketInRooms(eventName);
            for (const _socket of sockets || []) {
                const sessionId = this._getSessionId(_socket);
                const subscription_data = this.getSubscriptionData(eventName, sessionId);
                _socket.emit(eventName, { data: Object.assign(Object.assign({}, data), { subscription_data }), status });
                const event = 'updated';
                // log
                yield this._createLog(_socket, spinal_service_pubsub_logs_1.SEND_EVENT, `${spinal_service_pubsub_logs_1.SEND_EVENT}_${event}_event`, data.node);
            }
        });
    }
    //////////////////////////////////////////
    //              PRIVATES                //
    //////////////////////////////////////////
    _subscribe(socket, ids, save = true) {
        return __awaiter(this, void 0, void 0, function* () {
            const sessionId = this._getSessionId(socket);
            const { obj: nodes, ids: idsFormatted } = yield this._checkAndFormatParams(socket, ids);
            const result = idsFormatted.map((item) => (0, utils_1.getRoomNameFunc)(item.nodeId, item.contextId, nodes, item.options));
            for (const obj of result) {
                socket.emit(constants_1.SUBSCRIBED, obj);
            }
            // socket.emit(SUBSCRIBED, result.length == 1 ? result[0] : result);
            const idsToSave = yield this._bindNodes(socket, result, nodes, sessionId);
            if (save)
                sessionStore.saveSubscriptionData(sessionId, idsToSave);
        });
    }
    _checkAndFormatParams(socket, args, oldIds) {
        let options = args[args.length - 1];
        options = typeof options === 'object' ? options : {};
        let ids = args.slice(0, args.length - 1).concat(oldIds || []);
        return (0, utils_1.checkAndFormatIds)(socket, this.spinalIOMiddleware, ids, options);
    }
    _bindNodes(socket, result, nodes, sessionId) {
        return result.reduce((prom, { error, nodeId, status, eventNames, options }) => __awaiter(this, void 0, void 0, function* () {
            const arr = yield prom;
            if (!error && status === constants_1.OK_STATUS) {
                const { node, contextNode, subscription_data } = nodes[nodeId];
                eventNames.forEach((roomId) => {
                    this.saveSubscriptionData(sessionId, roomId, subscription_data);
                    socket.join(roomId);
                });
                const recursionArg = {
                    node,
                    context: contextNode,
                    options,
                    eventName: undefined,
                    socket,
                    subscription_data,
                };
                yield utils_1.spinalGraphUtils.recursionFunction(recursionArg, utils_1.spinalGraphUtils.bindNode.bind(utils_1.spinalGraphUtils));
                arr.push({
                    nodeId: node.getId().get(),
                    contextId: contextNode.getId().get(),
                    options,
                });
            }
            return arr;
        }), Promise.resolve([]));
    }
    _leaveRoom(socket, result, nodes) {
        return __awaiter(this, void 0, void 0, function* () {
            return result.reduce((prom, { error, nodeId, status, eventNames, options }) => __awaiter(this, void 0, void 0, function* () {
                let arr = yield prom;
                if (!error && status === constants_1.OK_STATUS) {
                    const { node, contextNode, subscription_data } = nodes[nodeId];
                    // eventNames.forEach((roomId) => {
                    //   socket.leave(roomId);
                    //   socket.emit(UNSUBSCRIBED, roomId);
                    // });
                    const recursionArg = {
                        node,
                        context: contextNode,
                        options,
                        eventName: undefined,
                        socket,
                        subscription_data,
                    };
                    yield utils_1.spinalGraphUtils.recursionFunction(recursionArg, (arg) => {
                        if (!arg.eventName || !arg.socket)
                            return;
                        arg.socket.emit(constants_1.UNSUBSCRIBED, arg.eventName);
                        arg.socket.leave(arg.eventName);
                    });
                    arr.push({
                        nodeId: node.getId().get(),
                        contextId: contextNode.getId().get(),
                        options,
                    });
                }
                return arr;
            }), Promise.resolve([]));
        });
    }
    _getSessionId(socket) {
        if (socket['sessionId'])
            return socket['sessionId'];
        const { auth, header, query } = socket.handshake;
        return (auth === null || auth === void 0 ? void 0 : auth.sessionId) || (header === null || header === void 0 ? void 0 : header.sessionId) || (query === null || query === void 0 ? void 0 : query.sessionId);
    }
    ////////////////////////////////////////////////
    //                  Middlewares               //
    ////////////////////////////////////////////////
    _setSessionMiddleware() {
        this.io.use((socket, next) => {
            const sessionID = socket.handshake.auth.sessionId || socket.handshake.query.sessionId;
            if (!sessionID) {
                socket.sessionId = (0, uuid_1.v4)();
            }
            else {
                socket.sessionId = sessionID;
            }
            next();
        });
    }
    _getAllSocketInRooms(roomName) {
        const socketIdSet = this.io.sockets.adapter.rooms.get(roomName);
        if (!socketIdSet)
            return [];
        return Array.from(socketIdSet).map((id) => {
            return this.io.sockets.sockets.get(id);
        });
    }
    _createLog(socket, type, action, nodeInfo) {
        if (!this.spinalIOMiddleware.logService)
            return;
        let targetInfo = socket.userInfo;
        return this.spinalIOMiddleware.logService.createLog(type, action, targetInfo, nodeInfo);
    }
}
exports.SocketHandler = SocketHandler;
exports.default = SocketHandler;
//# sourceMappingURL=socketHandlers.js.map