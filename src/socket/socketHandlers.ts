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

import { Server, Socket } from "socket.io";
import { _formatNode, checkAndFormatIds, getRoomNameFunc, spinalGraphUtils } from "../utils";
import { INodeId, INodeData, IGetNodeRes, IAction, ISpinalIOMiddleware, IRecursionArg } from "../interfaces";
import { OK_STATUS, SUBSCRIBE_EVENT, SUBSCRIBED, SESSION_EVENT, UNSUBSCRIBE_EVENT, UNSUBSCRIBED, EVENT_NAMES } from "../constants";

import { SessionStore } from "../store";
import { v4 as uuidv4 } from "uuid";
import { SpinalNode } from "spinal-model-graph";
import { UpdateDataType } from "../types";

const sessionStore = SessionStore.getInstance();



export class SocketHandler {
	subscriptionMap: Map<string, { [key: string]: INodeId[] }> = new Map();

	constructor(private io: Server, private spinalIOMiddleware: ISpinalIOMiddleware) {
		if (this.spinalIOMiddleware.tokenCheckMiddleware != undefined) this.spinalIOMiddleware.tokenCheckMiddleware(this.io);

		this._setSessionMiddleware();
		this.listenConnectionEvent();
	}

	public saveSubscriptionData(sessionId: string, eventName: string, subscription_data: INodeId) {
		const data = this.subscriptionMap.get(eventName) || {};
		if (!data[sessionId]) data[sessionId] = [];

		data[sessionId].push(subscription_data);

		// remove duplicates
		data[sessionId] = data[sessionId].filter((v, i, a) => a.findIndex((v2) => ["nodeId", "contextId"].every((k) => v2[k] === v[k])) === i);

		this.subscriptionMap.set(eventName, data);
	}

	public getSubscriptionData(eventName: string, sessionId: string): INodeId[] {
		const data = this.subscriptionMap.get(eventName);
		if (!data) return [];
		return data[sessionId] || [];
	}

	public listenConnectionEvent() {
		this.io.on("connection", async (socket: Socket) => {
			const sessionId = this._getSessionId(socket);

			socket.emit(SESSION_EVENT, sessionId);

			console.log(`${sessionId} is connected`);

			this.listenSubscribeEvent(socket);
			this.listenUnsubscribeEvent(socket);
			this.listenDisconnectEvent(socket);
		});
	}

	public listenSubscribeEvent(socket: Socket) {
		socket.on(SUBSCRIBE_EVENT, async (...args) => {
			const sessionId = this._getSessionId(socket);
			console.log("get subscribe request from", sessionId);
			await this._subscribe(socket, args);
		});
	}

	public listenUnsubscribeEvent(socket: Socket) {
		socket.on(UNSUBSCRIBE_EVENT, async (...args) => {
			const sessionId = socket["sessionId"];
			console.log("received unsubscribe request from", sessionId);
			const { obj: nodes, ids: idsFormatted } = await this._checkAndFormatParams(socket, args);
			const result = idsFormatted.map((item) => getRoomNameFunc(item.nodeId, item.contextId, nodes, item.options));
			const idsToRemove = await this._leaveRoom(socket, result, nodes);

			await sessionStore.deleteSubscriptionData(sessionId, idsToRemove);
		});
	}

	public listenDisconnectEvent(socket: Socket) {
		socket.on("disconnect", async (reason) => {
			console.log(`${socket["sessionId"]} is disconnected for reason : ${reason}`);
		});
	}

	public async sendSocketEvent(node: SpinalNode, model: UpdateDataType, eventName: string, action?: IAction, socket?: Socket) {
		const status = OK_STATUS;
		const dataFormatted = await _formatNode(node, model);
		const data = {
			event: action || { name: eventName, type: EVENT_NAMES.updated, nodeId: node.getId().get() },
			node: dataFormatted,
		};

		console.log(`[${dataFormatted.info.name}] changed! send new data to socket`, data);

		const sockets = socket ? [socket] : await this._getAllSocketInRooms(eventName);

		for (const _socket of sockets || []) {
			const sessionId = this._getSessionId(_socket);
			const subscription_data = this.getSubscriptionData(eventName, sessionId);
			_socket.emit(eventName, { data: { ...data, subscription_data }, status });
		}
	}

	//////////////////////////////////////////
	//              PRIVATES                //
	//////////////////////////////////////////

