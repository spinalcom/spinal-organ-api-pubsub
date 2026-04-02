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
        // remove duplicates
        data[sessionId] = Array.from(new Set(data[sessionId].map((v) => JSON.stringify(v)))).map((v) => JSON.parse(v));
        this.subscriptionMap.set(eventName, data);
    }
    getSubscriptionData(eventName, sessionId) {
        const data = this.subscriptionMap.get(eventName);
        if (!data)
            return [];
        return data[sessionId] || [];
    }
    listenConnectionEvent() {
        this.io.on("connection", (socket) => __awaiter(this, void 0, void 0, function* () {
            const sessionId = this._getSessionId(socket);
            socket.emit(constants_1.SESSION_EVENT, sessionId);
            console.log(`${sessionId} is connected`);
            this.listenSubscribeEvent(socket);
            this.listenUnsubscribeEvent(socket);
            this.listenDisconnectEvent(socket);
        }));
    }
    listenSubscribeEvent(socket) {
        socket.on(constants_1.SUBSCRIBE_EVENT, (...args) => __awaiter(this, void 0, void 0, function* () {
            const sessionId = this._getSessionId(socket);
            console.log("get subscribe request from", sessionId);
            yield this._subscribe(socket, args);
        }));
    }
    listenUnsubscribeEvent(socket) {
        socket.on(constants_1.UNSUBSCRIBE_EVENT, (...args) => __awaiter(this, void 0, void 0, function* () {
            const sessionId = this._getSessionId(socket);
            console.log("received unsubscribe request from", sessionId);
            const nodes = yield this._checkAndFormatParams(socket, args);
            const result = nodes.map((item) => (0, utils_1.checkAndFormatNodeData)(item));
            const idsToRemove = yield this._leaveRoom(socket, result);
            yield sessionStore.deleteSubscriptionData(sessionId, idsToRemove);
        }));
    }
    listenDisconnectEvent(socket) {
        socket.on("disconnect", (reason) => __awaiter(this, void 0, void 0, function* () {
            const sessionId = this._getSessionId(socket);
            console.log(`${sessionId} is disconnected for reason : ${reason}`);
        }));
    }
    sendSocketEvent(node, model, eventName, action, socket) {
        return __awaiter(this, void 0, void 0, function* () {
            const status = constants_1.OK_STATUS;
            const dataFormatted = yield (0, utils_1._formatNode)(node, model);
            const data = {
                event: action || { name: eventName, type: constants_1.EVENT_NAMES.updated, nodeId: node.getId().get() },
                node: dataFormatted,
            };
            console.log(`[${dataFormatted.info.name}] changed! send new data to socket`, data);
            const sockets = socket ? [socket] : yield this._getAllSocketInRooms(eventName);
            for (const _socket of sockets || []) {
                const sessionId = this._getSessionId(_socket);
                const subscription_data = this.getSubscriptionData(eventName, sessionId);
                _socket.emit(eventName, { data: Object.assign(Object.assign({}, data), { subscription_data }), status });
            }
        });
    }
    //////////////////////////////////////////
    //              PRIVATES                //
    //////////////////////////////////////////
    _subscribe(socket, ids, save = true) {
        return __awaiter(this, void 0, void 0, function* () {
            const sessionId = this._getSessionId(socket);
            const nodesData = yield this._checkAndFormatParams(socket, ids);
            const result = nodesData.map((nodeData) => (0, utils_1.checkAndFormatNodeData)(nodeData));
            // for (const obj of result) {
            // 	socket.emit(SUBSCRIBED, obj);
            // }
            const idsToSave = yield this._launchNodeBinding(socket, result, sessionId);
            // if (save) await sessionStore.saveSubscriptionData(sessionId, idsToSave);
        });
    }
    _launchNodeBinding(socket, result, sessionId) {
        const promises = [];
        for (const item of result) {
            const { error, nodeId, status, options } = item;
            if (error || status === constants_1.NOK_STATUS) {
                // if there's an error, we emit it to the socket and skip the binding for this node
                socket.emit(constants_1.SUBSCRIBED, { error, nodeId, status });
                continue;
            }
            // const { node, contextNode, subscription_data } = nodes[nodeId];
            const recursionArg = { node: item.node, context: item.contextNode, options, eventName: undefined, socket, subscription_data: item.subscription_data };
            promises.push(this._bindNodeChildren(recursionArg));
        }
        return Promise.allSettled(promises).then((result) => {
            const arr = [];
            for (const element of result) {
                if (element.status === "fulfilled") {
                    const value = element.value;
                    arr.push(value);
                }
            }
            return arr;
        });
        // return result.reduce(async (prom, { error, nodeId, status, eventNames, options }) => {
        // 	const arr = await prom;
        // 	if (error && status !== OK_STATUS) return arr;
        // 	const { node, contextNode, subscription_data } = nodes[nodeId];
        // 	const recursionArg: IRecursionArg = { node, context: contextNode, options, eventName: undefined, socket, subscription_data };
        // 	await spinalGraphUtils.bindNodeChildren(recursionArg);
        // 	arr.push({ nodeId: node.getId().get(), contextId: contextNode?.getId().get(), options });
        // 	return arr;
        // }, Promise.resolve([]));
    }
    _bindNodeChildren(arg) {
        return __awaiter(this, void 0, void 0, function* () {
            return utils_1.spinalGraphUtils.bindNodeChildren(arg)
                .then((result) => {
                var _a, _b;
                if (!arg.node)
                    throw new Error("Node not found");
                return { nodeId: (_a = arg.node) === null || _a === void 0 ? void 0 : _a.getId().get(), contextId: (_b = arg.context) === null || _b === void 0 ? void 0 : _b.getId().get(), options: arg.options };
            });
        });
    }
    _joinRoom(socket, subscription_data, eventNames) {
        const sessionId = this._getSessionId(socket);
        return eventNames.map((roomId) => {
            // this.saveSubscriptionData(sessionId, roomId, subscription_data);
            socket.join(roomId);
            return roomId;
        });
    }
    _leaveRoom(socket, result) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const resultFiltered = [];
            for (const item of result) {
                const { error, nodeId, status, options } = item;
                if (error && status !== constants_1.OK_STATUS)
                    continue;
                // const { node, contextNode } = nodes[nodeId];
                if (!item.node)
                    continue;
                //TODO : socket.leave for all rooms related to the node
                // I don't call socket.leave because not integredated yet
                resultFiltered.push({ nodeId: (_a = item.node) === null || _a === void 0 ? void 0 : _a.getId().get(), contextId: (_b = item.contextNode) === null || _b === void 0 ? void 0 : _b.getId().get(), options });
            }
            return resultFiltered;
        });
    }
    _checkAndFormatParams(socket, args, oldIds) {
        let options = args[args.length - 1];
        options = typeof options === "object" ? options : {};
        let ids = args.slice(0, args.length - 1).concat(oldIds || []);
        return (0, utils_1.checkAndFormatIds)(socket, this.spinalIOMiddleware, ids, options);
    }
    _getSessionId(socket) {
        if (socket.sessionId)
            return socket.sessionId;
        const { auth, header, query } = socket.handshake;
        return (auth === null || auth === void 0 ? void 0 : auth.sessionId) || (header === null || header === void 0 ? void 0 : header.sessionId) || (query === null || query === void 0 ? void 0 : query.sessionId);
    }
    ////////////////////////////////////////////////
    //                  Middlewares               //
    ////////////////////////////////////////////////
    _setSessionMiddleware() {
        this.io.use((socket, next) => {
            socket.sessionId = socket.handshake.auth.sessionId || socket.handshake.query.sessionId || (0, uuid_1.v4)();
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
}
exports.SocketHandler = SocketHandler;
exports.default = SocketHandler;
//# sourceMappingURL=socketHandlers.js.map