	private async _subscribe(socket: Socket, ids: INodeId[], save: boolean = true) {
		const sessionId = this._getSessionId(socket);

		const { obj: nodes, ids: idsFormatted } = await this._checkAndFormatParams(socket, ids);

		const result = idsFormatted.map((item) => getRoomNameFunc(item.nodeId, item.contextId, nodes, item.options));

		// for (const obj of result) {
		// 	socket.emit(SUBSCRIBED, obj);
		// }

		const idsToSave = await this._launchNodeBinding(socket, result, nodes, sessionId);

		if (save) await sessionStore.saveSubscriptionData(sessionId, idsToSave);
	}

	private _launchNodeBinding(socket: Socket, result: IGetNodeRes[], nodes: { [key: string]: INodeData }, sessionId: string): Promise<INodeId[]> {
		return result.reduce(async (prom, { error, nodeId, status, eventNames, options }) => {
			const arr = await prom;
			if (error && status !== OK_STATUS) return arr;

			const { node, contextNode, subscription_data } = nodes[nodeId];

			const recursionArg: IRecursionArg = { node, context: contextNode, options, eventName: undefined, socket, subscription_data };

			await spinalGraphUtils.bindNodeChildren(recursionArg);
			arr.push({ nodeId: node.getId().get(), contextId: contextNode.getId().get(), options });

			return arr;

		}, Promise.resolve([]));
	}


	public _joinRoom(socket: Socket, subscription_data: INodeId, eventNames: string[]) {
		const sessionId = this._getSessionId(socket);
		return eventNames.map((roomId) => {
			this.saveSubscriptionData(sessionId, roomId, subscription_data);
			socket.join(roomId);
			return roomId;
		});
	}

	private async _leaveRoom(socket: Socket, result: IGetNodeRes[], nodes: { [key: string]: INodeData }): Promise<INodeId[]> {
		return result.reduce(async (prom, { error, nodeId, status, options }) => {

			let arr = await prom;

			if (!error && status === OK_STATUS) {
				const { node, contextNode, subscription_data } = nodes[nodeId];

				const recursionArg: IRecursionArg = { node, context: contextNode, options, eventName: undefined, socket, subscription_data };

				// await spinalGraphUtils.bindNodeChildren(recursionArg, (arg: IRecursionArg) => {
				// 	if (!arg.eventName || !arg.socket) return;
				// 	arg.socket.emit(UNSUBSCRIBED, arg.eventName);
				// 	arg.socket.leave(arg.eventName);
				// });


				// await spinalGraphUtils.bindNodeChildren(recursionArg, (arg: IRecursionArg) => {
				// 	if (!arg.eventName || !arg.socket) return;
				// 	arg.socket.emit(UNSUBSCRIBED, arg.eventName);
				// 	arg.socket.leave(arg.eventName);
				// });

				arr.push({ nodeId: node.getId().get(), contextId: contextNode.getId().get(), options });
			}

			return arr;
		}, Promise.resolve([]));
	}


	private _checkAndFormatParams(socket: Socket, args, oldIds?: INodeId[]): Promise<{ ids: INodeData[]; obj: { [ke: string]: INodeData } }> {
		let options = args[args.length - 1];
		options = typeof options === "object" ? options : {};
		let ids = args.slice(0, args.length - 1).concat(oldIds || []);

		return checkAndFormatIds(socket, this.spinalIOMiddleware, ids, options);
	}

	public _getSessionId(socket: Socket): string {
		if (socket["sessionId"]) return socket["sessionId"];

		const { auth, header, query } = socket.handshake as any;
		return auth?.sessionId || header?.sessionId || query?.sessionId;
	}

	////////////////////////////////////////////////
	//                  Middlewares               //
	////////////////////////////////////////////////

	private _setSessionMiddleware() {
		this.io.use((socket: any, next) => {
			socket.sessionId = socket.handshake.auth.sessionId || socket.handshake.query.sessionId || uuidv4();
			next();
		});
	}

	private _getAllSocketInRooms(roomName): Socket[] {
		const socketIdSet = this.io.sockets.adapter.rooms.get(roomName);
		if (!socketIdSet) return [];

		return Array.from(socketIdSet).map((id) => {
			return this.io.sockets.sockets.get(id);
		});
	}
}

export default SocketHandler;
